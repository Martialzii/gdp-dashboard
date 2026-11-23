import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dataDirectory = process.env.DASHBOARD_DATA_DIR
  ? path.resolve(process.env.DASHBOARD_DATA_DIR)
  : path.join(root, "data");
const apiBase = (process.env.WORLD_BANK_API_BASE ?? "https://api.worldbank.org/v2").replace(/\/+$/, "");
const mapUrl = process.env.NATURAL_EARTH_GEOJSON_URL ??
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson";
const indicators = [
  { key: "gdpPerCapita", code: "NY.GDP.PCAP.CD", name: "GDP per capita", unit: "current US$" },
  { key: "realGDP", code: "NY.GDP.MKTP.KD", name: "GDP", unit: "constant 2015 US$" },
];

function requiredYear(value, name) {
  const year = Number(value);
  if (!Number.isInteger(year) || year < 1900 || year > 2200) {
    throw new Error(`${name} must be a four-digit year`);
  }
  return year;
}

async function fetchJSON(url) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { accept: "application/json", "user-agent": "gdp-dashboard-data-refresh/1.0" },
        signal: AbortSignal.timeout(120_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function fetchWorldBankPages(url, label) {
  const results = [];
  let page = 1;
  let pages = 1;
  do {
    const separator = url.includes("?") ? "&" : "?";
    const response = await fetchJSON(`${url}${separator}page=${page}`);
    const metadata = response[0];
    if (!Array.isArray(response) || !metadata || !Array.isArray(response[1])) {
      throw new Error(`World Bank returned an invalid ${label} response`);
    }
    results.push(...response[1]);
    pages = Number(metadata.pages);
    if (!Number.isInteger(pages) || pages < 1) {
      throw new Error(`World Bank returned invalid pagination for ${label}`);
    }
    page += 1;
  } while (page <= pages);
  return results;
}

async function writeSnapshot(filePath, data) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp`;
  await writeFile(temporaryPath, data);
  await rename(temporaryPath, filePath);
}

const header = (await readFile(path.join(dataDirectory, "gdp_data.csv"), "utf8"))
  .split(/\r?\n/, 1)[0]
  .split(",")
  .map((column) => column.replace(/^"|"$/g, ""));
const sourceYears = header.map(Number).filter((year) => Number.isInteger(year) && year >= 1900);
if (sourceYears.length === 0) throw new Error("Cannot determine the year range from data/gdp_data.csv");

const startYear = requiredYear(process.env.WB_START_YEAR ?? String(Math.min(...sourceYears)), "WB_START_YEAR");
const endYear = requiredYear(process.env.WB_END_YEAR ?? String(Math.max(...sourceYears)), "WB_END_YEAR");
if (startYear > endYear) throw new Error("WB_START_YEAR must not be later than WB_END_YEAR");

console.log(`Fetching World Bank indicators for ${startYear}–${endYear}…`);
const countryMetadata = await fetchWorldBankPages(`${apiBase}/country?format=json&per_page=400`, "country metadata");
const countries = countryMetadata
  .filter((country) => country.id && country.region?.id && country.region.id !== "NA" && country.region.value !== "Aggregates")
  .map((country) => ({
    code: country.id,
    name: country.name,
    region: country.region.value,
    incomeLevel: country.incomeLevel?.value ?? "",
    values: Object.fromEntries(indicators.map(({ key }) => [key, {}])),
  }));
if (countries.length === 0) throw new Error("World Bank returned no country metadata");
const countriesByCode = new Map(countries.map((country) => [country.code, country]));

for (const indicator of indicators) {
  const records = await fetchWorldBankPages(
    `${apiBase}/country/all/indicator/${indicator.code}?format=json&per_page=20000&date=${startYear}:${endYear}`,
    indicator.name,
  );
  let observations = 0;
  for (const record of records) {
    const country = countriesByCode.get(record.countryiso3code);
    const year = Number(record.date);
    const value = record.value;
    if (!country || !Number.isInteger(year) || year < startYear || year > endYear ||
        typeof value !== "number" || !Number.isFinite(value)) continue;
    country.values[indicator.key][year] = value;
    observations += 1;
  }
  if (observations === 0) throw new Error(`World Bank returned no usable ${indicator.code} observations`);
  console.log(`${indicator.code}: ${observations.toLocaleString()} non-missing observations`);
}

const snapshot = {
  source: "World Bank Indicators API v2",
  apiBase,
  updatedAt: new Date().toISOString(),
  startYear,
  endYear,
  indicators: Object.fromEntries(indicators.map(({ key, code, name, unit }) => [key, { code, name, unit }])),
  countries: countries.map(({ values, ...country }) => ({
    ...country,
    gdpPerCapita: values.gdpPerCapita,
    realGDP: values.realGDP,
  })),
};
const snapshotPath = path.join(dataDirectory, "world_bank_indicators.json");

console.log("Fetching Natural Earth 1:110m country boundaries…");
const mapResponse = await fetch(mapUrl, {
  headers: { accept: "application/geo+json, application/json", "user-agent": "gdp-dashboard-data-refresh/1.0" },
  signal: AbortSignal.timeout(120_000),
});
if (!mapResponse.ok) throw new Error(`Unable to download map boundaries (HTTP ${mapResponse.status})`);
const map = await mapResponse.json();
if (map.type !== "FeatureCollection" || !Array.isArray(map.features) || map.features.length < 100) {
  throw new Error("Natural Earth returned an invalid or incomplete country-boundary dataset");
}
const mapPath = path.join(dataDirectory, "world_countries.geojson");
await writeSnapshot(snapshotPath, `${JSON.stringify(snapshot)}\n`);
await writeSnapshot(mapPath, `${JSON.stringify(map)}\n`);
console.log(`Updated ${snapshotPath} and ${mapPath}`);
