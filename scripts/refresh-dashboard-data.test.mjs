import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const refreshScript = path.join(root, "scripts", "refresh-dashboard-data.mjs");

function runRefresh(env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [refreshScript], { cwd: root, env });
    let output = "";
    child.stdout.setEncoding("utf8").on("data", (chunk) => { output += chunk; });
    child.stderr.setEncoding("utf8").on("data", (chunk) => { output += chunk; });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, output }));
  });
}

test("refreshes both shared datasets and preserves the snapshot when map download fails", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "gdp-data-refresh-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(path.join(directory, "gdp_data.csv"),
    "Country Name,Country Code,Indicator Name,2000,2001\nExample,EXM,GDP,10,20\n");
  let failMap = false;
  const server = createServer((request, response) => {
    const url = new URL(request.url, "http://localhost");
    if (url.pathname === "/map") {
      if (failMap) {
        response.writeHead(502).end("map unavailable");
        return;
      }
      const features = Array.from({ length: 100 }, (_, index) => ({
        type: "Feature",
        properties: { ISO_A3_EH: `C${String(index).padStart(2, "0")}`, ADMIN: `Country ${index}` },
        geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
      }));
      response.writeHead(200, { "content-type": "application/geo+json" });
      response.end(JSON.stringify({ type: "FeatureCollection", features }));
      return;
    }
    if (url.pathname.endsWith("/country")) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify([
        { pages: 1 },
        [{ id: "EXM", name: "Example", region: { id: "EAS", value: "East Asia" }, incomeLevel: { value: "High income" } }],
      ]));
      return;
    }
    if (url.pathname.includes("/indicator/")) {
      const indicator = url.pathname.split("/").pop();
      const key = indicator === "NY.GDP.PCAP.CD" ? "per capita" : "real GDP";
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify([
        { pages: 1 },
        [{ country: { id: "EXM" }, countryiso3code: "EXM", date: "2000", value: key === "per capita" ? 5 : 10 }],
      ]));
      return;
    }
    response.writeHead(404).end();
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve, reject) =>
    server.close((error) => error ? reject(error) : resolve()),
  ));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const env = {
    ...process.env,
    DASHBOARD_DATA_DIR: directory,
    WORLD_BANK_API_BASE: `http://127.0.0.1:${address.port}/v2`,
    NATURAL_EARTH_GEOJSON_URL: `http://127.0.0.1:${address.port}/map`,
    WB_START_YEAR: "2000",
    WB_END_YEAR: "2001",
  };
  const first = await runRefresh(env);
  assert.equal(first.code, 0, first.output);
  const snapshotPath = path.join(directory, "world_bank_indicators.json");
  const mapPath = path.join(directory, "world_countries.geojson");
  const before = await readFile(snapshotPath, "utf8");
  const snapshot = JSON.parse(before);
  assert.equal(snapshot.countries[0].gdpPerCapita["2000"], 5);
  assert.equal(snapshot.countries[0].realGDP["2000"], 10);
  assert.equal(JSON.parse(await readFile(mapPath, "utf8")).features.length, 100);

  failMap = true;
  const second = await runRefresh(env);
  assert.notEqual(second.code, 0);
  assert.match(second.output, /HTTP 502/);
  assert.equal(await readFile(snapshotPath, "utf8"), before);
});
