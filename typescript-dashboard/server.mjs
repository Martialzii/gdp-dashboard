import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const files = new Map([
  ["/", [path.join(root, "index.html"), "text/html; charset=utf-8"]],
  ["/dashboard.js", [path.join(root, "dist", "dashboard.js"), "text/javascript; charset=utf-8"]],
  ["/data/gdp_data.csv", [path.join(root, "..", "data", "gdp_data.csv"), "text/csv; charset=utf-8"]],
]);
const port = Number.parseInt(process.env.PORT ?? "3000", 10);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535");
}

createServer(async (request, response) => {
  const file = files.get(new URL(request.url ?? "/", "http://localhost").pathname);
  if (!file) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  try {
    const body = await readFile(file[0]);
    response.writeHead(200, {
      "content-type": file[1],
      "content-length": body.byteLength,
      "x-content-type-options": "nosniff",
    });
    response.end(body);
  } catch (error) {
    const missingBuild = file[0] === path.join(root, "dist", "dashboard.js");
    response.writeHead(missingBuild ? 503 : 500, { "content-type": "text/plain; charset=utf-8" });
    response.end(missingBuild ? "Build the dashboard first with: npm run build" : "Unable to load dashboard resources");
    if (!missingBuild) console.error(error);
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`GDP dashboard listening at http://localhost:${port}`);
});
