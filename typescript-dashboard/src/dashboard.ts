interface Country {
  code: string;
  name: string;
  gdpByYear: Float64Array;
  gdpPerCapitaByYear: Float64Array;
  realGDPByYear: Float64Array;
  region: string;
  incomeLevel: string;
}

interface DataPoint {
  year: number;
  value: number;
}

type Indicator = "gdp" | "gdpPerCapita" | "realGDP";

interface IndicatorSnapshot {
  countries: Array<{
    code: string;
    region: string;
    incomeLevel: string;
    gdpPerCapita: Record<string, number>;
    realGDP: Record<string, number>;
  }>;
}

interface MapFeature {
  type: string;
  properties: Record<string, string>;
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][][] | number[][][];
  } | null;
}

interface MapData {
  type: "FeatureCollection";
  features: MapFeature[];
}

const defaultCountries = ["DEU", "FRA", "GBR", "BRA", "MEX", "JPN"];
const colors = ["#3764d8", "#e05c42", "#14946b", "#9a56c4", "#da9b22", "#168eaa", "#d34d88", "#697b30"];
const svgNamespace = "http://www.w3.org/2000/svg";
const maximumChartPoints = 800;
let yearIndexes = new Map<number, number>();

async function* readCsvRows(response: Response): AsyncGenerator<string[], void, unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Streaming dataset responses are not supported by this browser");
  const decoder = new TextDecoder();
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let pendingQuote = false;
  let previousWasCarriageReturn = false;
  let firstCharacter = true;

  try {
    while (true) {
      const { value, done } = await reader.read();
      const chunk = decoder.decode(value, { stream: !done });
      for (const character of chunk) {
        if (firstCharacter) {
          firstCharacter = false;
          if (character === "\uFEFF") continue;
        }
        if (quoted && pendingQuote) {
          pendingQuote = false;
          if (character === '"') {
            field += '"';
            continue;
          }
          quoted = false;
        } else if (quoted) {
          if (character === '"') pendingQuote = true;
          else field += character;
          continue;
        }

        if (previousWasCarriageReturn && character === "\n") {
          previousWasCarriageReturn = false;
          continue;
        }
        previousWasCarriageReturn = false;
        if (character === '"') {
          quoted = true;
        } else if (character === ",") {
          row.push(field);
          field = "";
        } else if (character === "\n" || character === "\r") {
          row.push(field);
          yield row;
          row = [];
          field = "";
          previousWasCarriageReturn = character === "\r";
        } else {
          field += character;
        }
      }
      if (done) break;
    }
    if (quoted && !pendingQuote) throw new Error("The GDP CSV contains an unterminated quoted field");
    if (field.length > 0 || row.length > 0) {
      row.push(field);
      yield row;
    }
  } finally {
    reader.releaseLock();
  }
}

async function parseDataset(response: Response): Promise<{ countries: Country[]; years: number[] }> {
  const rows = readCsvRows(response);
  const headerResult = await rows.next();
  if (headerResult.done) throw new Error("The GDP CSV is empty");
  const header = headerResult.value.map((value) => value.trim());
  const nameIndex = header.indexOf("Country Name");
  const codeIndex = header.indexOf("Country Code");
  const yearColumns = header
    .map((column, index) => ({ year: Number(column), index }))
    .filter(({ year }) => Number.isInteger(year) && year >= 1900)
    .sort((left, right) => left.year - right.year);
  if (nameIndex < 0 || codeIndex < 0 || yearColumns.length === 0) {
    await rows.return(undefined);
    throw new Error("The GDP CSV does not have the expected World Bank columns");
  }

  const years = yearColumns.map(({ year }) => year);
  yearIndexes = new Map(years.map((year, index) => [year, index]));
  const countries: Country[] = [];
  for await (const values of rows) {
    const code = values[codeIndex]?.trim();
    if (!code) continue;
    const gdpByYear = new Float64Array(years.length);
    gdpByYear.fill(Number.NaN);
    for (let index = 0; index < yearColumns.length; index += 1) {
      const value = values[yearColumns[index].index]?.trim();
      if (!value) continue;
      const gdp = Number(value);
      if (Number.isFinite(gdp)) gdpByYear[index] = gdp;
    }
    countries.push({
      code,
      name: values[nameIndex] ?? code,
      gdpByYear,
      gdpPerCapitaByYear: new Float64Array(years.length),
      realGDPByYear: new Float64Array(years.length),
      region: "",
      incomeLevel: "",
    });
  }
  countries.sort((left, right) => left.code.localeCompare(right.code));
  return { countries, years };
}

function gdpFor(country: Country, year: number): number | undefined {
  return valueFor(country, year, "gdp");
}

function valueFor(country: Country, year: number, indicator: Indicator): number | undefined {
  const index = yearIndexes.get(year);
  if (index === undefined) return undefined;
  const values = indicator === "gdp"
    ? country.gdpByYear
    : indicator === "gdpPerCapita"
      ? country.gdpPerCapitaByYear
      : country.realGDPByYear;
  const value = values[index];
  return Number.isFinite(value) ? value : undefined;
}

function indicatorName(indicator: Indicator): string {
  return indicator === "gdpPerCapita" ? "GDP per capita" : indicator === "realGDP" ? "Real GDP" : "GDP";
}

function formatIndicator(value: number | undefined, indicator: Indicator): string {
  if (value === undefined) return "N/A";
  if (indicator === "gdpPerCapita") {
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }
  return `$${(value / 1e9).toLocaleString(undefined, { maximumFractionDigits: 0 })}B`;
}

function element<T extends HTMLElement>(id: string): T {
  const value = document.getElementById(id);
  if (!value) throw new Error(`Missing dashboard element: ${id}`);
  return value as T;
}

function makeSvg<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
  return document.createElementNS(svgNamespace, tag);
}

function pointsFor(country: Country, fromYear: number, toYear: number, indicator: Indicator): DataPoint[] {
  const yearSpan = toYear - fromYear + 1;
  const bucketCount = Math.floor((maximumChartPoints - 2) / 2);
  const buckets: Array<{ min?: DataPoint; max?: DataPoint }> =
    yearSpan > maximumChartPoints ? Array.from({ length: bucketCount }, () => ({})) : [];
  const points: DataPoint[] = [];
  let first: DataPoint | undefined;
  let last: DataPoint | undefined;

  for (let year = fromYear; year <= toYear; year += 1) {
    const value = valueFor(country, year, indicator);
    if (value === undefined) continue;
    const point = { year, value };
    if (!first) first = point;
    last = point;

    if (buckets.length === 0) {
      points.push(point);
      continue;
    }

    const bucketIndex = Math.min(bucketCount - 1, Math.floor(((year - fromYear) * bucketCount) / yearSpan));
    const bucket = buckets[bucketIndex];
    if (!bucket.min || !bucket.max) {
      bucket.min = point;
      bucket.max = point;
    } else {
      if (value < bucket.min.value) bucket.min = point;
      if (value > bucket.max.value) bucket.max = point;
    }
  }
  if (buckets.length === 0 || !first || !last) return points;

  points.push(first);
  for (const bucket of buckets) {
    if (!bucket.min || !bucket.max) continue;
    const earlier = bucket.min.year <= bucket.max.year ? bucket.min : bucket.max;
    const later = bucket.min.year <= bucket.max.year ? bucket.max : bucket.min;
    if (points[points.length - 1].year !== earlier.year) points.push(earlier);
    if (points[points.length - 1].year !== later.year) points.push(later);
  }
  if (points[points.length - 1].year !== last.year) points.push(last);
  return points;
}

function renderChart(countries: Country[], fromYear: number, toYear: number, indicator: Indicator): void {
  const chartRoot = element<HTMLDivElement>("chart");
  const legendRoot = element<HTMLDivElement>("legend");
  element<HTMLHeadingElement>("chart-heading").textContent = `${indicatorName(indicator)} over time`;
  chartRoot.replaceChildren();
  legendRoot.replaceChildren();

  const series = countries
    .map((country) => ({ country, points: pointsFor(country, fromYear, toYear, indicator) }))
    .filter(({ points }) => points.length > 0);
  if (series.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No GDP data is available for this selection.";
    chartRoot.append(empty);
    return;
  }

  const width = 1000;
  const height = 390;
  const left = 76;
  const right = 18;
  const top = 18;
  const bottom = 40;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  let maxValue = 0;
  for (const { points } of series) {
    for (const { value } of points) maxValue = Math.max(maxValue, value);
  }
  const scale = maxValue > 0 ? maxValue : 1;
  const svg = makeSvg("svg");
  svg.classList.add("chart");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `GDP by year from ${fromYear} through ${toYear}`);

  for (let tick = 0; tick <= 4; tick += 1) {
    const y = top + (plotHeight * tick) / 4;
    const line = makeSvg("line");
    line.classList.add("grid-line");
    line.setAttribute("x1", String(left));
    line.setAttribute("x2", String(width - right));
    line.setAttribute("y1", String(y));
    line.setAttribute("y2", String(y));
    svg.append(line);

    const label = makeSvg("text");
    label.classList.add("axis-label");
    label.setAttribute("x", String(left - 10));
    label.setAttribute("y", String(y + 4));
    label.setAttribute("text-anchor", "end");
    label.textContent = formatIndicator(scale * (4 - tick) / 4, indicator);
    svg.append(label);
  }

  const span = Math.max(toYear - fromYear, 1);
  const step = Math.max(1, Math.ceil(span / 8));
  const xYears = new Set<number>([fromYear, toYear]);
  for (let year = Math.ceil(fromYear / step) * step; year <= toYear; year += step) xYears.add(year);
  for (const year of xYears) {
    const x = left + ((year - fromYear) / span) * plotWidth;
    const label = makeSvg("text");
    label.classList.add("axis-label");
    label.setAttribute("x", String(x));
    label.setAttribute("y", String(height - 12));
    label.setAttribute("text-anchor", "middle");
    label.textContent = String(year);
    svg.append(label);
  }

  series.forEach(({ country, points }, index) => {
    const color = colors[index % colors.length];
    const path = makeSvg("polyline");
    path.classList.add("series-line");
    path.setAttribute("stroke", color);
    path.setAttribute(
      "points",
      points
        .map(({ year, value }) => {
          const x = left + ((year - fromYear) / span) * plotWidth;
          const y = top + plotHeight - (value / scale) * plotHeight;
          return `${x.toFixed(2)},${y.toFixed(2)}`;
        })
        .join(" "),
    );
    svg.append(path);

    const item = document.createElement("span");
    item.className = "legend-item";
    const swatch = document.createElement("span");
    swatch.className = "swatch";
    swatch.style.backgroundColor = color;
    swatch.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.textContent = country.code;
    item.append(swatch, label);
    legendRoot.append(item);
  });
  chartRoot.append(svg);
}

function renderMetrics(countries: Country[], fromYear: number, toYear: number, indicator: Indicator): void {
  const root = element<HTMLDivElement>("metrics");
  root.replaceChildren();
  element<HTMLHeadingElement>("metrics-heading").textContent = `${indicatorName(indicator)} in ${toYear}`;

  for (const country of countries) {
    const card = document.createElement("article");
    card.className = "metric";
    const name = document.createElement("div");
    name.className = "metric-code";
    name.textContent = `${country.code} ${indicatorName(indicator)}`;
    const value = document.createElement("div");
    value.className = "metric-value";
    const current = valueFor(country, toYear, indicator);
    value.textContent = formatIndicator(current, indicator);
    const growth = document.createElement("div");
    growth.className = "metric-growth";
    const initial = valueFor(country, fromYear, indicator);
    if (current === undefined || initial === undefined || initial === 0) {
      growth.classList.add("na");
      growth.textContent = "Growth unavailable";
    } else {
      growth.textContent = `${(current / initial).toFixed(2)}× since ${fromYear}`;
    }
    card.append(name, value, growth);
    root.append(card);
  }
}

function renderRankings(countries: Country[], toYear: number, indicator: Indicator): void {
  const root = element<HTMLTableSectionElement>("rankings");
  root.replaceChildren();
  element<HTMLHeadingElement>("ranking-heading").textContent = `${indicatorName(indicator)} rankings in ${toYear}`;
  element<HTMLTableCellElement>("ranking-value-heading").textContent = indicatorName(indicator);
  const ranked = countries
    .map((country) => ({ country, value: valueFor(country, toYear, indicator) }))
    .filter((entry): entry is { country: Country; value: number } => entry.value !== undefined)
    .sort((left, right) => right.value - left.value);

  if (ranked.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 3;
    cell.className = "missing";
    cell.textContent = "No GDP values are available for this year.";
    row.append(cell);
    root.append(row);
    return;
  }

  ranked.forEach(({ country, value }, index) => {
    const row = document.createElement("tr");
    const rank = document.createElement("td");
    rank.textContent = String(index + 1);
    const code = document.createElement("td");
    code.textContent = `${country.code} — ${country.name}`;
    const gdp = document.createElement("td");
    gdp.className = "numeric";
    gdp.textContent = formatIndicator(value, indicator);
    row.append(rank, code, gdp);
    root.append(row);
  });
}

function renderAnnualGrowth(countries: Country[], toYear: number, indicator: Indicator): void {
  const root = element<HTMLTableSectionElement>("annual-growth");
  root.replaceChildren();
  element<HTMLHeadingElement>("growth-heading").textContent = `Annual ${indicatorName(indicator)} growth for ${toYear}`;

  if (countries.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 2;
    cell.className = "missing";
    cell.textContent = "Select at least one country.";
    row.append(cell);
    root.append(row);
    return;
  }

  countries.forEach((country) => {
    const current = valueFor(country, toYear, indicator);
    const previous = valueFor(country, toYear - 1, indicator);
    const row = document.createElement("tr");
    const code = document.createElement("td");
    code.textContent = `${country.code} — ${country.name}`;
    const growth = document.createElement("td");
    growth.className = "numeric";
    if (current === undefined || previous === undefined || previous === 0) {
      growth.className += " missing";
      growth.textContent = "Unavailable";
    } else {
      growth.textContent = `${((current / previous - 1) * 100).toFixed(2)}%`;
    }
    row.append(code, growth);
    root.append(row);
  });
}

function exportVisibleCSV(countries: Country[], fromYear: number, toYear: number, indicator: Indicator): void {
  const escapeCSV = (value: string | number): string => {
    const text = String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const rows: Array<Array<string | number>> = [["Country Name", "Country Code", "Year", indicatorName(indicator)]];
  const chunks: string[] = [];
  for (const country of countries) {
    for (let year = fromYear; year <= toYear; year += 1) {
      const value = valueFor(country, year, indicator);
      rows.push([country.name, country.code, year, value ?? ""]);
      if (rows.length >= 1000) {
        chunks.push(`${rows.map((row) => row.map(escapeCSV).join(",")).join("\r\n")}\r\n`);
        rows.length = 0;
      }
    }
  }
  if (rows.length > 0) chunks.push(rows.map((row) => row.map(escapeCSV).join(",")).join("\r\n"));
  const url = URL.createObjectURL(new Blob(chunks, { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${indicator}-${fromYear}-${toYear}.csv`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function renderMap(countries: Country[], map: MapData, year: number, indicator: Indicator): void {
  const root = element<HTMLDivElement>("world-map");
  root.replaceChildren();
  const legend = element<HTMLDivElement>("map-legend");
  legend.replaceChildren();
  const countriesByCode = new Map(countries.map((country) => [country.code, country]));
  const values = map.features
    .map((feature) => {
      const code = feature.properties.ISO_A3_EH || feature.properties.ADM0_A3 || feature.properties.ISO_A3;
      const country = code ? countriesByCode.get(code) : undefined;
      return country ? valueFor(country, year, indicator) : undefined;
    })
    .filter((value): value is number => value !== undefined)
    .sort((left, right) => left - right);
  const breaks = [0.2, 0.4, 0.6, 0.8].map((fraction) =>
    values.length ? values[Math.min(values.length - 1, Math.floor(fraction * values.length))] : 0,
  );
  const palette = ["#dce8f6", "#a9c5e8", "#6f9ed6", "#3764d8", "#203f92"];
  const svg = makeSvg("svg");
  svg.classList.add("world-map-svg");
  svg.setAttribute("viewBox", "0 0 1000 500");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `${indicatorName(indicator)} world map in ${year}`);
  for (const feature of map.features) {
    const geometry = feature.geometry;
    if (!geometry) continue;
    const code = feature.properties.ISO_A3_EH || feature.properties.ADM0_A3 || feature.properties.ISO_A3;
    if (!code || code === "-99") continue;
    const country = countriesByCode.get(code);
    const value = country ? valueFor(country, year, indicator) : undefined;
    let fill = "#e9edf2";
    if (value !== undefined) {
      const bin = breaks.findIndex((limit) => value <= limit);
      fill = palette[bin < 0 ? palette.length - 1 : bin];
    }
    const polygons = geometry.type === "Polygon"
      ? [geometry.coordinates as number[][][]]
      : geometry.coordinates as number[][][][];
    let pathData = "";
    for (const polygon of polygons) {
      for (const ring of polygon) {
        ring.forEach(([longitude, latitude], pointIndex) => {
          const x = ((longitude + 180) / 360) * 1000;
          const y = ((90 - latitude) / 180) * 500;
          pathData += `${pointIndex === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
        });
        pathData += "Z";
      }
    }
    const path = makeSvg("path");
    path.setAttribute("d", pathData);
    path.setAttribute("fill", fill);
    path.setAttribute("stroke", "#fff");
    path.setAttribute("stroke-width", "0.7");
    const title = makeSvg("title");
    title.textContent = `${country?.name ?? feature.properties.ADMIN ?? code}: ${formatIndicator(value, indicator)} (${year})`;
    path.append(title);
    svg.append(path);
  }
  root.append(svg);
  const legendItems = [
    { color: palette[0], label: "Lowest" },
    { color: palette[2], label: "Middle" },
    { color: palette[4], label: "Highest" },
    { color: "#e9edf2", label: "No data" },
  ];
  for (const entry of legendItems) {
    const item = document.createElement("span");
    item.className = "legend-item";
    const swatch = document.createElement("span");
    swatch.className = "swatch";
    swatch.style.backgroundColor = entry.color;
    swatch.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.textContent = entry.label;
    item.append(swatch, label);
    legend.append(item);
  }
}

function renderComparisons(countries: Country[], year: number, indicator: Indicator): void {
  const root = element<HTMLDivElement>("group-comparisons");
  root.replaceChildren();
  const groups = new Map<string, { total: number; count: number }>();
  for (const country of countries) {
    const value = valueFor(country, year, indicator);
    if (value === undefined) continue;
    for (const category of [
      ["Region", country.region],
      ["Income group", country.incomeLevel],
    ]) {
      if (!category[1]) continue;
      const key = `${category[0]}: ${category[1]}`;
      const current = groups.get(key) ?? { total: 0, count: 0 };
      current.total += value;
      current.count += 1;
      groups.set(key, current);
    }
  }
  const table = document.createElement("table");
  table.innerHTML = "<thead><tr><th>Group</th><th class=\"numeric\">Average</th><th class=\"numeric\">Countries</th></tr></thead>";
  const body = document.createElement("tbody");
  const rows = [...groups.entries()].sort(([left], [right]) => left.localeCompare(right));
  if (rows.length === 0) {
    const row = body.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 3;
    cell.className = "missing";
    cell.textContent = `No ${indicatorName(indicator)} data is available for ${year}.`;
  } else {
    for (const [label, group] of rows) {
      const row = body.insertRow();
      row.insertCell().textContent = label;
      const average = row.insertCell();
      average.className = "numeric";
      average.textContent = formatIndicator(group.total / group.count, indicator);
      const count = row.insertCell();
      count.className = "numeric";
      count.textContent = String(group.count);
    }
  }
  table.append(body);
  root.append(table);
}

function initialize(countries: Country[], years: number[], mapData: MapData): void {
  const from = element<HTMLInputElement>("from-year");
  const to = element<HTMLInputElement>("to-year");
  const select = element<HTMLSelectElement>("countries");
  const exportButton = element<HTMLButtonElement>("export-csv");
  const indicatorSelect = element<HTMLSelectElement>("indicator");
  const minimum = Math.min(...years);
  const maximum = Math.max(...years);
  let visibleCountries: Country[] = [];
  let visibleFromYear = minimum;
  let visibleToYear = maximum;
  let visibleIndicator: Indicator = indicatorSelect.value as Indicator;
  const fromOutput = element<HTMLOutputElement>("from-value");
  const toOutput = element<HTMLOutputElement>("to-value");
  for (const input of [from, to]) {
    input.min = String(minimum);
    input.max = String(maximum);
  }
  from.value = String(minimum);
  to.value = String(maximum);

  for (const country of countries) {
    const option = document.createElement("option");
    option.value = country.code;
    option.textContent = `${country.code} — ${country.name}`;
    option.selected = defaultCountries.includes(country.code);
    select.append(option);
  }

  const update = (): void => {
    let fromYear = Number(from.value);
    let toYear = Number(to.value);
    if (fromYear > toYear) {
      if (document.activeElement === from) toYear = fromYear;
      else fromYear = toYear;
      from.value = String(fromYear);
      to.value = String(toYear);
    }
    fromOutput.value = String(fromYear);
    toOutput.value = String(toYear);
    const selected = new Set(Array.from(select.selectedOptions, (option) => option.value));
    const chosen = countries.filter(({ code }) => selected.has(code));
    const indicator = indicatorSelect.value as Indicator;
    visibleCountries = chosen;
    visibleFromYear = fromYear;
    visibleToYear = toYear;
    visibleIndicator = indicator;
    renderChart(chosen, fromYear, toYear, indicator);
    renderMetrics(chosen, fromYear, toYear, indicator);
    renderRankings(chosen, toYear, indicator);
    renderAnnualGrowth(chosen, toYear, indicator);
    renderMap(countries, mapData, toYear, indicator);
    renderComparisons(countries, toYear, indicator);
    exportButton.disabled = chosen.length === 0;
  };
  from.addEventListener("input", update);
  to.addEventListener("input", update);
  select.addEventListener("change", update);
  indicatorSelect.addEventListener("change", update);
  exportButton.addEventListener("click", () => exportVisibleCSV(visibleCountries, visibleFromYear, visibleToYear, visibleIndicator));
  update();
  element<HTMLDivElement>("dashboard").hidden = false;
}

async function start(): Promise<void> {
  try {
    const response = await fetch("/data/gdp_data.csv");
    if (!response.ok) throw new Error(`The GDP dataset request failed (${response.status})`);
    const [snapshotResponse, mapResponse] = await Promise.all([
      fetch("/data/world_bank_indicators.json"),
      fetch("/data/world_countries.geojson"),
    ]);
    if (!snapshotResponse.ok || !mapResponse.ok) {
      throw new Error("Indicator and map data are missing. Run scripts/refresh-dashboard-data.mjs first.");
    }
    const [snapshot, mapData] = await Promise.all([
      snapshotResponse.json() as Promise<IndicatorSnapshot>,
      mapResponse.json() as Promise<MapData>,
    ]);
    const { countries, years } = await parseDataset(response);
    const indicatorByCode = new Map(snapshot.countries.map((country) => [country.code, country]));
    for (const country of countries) {
      const metadata = indicatorByCode.get(country.code);
      country.region = metadata?.region.trim() ?? "";
      country.incomeLevel = metadata?.incomeLevel.trim() ?? "";
      country.gdpPerCapitaByYear = new Float64Array(years.length);
      country.realGDPByYear = new Float64Array(years.length);
      country.gdpPerCapitaByYear.fill(Number.NaN);
      country.realGDPByYear.fill(Number.NaN);
      years.forEach((year, index) => {
        const perCapita = metadata?.gdpPerCapita[String(year)];
        const realGDP = metadata?.realGDP[String(year)];
        if (typeof perCapita === "number" && Number.isFinite(perCapita)) country.gdpPerCapitaByYear[index] = perCapita;
        if (typeof realGDP === "number" && Number.isFinite(realGDP)) country.realGDPByYear[index] = realGDP;
      });
    }
    initialize(countries, years, mapData);
    element<HTMLDivElement>("status").remove();
  } catch (error) {
    const status = element<HTMLDivElement>("status");
    status.className = "error";
    status.textContent = error instanceof Error ? error.message : "Unable to load GDP data";
  }
}

void start();
