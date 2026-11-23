import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));

async function unusedPort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Unable to allocate a test port");
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

test("serves cached dashboard assets and streams the dataset", async (t) => {
  const port = await unusedPort();
  const server = spawn(process.execPath, ["server.mjs"], {
    cwd: root,
    env: { ...process.env, PORT: String(port) },
    stdio: "ignore",
  });
  t.after(async () => {
    if (server.exitCode === null) {
      const exited = once(server, "exit");
      server.kill();
      await exited;
    }
  });

  const base = `http://127.0.0.1:${port}`;
  let page;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`Dashboard exited with status ${server.exitCode}`);
    try {
      page = await fetch(base);
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  assert.ok(page, "dashboard server did not start");
  assert.equal(page.status, 200);
  const pageTag = page.headers.get("etag");
  assert.ok(pageTag);
  assert.equal((await fetch(base, { headers: { "if-none-match": pageTag } })).status, 304);
  assert.equal((await fetch(`${base}/`, { method: "HEAD" })).status, 200);
  assert.equal((await fetch(base, { method: "POST" })).status, 405);
  assert.equal((await fetch(`${base}/not-found`)).status, 404);

  const script = await fetch(`${base}/dashboard.js`);
  assert.equal(script.status, 200);
  assert.match(await script.text(), /renderRankings/);

  const dataset = await fetch(`${base}/data/gdp_data.csv`);
  assert.equal(dataset.status, 200);
  assert.match(dataset.headers.get("content-type"), /text\/csv/);
  assert.match((await dataset.text()).slice(0, 80), /Country Name.*Country Code/);
  assert.equal(
    (await fetch(`${base}/data/gdp_data.csv`, {
      headers: { "if-none-match": dataset.headers.get("etag") },
    })).status,
    304,
  );
});
