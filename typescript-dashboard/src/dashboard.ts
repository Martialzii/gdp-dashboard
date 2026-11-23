interface Country {
  code: string;
  name: string;
  gdpByYear: Float64Array;
}

interface DataPoint {
  year: number;
  gdp: number;
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
    countries.push({ code, name: values[nameIndex] ?? code, gdpByYear });
  }
  countries.sort((left, right) => left.code.localeCompare(right.code));
  return { countries, years };
}

function gdpFor(country: Country, year: number): number | undefined {
  const index = yearIndexes.get(year);
  if (index === undefined) return undefined;
  const value = country.gdpByYear[index];
  return Number.isFinite(value) ? value : undefined;
}

function element<T extends HTMLElement>(id: string): T {
  const value = document.getElementById(id);
  if (!value) throw new Error(`Missing dashboard element: ${id}`);
  return value as T;
}

function makeSvg<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
  return document.createElementNS(svgNamespace, tag);
}

function pointsFor(country: Country, fromYear: number, toYear: number): DataPoint[] {
  const yearSpan = toYear - fromYear + 1;
  const bucketCount = Math.floor((maximumChartPoints - 2) / 2);
  const buckets: Array<{ min?: DataPoint; max?: DataPoint }> =
    yearSpan > maximumChartPoints ? Array.from({ length: bucketCount }, () => ({})) : [];
  const points: DataPoint[] = [];
  let first: DataPoint | undefined;
  let last: DataPoint | undefined;

  for (let year = fromYear; year <= toYear; year += 1) {
    const gdp = gdpFor(country, year);
    if (gdp === undefined) continue;
    const point = { year, gdp };
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
      if (gdp < bucket.min.gdp) bucket.min = point;
      if (gdp > bucket.max.gdp) bucket.max = point;
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

function renderChart(countries: Country[], fromYear: number, toYear: number): void {
  const chartRoot = element<HTMLDivElement>("chart");
  const legendRoot = element<HTMLDivElement>("legend");
  chartRoot.replaceChildren();
  legendRoot.replaceChildren();

  const series = countries
    .map((country) => ({ country, points: pointsFor(country, fromYear, toYear) }))
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
  let maxGDP = 0;
  for (const { points } of series) {
    for (const { gdp } of points) maxGDP = Math.max(maxGDP, gdp);
  }
  const scaleGDP = maxGDP > 0 ? maxGDP : 1e9;
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
    label.textContent = `$${((scaleGDP * (4 - tick)) / 4 / 1e9).toFixed(1)}B`;
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
        .map(({ year, gdp }) => {
          const x = left + ((year - fromYear) / span) * plotWidth;
          const y = top + plotHeight - (gdp / scaleGDP) * plotHeight;
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

function renderMetrics(countries: Country[], fromYear: number, toYear: number): void {
  const root = element<HTMLDivElement>("metrics");
  root.replaceChildren();
  element<HTMLHeadingElement>("metrics-heading").textContent = `GDP in ${toYear}`;

  for (const country of countries) {
    const card = document.createElement("article");
    card.className = "metric";
    const name = document.createElement("div");
    name.className = "metric-code";
    name.textContent = `${country.code} GDP`;
    const value = document.createElement("div");
    value.className = "metric-value";
    const current = gdpFor(country, toYear);
    value.textContent = current === undefined ? "N/A" : `$${(current / 1e9).toLocaleString(undefined, { maximumFractionDigits: 0 })}B`;
    const growth = document.createElement("div");
    growth.className = "metric-growth";
    const initial = gdpFor(country, fromYear);
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

function formatGDP(value: number | undefined): string {
  if (value === undefined) return "N/A";
  return `$${(value / 1e9).toLocaleString(undefined, { maximumFractionDigits: 0 })}B`;
}

function renderRankings(countries: Country[], toYear: number): void {
  const root = element<HTMLTableSectionElement>("rankings");
  root.replaceChildren();
  element<HTMLHeadingElement>("ranking-heading").textContent = `GDP rankings in ${toYear}`;
  const ranked = countries
    .map((country) => ({ country, value: gdpFor(country, toYear) }))
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
    gdp.textContent = formatGDP(value);
    row.append(rank, code, gdp);
    root.append(row);
  });
}

function renderAnnualGrowth(countries: Country[], toYear: number): void {
  const root = element<HTMLTableSectionElement>("annual-growth");
  root.replaceChildren();
  element<HTMLHeadingElement>("growth-heading").textContent = `Annual GDP growth for ${toYear}`;

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
    const current = gdpFor(country, toYear);
    const previous = gdpFor(country, toYear - 1);
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

function exportVisibleCSV(countries: Country[], fromYear: number, toYear: number): void {
  const escapeCSV = (value: string | number): string => {
    const text = String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const rows: Array<Array<string | number>> = [["Country Name", "Country Code", "Year", "GDP"]];
  const chunks: string[] = [];
  for (const country of countries) {
    for (let year = fromYear; year <= toYear; year += 1) {
      const gdp = gdpFor(country, year);
      rows.push([country.name, country.code, year, gdp ?? ""]);
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
  link.download = `gdp-${fromYear}-${toYear}.csv`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function initialize(countries: Country[], years: number[]): void {
  const from = element<HTMLInputElement>("from-year");
  const to = element<HTMLInputElement>("to-year");
  const select = element<HTMLSelectElement>("countries");
  const exportButton = element<HTMLButtonElement>("export-csv");
  const minimum = Math.min(...years);
  const maximum = Math.max(...years);
  let visibleCountries: Country[] = [];
  let visibleFromYear = minimum;
  let visibleToYear = maximum;
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
    visibleCountries = chosen;
    visibleFromYear = fromYear;
    visibleToYear = toYear;
    renderChart(chosen, fromYear, toYear);
    renderMetrics(chosen, fromYear, toYear);
    renderRankings(chosen, toYear);
    renderAnnualGrowth(chosen, toYear);
    exportButton.disabled = chosen.length === 0;
  };
  from.addEventListener("input", update);
  to.addEventListener("input", update);
  select.addEventListener("change", update);
  exportButton.addEventListener("click", () => exportVisibleCSV(visibleCountries, visibleFromYear, visibleToYear));
  update();
  element<HTMLDivElement>("dashboard").hidden = false;
}

async function start(): Promise<void> {
  try {
    const response = await fetch("/data/gdp_data.csv");
    if (!response.ok) throw new Error(`The GDP dataset request failed (${response.status})`);
    const { countries, years } = await parseDataset(response);
    initialize(countries, years);
    element<HTMLDivElement>("status").remove();
  } catch (error) {
    const status = element<HTMLDivElement>("status");
    status.className = "error";
    status.textContent = error instanceof Error ? error.message : "Unable to load GDP data";
  }
}

void start();
