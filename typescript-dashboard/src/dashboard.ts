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
type Language = "en" | "es" | "fr";

const translations = {
  en: {
    appTitle: "GDP dashboard",
    introBefore: "Explore economic indicators from",
    sourceName: "World Bank Open Data",
    loading: "Loading dashboard data…",
    language: "Language",
    indicator: "Indicator",
    gdp: "GDP (current US$)",
    gdpPerCapita: "GDP per capita (current US$)",
    realGDP: "Real GDP (constant 2015 US$)",
    region: "Region",
    allRegions: "All regions",
    incomeGroup: "Income group",
    allIncomeGroups: "All income groups",
    years: "Years",
    from: "From",
    to: "To",
    countries: "Countries",
    countryHint: "Filters narrow the country list, map, and group averages. Use Ctrl (Windows/Linux) or ⌘ (Mac) to select multiple countries.",
    chartHeading: "{indicator} over time",
    noGDPSelection: "No data is available for this selection.",
    metricsHeading: "{indicator} in {year}",
    growthUnavailable: "Growth unavailable",
    since: "{ratio}× since {year}",
    rankingHeading: "{indicator} rankings in {year}",
    rank: "Rank",
    country: "Country",
    value: "Value",
    noValuesForYear: "No values are available for this year.",
    annualGrowth: "Annual {indicator} growth for {year}",
    annualGrowthHint: "Year-over-year percent change, using the previous year's value as the denominator.",
    growthTrend: "Year-over-year growth trend",
    growthTrendHint: "Each column shows annual percent change for that year, calculated against the previous calendar year.",
    cumulativeGrowth: "Cumulative change ({from}–{to})",
    cumulativeGrowthHint: "Percent change from the selected start year to the end year, using the start-year value as the denominator.",
    services: "Data services",
    serviceReady: "Dashboard data service is available.",
    serviceSource: "Source",
    serviceUpdated: "Snapshot last refreshed",
    activityHeading: "Live activity",
    activityPrivacy: "Recent actions are kept on this page only; no usage telemetry is sent.",
    activityLoaded: "Dashboard ready: {indicator}, {from}–{to}, {count} countries.",
    activityIndicatorChanged: "Indicator changed to {indicator}.",
    activityRangeChanged: "Year range changed to {from}–{to}.",
    activityFiltersChanged: "Region or income-group filter changed.",
    activityCountriesChanged: "Country selection changed ({count} countries).",
    activityExported: "CSV exported for {count} countries.",
    growth: "Growth",
    selectCountry: "Select at least one country.",
    unavailable: "Unavailable",
    exportCSV: "Export visible data as CSV",
    worldMap: "World map: {indicator} in {year}",
    mapAlt: "{indicator} world map in {year}",
    lowest: "Lowest",
    middle: "Middle",
    highest: "Highest",
    noData: "No data",
    comparisons: "Regional and income-group comparisons",
    comparisonHint: "Averages use countries matching the selected filters and with reported values for the selected indicator and year.",
    group: "Group",
    average: "Average",
    countriesCount: "Countries",
    countryName: "Country Name",
    countryCode: "Country Code",
    year: "Year",
    chartAlt: "{indicator} values from {from} through {to}",
    noIndicatorForYear: "No {indicator} data is available for {year}.",
    unableToLoad: "Unable to load dashboard data.",
    missingSnapshots: "Indicator and map data are missing. Run scripts/refresh-dashboard-data.mjs first.",
  },
  es: {
    appTitle: "Panel del PIB",
    introBefore: "Explora indicadores económicos de",
    sourceName: "Datos abiertos del Banco Mundial",
    loading: "Cargando datos del panel…",
    language: "Idioma",
    indicator: "Indicador",
    gdp: "PIB (US$ actuales)",
    gdpPerCapita: "PIB per cápita (US$ actuales)",
    realGDP: "PIB real (US$ constantes de 2015)",
    region: "Región",
    allRegions: "Todas las regiones",
    incomeGroup: "Grupo de ingresos",
    allIncomeGroups: "Todos los grupos de ingresos",
    years: "Años",
    from: "Desde",
    to: "Hasta",
    countries: "Países",
    countryHint: "Los filtros limitan la lista de países, el mapa y los promedios por grupo. Usa Ctrl (Windows/Linux) o ⌘ (Mac) para seleccionar varios países.",
    chartHeading: "{indicator} a lo largo del tiempo",
    noGDPSelection: "No hay datos disponibles para esta selección.",
    metricsHeading: "{indicator} en {year}",
    growthUnavailable: "Crecimiento no disponible",
    since: "{ratio}× desde {year}",
    rankingHeading: "Clasificación de {indicator} en {year}",
    rank: "Posición",
    country: "País",
    value: "Valor",
    noValuesForYear: "No hay valores disponibles para este año.",
    annualGrowth: "Crecimiento anual de {indicator} en {year}",
    annualGrowthHint: "Cambio porcentual interanual; el valor del año anterior es el denominador.",
    growthTrend: "Tendencia del crecimiento interanual",
    growthTrendHint: "Cada columna muestra la variación porcentual anual respecto al año calendario anterior.",
    cumulativeGrowth: "Variación acumulada ({from}–{to})",
    cumulativeGrowthHint: "Cambio porcentual desde el año inicial hasta el año final, usando el valor del año inicial como denominador.",
    services: "Servicios de datos",
    serviceReady: "El servicio de datos del panel está disponible.",
    serviceSource: "Fuente",
    serviceUpdated: "Última actualización de la instantánea",
    activityHeading: "Actividad en directo",
    activityPrivacy: "Las acciones recientes solo se guardan en esta página; no se envían datos de uso.",
    activityLoaded: "Panel listo: {indicator}, {from}–{to}, {count} países.",
    activityIndicatorChanged: "Indicador cambiado a {indicator}.",
    activityRangeChanged: "Intervalo de años cambiado a {from}–{to}.",
    activityFiltersChanged: "Filtro de región o ingresos cambiado.",
    activityCountriesChanged: "Selección de países cambiada ({count} países).",
    activityExported: "CSV exportado para {count} países.",
    growth: "Crecimiento",
    selectCountry: "Selecciona al menos un país.",
    unavailable: "No disponible",
    exportCSV: "Exportar datos visibles como CSV",
    worldMap: "Mapa mundial: {indicator} en {year}",
    mapAlt: "Mapa mundial de {indicator} en {year}",
    lowest: "Más bajo",
    middle: "Intermedio",
    highest: "Más alto",
    noData: "Sin datos",
    comparisons: "Comparaciones por región y grupo de ingresos",
    comparisonHint: "Los promedios incluyen países que coinciden con los filtros y tienen datos del indicador y año seleccionados.",
    group: "Grupo",
    average: "Promedio",
    countriesCount: "Países",
    countryName: "Nombre del país",
    countryCode: "Código del país",
    year: "Año",
    chartAlt: "Valores de {indicator} desde {from} hasta {to}",
    noIndicatorForYear: "No hay datos de {indicator} para {year}.",
    unableToLoad: "No se pudieron cargar los datos del panel.",
    missingSnapshots: "Faltan los datos de indicadores y del mapa. Ejecuta primero scripts/refresh-dashboard-data.mjs.",
  },
  fr: {
    appTitle: "Tableau de bord du PIB",
    introBefore: "Explorez les indicateurs économiques de",
    sourceName: "Données ouvertes de la Banque mondiale",
    loading: "Chargement des données du tableau de bord…",
    language: "Langue",
    indicator: "Indicateur",
    gdp: "PIB (USD courants)",
    gdpPerCapita: "PIB par habitant (USD courants)",
    realGDP: "PIB réel (USD constants de 2015)",
    region: "Région",
    allRegions: "Toutes les régions",
    incomeGroup: "Groupe de revenu",
    allIncomeGroups: "Tous les groupes de revenu",
    years: "Années",
    from: "De",
    to: "À",
    countries: "Pays",
    countryHint: "Les filtres réduisent la liste des pays, la carte et les moyennes par groupe. Utilisez Ctrl (Windows/Linux) ou ⌘ (Mac) pour sélectionner plusieurs pays.",
    chartHeading: "{indicator} au fil du temps",
    noGDPSelection: "Aucune donnée disponible pour cette sélection.",
    metricsHeading: "{indicator} en {year}",
    growthUnavailable: "Croissance indisponible",
    since: "{ratio}× depuis {year}",
    rankingHeading: "Classement du {indicator} en {year}",
    rank: "Rang",
    country: "Pays",
    value: "Valeur",
    noValuesForYear: "Aucune valeur disponible pour cette année.",
    annualGrowth: "Croissance annuelle du {indicator} en {year}",
    annualGrowthHint: "Variation en pourcentage d'une année à l'autre ; la valeur de l'année précédente est le dénominateur.",
    growthTrend: "Tendance de la croissance annuelle",
    growthTrendHint: "Chaque colonne indique la variation annuelle en pourcentage par rapport à l'année civile précédente.",
    cumulativeGrowth: "Variation cumulée ({from}–{to})",
    cumulativeGrowthHint: "Variation en pourcentage entre les années de début et de fin, avec la valeur de l'année de début comme dénominateur.",
    services: "Services de données",
    serviceReady: "Le service de données du tableau de bord est disponible.",
    serviceSource: "Source",
    serviceUpdated: "Dernière actualisation de l’instantané",
    activityHeading: "Activité en direct",
    activityPrivacy: "Les actions récentes restent sur cette page ; aucune télémétrie d’utilisation n’est envoyée.",
    activityLoaded: "Tableau prêt : {indicator}, {from}–{to}, {count} pays.",
    activityIndicatorChanged: "Indicateur changé : {indicator}.",
    activityRangeChanged: "Période changée : {from}–{to}.",
    activityFiltersChanged: "Filtre de région ou de revenu modifié.",
    activityCountriesChanged: "Sélection des pays modifiée ({count} pays).",
    activityExported: "CSV exporté pour {count} pays.",
    growth: "Croissance",
    selectCountry: "Sélectionnez au moins un pays.",
    unavailable: "Indisponible",
    exportCSV: "Exporter les données visibles au format CSV",
    worldMap: "Carte du monde : {indicator} en {year}",
    mapAlt: "Carte mondiale du {indicator} en {year}",
    lowest: "Le plus bas",
    middle: "Moyen",
    highest: "Le plus élevé",
    noData: "Aucune donnée",
    comparisons: "Comparaisons par région et groupe de revenu",
    comparisonHint: "Les moyennes incluent les pays correspondant aux filtres et disposant de données pour l’indicateur et l’année choisis.",
    group: "Groupe",
    average: "Moyenne",
    countriesCount: "Pays",
    countryName: "Nom du pays",
    countryCode: "Code du pays",
    year: "Année",
    chartAlt: "Valeurs du {indicator} de {from} à {to}",
    noIndicatorForYear: "Aucune donnée de {indicator} n’est disponible pour {year}.",
    unableToLoad: "Impossible de charger les données du tableau de bord.",
    missingSnapshots: "Les données d’indicateurs et de carte sont manquantes. Exécutez d’abord scripts/refresh-dashboard-data.mjs.",
  },
} satisfies Record<Language, Record<string, string>>;

interface IndicatorSnapshot {
  source?: string;
  updatedAt?: string;
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
let language: Language = "en";
let snapshotMetadata: Pick<IndicatorSnapshot, "source" | "updatedAt"> = {};
type ActivityKey = "activityLoaded" | "activityIndicatorChanged" | "activityRangeChanged" |
  "activityFiltersChanged" | "activityCountriesChanged" | "activityExported";
const activityItems: Array<{ key: ActivityKey; values: Record<string, string | number> }> = [];

function message(key: keyof typeof translations.en, values: Record<string, string | number> = {}): string {
  return Object.entries(values).reduce(
    (text, [name, value]) => text.replace(new RegExp(`\\{${name}\\}`, "g"), String(value)),
    translations[language][key],
  );
}

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
  return message(indicator);
}

function formatIndicator(value: number | undefined, indicator: Indicator): string {
  if (value === undefined) return message("unavailable");
  const number = new Intl.NumberFormat(language, { maximumFractionDigits: 0 });
  if (indicator === "gdpPerCapita") {
    return new Intl.NumberFormat(language, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
  }
  return `$${number.format(value / 1e9)}B`;
}

function applyStaticTranslations(): void {
  document.documentElement.lang = language;
  document.title = message("appTitle");
  element<HTMLHeadingElement>("app-title").textContent = `🌍 ${message("appTitle")}`;
  element<HTMLSpanElement>("intro-before").textContent = message("introBefore");
  element<HTMLAnchorElement>("data-source-link").textContent = message("sourceName");
  element<HTMLDivElement>("status").textContent = message("loading");
  element<HTMLSpanElement>("language-label").textContent = message("language");
  element<HTMLSelectElement>("region-filter").options[0].textContent = message("allRegions");
  element<HTMLSelectElement>("income-filter").options[0].textContent = message("allIncomeGroups");
  element<HTMLSpanElement>("indicator-label").textContent = message("indicator");
  const indicatorOptions = element<HTMLSelectElement>("indicator");
  for (const indicator of ["gdp", "gdpPerCapita", "realGDP"] as const) {
    const option = indicatorOptions.querySelector<HTMLOptionElement>(`option[value="${indicator}"]`);
    if (option) option.textContent = message(indicator);
  }
  element<HTMLLabelElement>("region-label").textContent = message("region");
  element<HTMLLabelElement>("income-label").textContent = message("incomeGroup");
  element<HTMLDivElement>("years-label").textContent = message("years");
  element<HTMLSpanElement>("from-label").textContent = message("from");
  element<HTMLSpanElement>("to-label").textContent = message("to");
  element<HTMLLabelElement>("countries-label").textContent = message("countries");
  element<HTMLParagraphElement>("country-hint").textContent = message("countryHint");
  element<HTMLButtonElement>("export-csv").textContent = message("exportCSV");
  element<HTMLHeadingElement>("ranking-heading").textContent = message("rankingHeading", {
    indicator: indicatorName(element<HTMLSelectElement>("indicator").value as Indicator),
    year: element<HTMLInputElement>("to-year").value,
  });
  element<HTMLTableCellElement>("ranking-rank-heading").textContent = message("rank");
  element<HTMLTableCellElement>("ranking-country-heading").textContent = message("country");
  element<HTMLTableCellElement>("growth-country-heading").textContent = message("country");
  element<HTMLTableCellElement>("growth-value-heading").textContent = message("growth");
  element<HTMLParagraphElement>("annual-growth-hint").textContent = message("annualGrowthHint");
  element<HTMLHeadingElement>("growth-trend-heading").textContent = message("growthTrend");
  element<HTMLParagraphElement>("growth-trend-hint").textContent = message("growthTrendHint");
  element<HTMLHeadingElement>("cumulative-growth-heading").textContent = message("cumulativeGrowth");
  element<HTMLParagraphElement>("cumulative-growth-hint").textContent = message("cumulativeGrowthHint");
  element<HTMLHeadingElement>("services-heading").textContent = message("services");
  element<HTMLParagraphElement>("service-ready").textContent = message("serviceReady");
  element<HTMLSpanElement>("service-source-label").textContent = message("serviceSource");
  element<HTMLSpanElement>("service-updated-label").textContent = message("serviceUpdated");
  element<HTMLHeadingElement>("activity-heading").textContent = message("activityHeading");
  element<HTMLParagraphElement>("activity-privacy").textContent = message("activityPrivacy");
  element<HTMLHeadingElement>("map-heading").textContent = message("worldMap", {
    indicator: indicatorName(element<HTMLSelectElement>("indicator").value as Indicator),
    year: element<HTMLInputElement>("to-year").value,
  });
  element<HTMLHeadingElement>("comparison-heading").textContent = message("comparisons");
  element<HTMLParagraphElement>("comparison-hint").textContent = message("comparisonHint");
}

function element<T extends HTMLElement>(id: string): T {
  const value = document.getElementById(id);
  if (!value) throw new Error(`Missing dashboard element: ${id}`);
  return value as T;
}

function recordActivity(key: ActivityKey, values: Record<string, string | number>): void {
  activityItems.unshift({ key, values });
  activityItems.length = Math.min(activityItems.length, 8);
  renderActivity();
}

function renderActivity(): void {
  const feed = element<HTMLOListElement>("activity-feed");
  feed.replaceChildren(...activityItems.map(({ key: itemKey, values: itemValues }) => {
    const item = document.createElement("li");
    item.textContent = message(itemKey, itemValues);
    return item;
  }));
}

function renderServiceStatus(): void {
  element<HTMLSpanElement>("service-source").textContent = snapshotMetadata.source ?? message("sourceName");
  const updatedAt = snapshotMetadata.updatedAt;
  element<HTMLTimeElement>("service-updated").textContent = updatedAt
    ? new Date(updatedAt).toLocaleString(language)
    : message("unavailable");
  if (updatedAt) element<HTMLTimeElement>("service-updated").dateTime = updatedAt;
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
  element<HTMLHeadingElement>("chart-heading").textContent = message("chartHeading", {
    indicator: indicatorName(indicator),
  });
  chartRoot.replaceChildren();
  legendRoot.replaceChildren();

  const series = countries
    .map((country) => ({ country, points: pointsFor(country, fromYear, toYear, indicator) }))
    .filter(({ points }) => points.length > 0);
  if (series.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = message("noGDPSelection");
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
  svg.setAttribute("aria-label", message("chartAlt", {
    indicator: indicatorName(indicator), from: fromYear, to: toYear,
  }));

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
  element<HTMLHeadingElement>("metrics-heading").textContent = message("metricsHeading", {
    indicator: indicatorName(indicator), year: toYear,
  });

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
      growth.textContent = message("growthUnavailable");
    } else {
      growth.textContent = message("since", {
        ratio: (current / initial).toFixed(2), year: fromYear,
      });
    }
    card.append(name, value, growth);
    root.append(card);
  }
}

function renderRankings(countries: Country[], toYear: number, indicator: Indicator): void {
  const root = element<HTMLTableSectionElement>("rankings");
  root.replaceChildren();
  element<HTMLHeadingElement>("ranking-heading").textContent = message("rankingHeading", {
    indicator: indicatorName(indicator), year: toYear,
  });
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
    cell.textContent = message("noValuesForYear");
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
  element<HTMLHeadingElement>("growth-heading").textContent = message("annualGrowth", {
    indicator: indicatorName(indicator), year: toYear,
  });

  if (countries.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 2;
    cell.className = "missing";
    cell.textContent = message("selectCountry");
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
      growth.textContent = message("unavailable");
    } else {
      growth.textContent = `${((current / previous - 1) * 100).toFixed(2)}%`;
    }
    row.append(code, growth);
    root.append(row);
  });
}

function renderGrowthTrend(countries: Country[], fromYear: number, toYear: number, indicator: Indicator): void {
  const head = element<HTMLTableSectionElement>("growth-trend-head");
  const body = element<HTMLTableSectionElement>("growth-trend-body");
  head.replaceChildren();
  body.replaceChildren();

  const header = document.createElement("tr");
  const countryHeading = document.createElement("th");
  countryHeading.textContent = message("country");
  header.append(countryHeading);
  for (let year = fromYear; year <= toYear; year++) {
    const cell = document.createElement("th");
    cell.className = "numeric";
    cell.textContent = String(year);
    header.append(cell);
  }
  head.append(header);

  if (countries.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = toYear - fromYear + 2;
    cell.className = "missing";
    cell.textContent = message("selectCountry");
    row.append(cell);
    body.append(row);
    return;
  }

  for (const country of countries) {
    const row = document.createElement("tr");
    const countryCell = document.createElement("td");
    countryCell.textContent = `${country.code} — ${country.name}`;
    row.append(countryCell);
    for (let year = fromYear; year <= toYear; year++) {
      const current = valueFor(country, year, indicator);
      const previous = valueFor(country, year - 1, indicator);
      const cell = document.createElement("td");
      cell.className = "numeric";
      if (current === undefined || previous === undefined || previous === 0) {
        cell.classList.add("missing");
        cell.textContent = message("unavailable");
      } else {
        cell.textContent = `${((current / previous - 1) * 100).toFixed(2)}%`;
      }
      row.append(cell);
    }
    body.append(row);
  }
}

function renderCumulativeGrowth(countries: Country[], fromYear: number, toYear: number, indicator: Indicator): void {
  element<HTMLHeadingElement>("cumulative-growth-heading").textContent = message("cumulativeGrowth", {
    from: fromYear, to: toYear,
  });
  const root = element<HTMLTableSectionElement>("cumulative-growth");
  root.replaceChildren();
  for (const country of countries) {
    const start = valueFor(country, fromYear, indicator);
    const end = valueFor(country, toYear, indicator);
    const row = document.createElement("tr");
    const countryCell = document.createElement("td");
    countryCell.textContent = `${country.code} — ${country.name}`;
    const change = document.createElement("td");
    change.className = "numeric";
    if (start === undefined || end === undefined || start === 0) {
      change.classList.add("missing");
      change.textContent = message("unavailable");
    } else {
      change.textContent = `${((end / start - 1) * 100).toFixed(2)}%`;
    }
    row.append(countryCell, change);
    root.append(row);
  }
  if (countries.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 2;
    cell.className = "missing";
    cell.textContent = message("selectCountry");
    row.append(cell);
    root.append(row);
  }
}

function exportVisibleCSV(countries: Country[], fromYear: number, toYear: number, indicator: Indicator): void {
  const escapeCSV = (value: string | number): string => {
    const text = String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const rows: Array<Array<string | number>> = [
    [message("countryName"), message("countryCode"), message("year"), indicatorName(indicator)],
  ];
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
  element<HTMLHeadingElement>("map-heading").textContent = message("worldMap", {
    indicator: indicatorName(indicator), year,
  });
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
  svg.setAttribute("aria-label", message("mapAlt", { indicator: indicatorName(indicator), year }));
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
    { color: palette[0], label: message("lowest") },
    { color: palette[2], label: message("middle") },
    { color: palette[4], label: message("highest") },
    { color: "#e9edf2", label: message("noData") },
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
      [message("region"), country.region],
      [message("incomeGroup"), country.incomeLevel],
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
  const head = table.createTHead();
  const headingRow = head.insertRow();
  for (const [label, numeric] of [
    [message("group"), false],
    [message("average"), true],
    [message("countriesCount"), true],
  ] as const) {
    const heading = document.createElement("th");
    heading.textContent = label;
    if (numeric) heading.className = "numeric";
    headingRow.append(heading);
  }
  const body = document.createElement("tbody");
  const rows = [...groups.entries()].sort(([left], [right]) => left.localeCompare(right));
  if (rows.length === 0) {
    const row = body.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 3;
    cell.className = "missing";
    cell.textContent = message("noIndicatorForYear", { indicator: indicatorName(indicator), year });
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

function countriesForFilters(countries: Country[], region: string, incomeLevel: string): Country[] {
  return countries.filter((country) =>
    (!region || country.region === region) && (!incomeLevel || country.incomeLevel === incomeLevel),
  );
}

function initialize(countries: Country[], years: number[], mapData: MapData): void {
  const from = element<HTMLInputElement>("from-year");
  const to = element<HTMLInputElement>("to-year");
  const select = element<HTMLSelectElement>("countries");
  const exportButton = element<HTMLButtonElement>("export-csv");
  const indicatorSelect = element<HTMLSelectElement>("indicator");
  const regionSelect = element<HTMLSelectElement>("region-filter");
  const incomeSelect = element<HTMLSelectElement>("income-filter");
  const languageSelect = element<HTMLSelectElement>("language");
  let firstUpdate = true;
  const requestedLanguage = new URLSearchParams(window.location.search).get("lang");
  language = requestedLanguage === "es" || requestedLanguage === "fr" ? requestedLanguage : "en";
  languageSelect.value = language;
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
  applyStaticTranslations();

  const addFilterOptions = (filter: HTMLSelectElement, values: string[], allLabel: string): void => {
    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = allLabel;
    filter.append(allOption);
    for (const value of values) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      filter.append(option);
    }
  };
  addFilterOptions(regionSelect, [...new Set(countries.map(({ region }) => region).filter(Boolean))].sort(), message("allRegions"));
  addFilterOptions(incomeSelect, [...new Set(countries.map(({ incomeLevel }) => incomeLevel).filter(Boolean))].sort(), message("allIncomeGroups"));

  const refreshCountryOptions = (preservedCodes?: Set<string>): void => {
    const available = countriesForFilters(countries, regionSelect.value, incomeSelect.value);
    select.replaceChildren();
    for (const country of available) {
      const option = document.createElement("option");
      option.value = country.code;
      option.textContent = `${country.code} — ${country.name}`;
      option.selected = preservedCodes
        ? preservedCodes.has(country.code)
        : defaultCountries.includes(country.code);
      select.append(option);
    }
  };
  refreshCountryOptions();

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
    const filteredCountries = countriesForFilters(countries, regionSelect.value, incomeSelect.value);
    const chosen = filteredCountries.filter(({ code }) => selected.has(code));
    const indicator = indicatorSelect.value as Indicator;
    visibleCountries = chosen;
    visibleFromYear = fromYear;
    visibleToYear = toYear;
    visibleIndicator = indicator;
    renderChart(chosen, fromYear, toYear, indicator);
    renderMetrics(chosen, fromYear, toYear, indicator);
    renderRankings(chosen, toYear, indicator);
    renderAnnualGrowth(chosen, toYear, indicator);
    renderGrowthTrend(chosen, fromYear, toYear, indicator);
    renderCumulativeGrowth(chosen, fromYear, toYear, indicator);
    renderMap(filteredCountries, mapData, toYear, indicator);
    renderComparisons(filteredCountries, toYear, indicator);
    renderServiceStatus();
    renderActivity();
    exportButton.disabled = chosen.length === 0;
    if (firstUpdate) {
      recordActivity("activityLoaded", {
        indicator: indicatorName(indicator), from: fromYear, to: toYear, count: chosen.length,
      });
      firstUpdate = false;
    }
  };
  const rangeChanged = (): void => {
    update();
    recordActivity("activityRangeChanged", { from: from.value, to: to.value });
  };
  from.addEventListener("input", rangeChanged);
  to.addEventListener("input", rangeChanged);
  select.addEventListener("change", () => {
    update();
    recordActivity("activityCountriesChanged", {
      count: Array.from(select.selectedOptions).length,
    });
  });
  indicatorSelect.addEventListener("change", () => {
    update();
    recordActivity("activityIndicatorChanged", {
      indicator: indicatorName(indicatorSelect.value as Indicator),
    });
  });
  const filtersChanged = (): void => {
    const selectedCodes = new Set(Array.from(select.selectedOptions, (option) => option.value));
    refreshCountryOptions(selectedCodes);
    update();
    recordActivity("activityFiltersChanged", {});
  };
  regionSelect.addEventListener("change", filtersChanged);
  incomeSelect.addEventListener("change", filtersChanged);
  languageSelect.addEventListener("change", () => {
    const selectedLanguage = languageSelect.value;
    if (selectedLanguage !== "en" && selectedLanguage !== "es" && selectedLanguage !== "fr") return;
    language = selectedLanguage;
    const url = new URL(window.location.href);
    url.searchParams.set("lang", language);
    window.history.replaceState(null, "", url);
    applyStaticTranslations();
    update();
  });
  exportButton.addEventListener("click", () => {
    exportVisibleCSV(visibleCountries, visibleFromYear, visibleToYear, visibleIndicator);
    recordActivity("activityExported", { count: visibleCountries.length });
  });
  update();
  element<HTMLDivElement>("dashboard").hidden = false;
}

async function start(): Promise<void> {
  const requestedLanguage = new URLSearchParams(window.location.search).get("lang");
  language = requestedLanguage === "es" || requestedLanguage === "fr" ? requestedLanguage : "en";
  document.documentElement.lang = language;
  document.title = message("appTitle");
  element<HTMLDivElement>("status").textContent = message("loading");
  try {
    const response = await fetch("/data/gdp_data.csv");
    if (!response.ok) throw new Error(`The GDP dataset request failed (${response.status})`);
    const [snapshotResponse, mapResponse] = await Promise.all([
      fetch("/data/world_bank_indicators.json"),
      fetch("/data/world_countries.geojson"),
    ]);
    if (!snapshotResponse.ok || !mapResponse.ok) {
      throw new Error(message("missingSnapshots"));
    }
    const [snapshot, mapData] = await Promise.all([
      snapshotResponse.json() as Promise<IndicatorSnapshot>,
      mapResponse.json() as Promise<MapData>,
    ]);
    snapshotMetadata = { source: snapshot.source, updatedAt: snapshot.updatedAt };
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
    status.textContent = error instanceof Error ? error.message : message("unableToLoad");
  }
}

void start();
