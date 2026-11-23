import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const csvPath = path.join(root, "..", "data", "gdp_data.csv");
const port = Number.parseInt(process.env.PORT ?? "3000", 10);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535");
}

async function loadAsset(filePath, contentType) {
  const body = await readFile(filePath);
  return {
    body,
    contentType,
    etag: `"${createHash("sha256").update(body).digest("hex")}"`,
  };
}

const assets = new Map([
  ["/", await loadAsset(path.join(root, "index.html"), "text/html; charset=utf-8")],
  ["/dashboard.js", await loadAsset(path.join(root, "dist", "dashboard.js"), "text/javascript; charset=utf-8")],
]);
for (const [url, filename, contentType] of [
  ["/data/world_bank_indicators.json", "world_bank_indicators.json", "application/json; charset=utf-8"],
  ["/data/world_countries.geojson", "world_countries.geojson", "application/geo+json; charset=utf-8"],
]) {
  try {
    assets.set(url, await loadAsset(path.join(root, "..", "data", filename), contentType));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}
const csvInfo = await stat(csvPath);
const csvEtag = `W/"${csvInfo.size.toString(16)}-${Math.trunc(csvInfo.mtimeMs).toString(16)}"`;

function isNotModified(request, etag, lastModified) {
  const supplied = request.headers["if-none-match"];
  if (supplied !== undefined) {
    return supplied.split(",").some((value) => value.trim() === "*" || value.trim() === etag);
  }
  const modifiedSince = request.headers["if-modified-since"];
  return lastModified > 0 && modifiedSince !== undefined &&
    Date.parse(modifiedSince) >= Math.floor(lastModified / 1000) * 1000;
}

function sendCachedAsset(request, response, asset) {
  response.setHeader("content-type", asset.contentType);
  response.setHeader("content-length", asset.body.byteLength);
  response.setHeader("cache-control", "no-cache");
  response.setHeader("etag", asset.etag);
  response.setHeader("x-content-type-options", "nosniff");
  if (isNotModified(request, asset.etag, 0)) {
    response.writeHead(304);
    response.end();
    return;
  }
  response.writeHead(200);
  response.end(request.method === "HEAD" ? undefined : asset.body);
}

const server = createServer((request, response) => {
  let pathname;
  try {
    pathname = new URL(request.url ?? "/", "http://localhost").pathname;
  } catch {
    response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
    response.end("Invalid request URL");
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { allow: "GET, HEAD", "content-type": "text/plain; charset=utf-8" });
    response.end("Method not allowed");
    return;
  }

  const asset = assets.get(pathname);
  if (asset) {
    sendCachedAsset(request, response, asset);
    return;
  }
  if (pathname !== "/data/gdp_data.csv") {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const lastModified = csvInfo.mtime;
  response.setHeader("content-type", "text/csv; charset=utf-8");
  response.setHeader("content-length", csvInfo.size);
  response.setHeader("cache-control", "public, max-age=300");
  response.setHeader("etag", csvEtag);
  response.setHeader("last-modified", lastModified.toUTCString());
  response.setHeader("x-content-type-options", "nosniff");
  if (isNotModified(request, csvEtag, csvInfo.mtimeMs)) {
    response.writeHead(304);
    response.end();
    return;
  }
  if (request.method === "HEAD") {
    response.writeHead(200);
    response.end();
    return;
  }

  const stream = createReadStream(csvPath);
  stream.on("error", (error) => {
    console.error("Unable to stream the GDP dataset:", error);
    if (response.headersSent) response.destroy(error);
    else {
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end("Unable to load dashboard resources");
    }
  });
  stream.pipe(response);
});

server.on("error", (error) => {
  console.error("Unable to start the GDP dashboard:", error);
  process.exitCode = 1;
});
server.listen(port, "127.0.0.1", () => {
  console.log(`GDP dashboard listening at http://localhost:${port}`);
});
