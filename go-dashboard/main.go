package main

import (
	"bytes"
	"container/list"
	"encoding/csv"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"html/template"
	"io"
	"log"
	"math"
	"net/http"
	"os"
	"sort"
	"strconv"
	"strings"
	"sync"
)

var appVersion = "1.5.0"

type Country struct {
	Code         string
	Name         string
	GDP          []float64
	GDPPerCapita []float64
	RealGDP      []float64
	Region       string
	IncomeLevel  string
}

type Dataset struct {
	Countries         []Country
	ByCode            map[string]Country
	Years             []int
	YearIndex         map[int]int
	Map               []mapCountry
	SnapshotSource    string
	SnapshotUpdatedAt string
}

type indicatorCountry struct {
	Code         string             `json:"code"`
	Region       string             `json:"region"`
	IncomeLevel  string             `json:"incomeLevel"`
	GDPPerCapita map[string]float64 `json:"gdpPerCapita"`
	RealGDP      map[string]float64 `json:"realGDP"`
}

type indicatorSnapshot struct {
	Source    string             `json:"source"`
	UpdatedAt string             `json:"updatedAt"`
	Countries []indicatorCountry `json:"countries"`
}

type geoCollection struct {
	Features []geoFeature `json:"features"`
}

type geoFeature struct {
	Properties map[string]any `json:"properties"`
	Geometry   struct {
		Type        string          `json:"type"`
		Coordinates json.RawMessage `json:"coordinates"`
	} `json:"geometry"`
}

type mapCountry struct {
	Code  string
	Path  string
	Fill  string
	Title string
}

type chartSeries struct {
	Code   string
	Color  string
	Points string
}

type chartPoint struct {
	Year  int
	Value float64
}

type pointBucket struct {
	Min chartPoint
	Max chartPoint
	Has bool
}

type countryOption struct {
	Code     string
	Name     string
	Selected bool
}

type filterOption struct {
	Value    string
	Selected bool
}

type metric struct {
	Code   string
	Value  string
	Growth string
}

type rankingRow struct {
	Rank  int
	Code  string
	Name  string
	Value string
}

type annualGrowthRow struct {
	Code   string
	Name   string
	Growth string
}

type growthTrendRow struct {
	Code   string
	Name   string
	Values []string
}

type cumulativeGrowthRow struct {
	Code   string
	Name   string
	Change string
}

type coverageRow struct {
	Code     string
	Name     string
	Observed string
	Rate     string
	Missing  string
}

type gridLine struct {
	Y     float64
	Label string
}

type yearLabel struct {
	X    float64
	Year int
}

type pageData struct {
	From                 int
	To                   int
	MinYear              int
	MaxYear              int
	Countries            []countryOption
	Series               []chartSeries
	Metrics              []metric
	Grid                 []gridLine
	YearLabels           []yearLabel
	Empty                bool
	Rankings             []rankingRow
	GrowthRows           []annualGrowthRow
	GrowthYears          []int
	GrowthTrendRows      []growthTrendRow
	CumulativeGrowthRows []cumulativeGrowthRow
	CoverageRows         []coverageRow
	DataSource           string
	DataUpdatedAt        string
	SelectedCountryCount int
	Indicator            string
	IndicatorLabel       string
	Language             string
	Text                 uiText
	ChartHeading         string
	ChartAlt             string
	MetricsHeading       string
	RankingsHeading      string
	GrowthHeading        string
	CumulativeHeading    string
	CoverageHeading      string
	MapHeading           string
	MapAlt               string
	Region               string
	IncomeGroup          string
	Regions              []filterOption
	IncomeGroups         []filterOption
	MapCountries         []mapCountry
	Comparisons          []comparisonRow
}

type uiText struct {
	AppTitle           string
	Intro              string
	SourceName         string
	Language           string
	Indicator          string
	GDP                string
	GDPPerCapita       string
	RealGDP            string
	Region             string
	AllRegions         string
	IncomeGroup        string
	AllIncomeGroups    string
	Years              string
	From               string
	To                 string
	Countries          string
	CountryHint        string
	Update             string
	NoDataSelection    string
	ChartAlt           string
	ChartHeading       string
	MetricsHeading     string
	RankingsHeading    string
	GrowthHeading      string
	AnnualGrowthHint   string
	GrowthUnavailable  string
	GrowthTrend        string
	GrowthTrendHint    string
	CumulativeGrowth   string
	CumulativeHint     string
	CoverageHeading    string
	CoverageHint       string
	CoverageObserved   string
	CoverageRate       string
	CoverageMissing    string
	NoMissingYears     string
	Services           string
	ServiceReady       string
	ServiceSource      string
	ServiceUpdated     string
	ActivityHeading    string
	ActivityPrivacy    string
	ActivityLoaded     string
	ActivityIndicator  string
	ActivityRange      string
	ActivityFilters    string
	ActivityCountries  string
	ActivityExported   string
	PreferencesHeading string
	SaveView           string
	RestoreView        string
	ClearView          string
	ViewSaved          string
	ViewCleared        string
	NoSavedView        string
	PreferencesError   string
	PreferencesPrivacy string
	Rank               string
	Country            string
	CountryName        string
	CountryCode        string
	Year               string
	Value              string
	Growth             string
	NoValuesForYear    string
	SelectCountry      string
	Unavailable        string
	ExportCSV          string
	MapHeading         string
	MapAlt             string
	MapTooltip         string
	MapScaleHint       string
	Lower              string
	Middle             string
	Higher             string
	NoData             string
	Comparisons        string
	ComparisonHint     string
	Group              string
	Average            string
	CountriesCount     string
	MissingMapData     string
}

func translationsFor(language string) uiText {
	switch language {
	case "es":
		return uiText{
			AppTitle: "Panel del PIB", Intro: "Explora indicadores económicos de",
			SourceName: "Datos abiertos del Banco Mundial", Language: "Idioma",
			Indicator: "Indicador", GDP: "PIB (US$ actuales)",
			GDPPerCapita: "PIB per cápita (US$ actuales)", RealGDP: "PIB real (US$ constantes de 2015)",
			Region: "Región", AllRegions: "Todas las regiones",
			IncomeGroup: "Grupo de ingresos", AllIncomeGroups: "Todos los grupos de ingresos",
			Years: "Años", From: "Desde", To: "Hasta", Countries: "Países",
			CountryHint: "Los filtros limitan la lista de países, el mapa y los promedios por grupo. Usa Ctrl (Windows/Linux) o ⌘ (Mac) para seleccionar varios países.",
			Update:      "Actualizar panel", NoDataSelection: "No hay datos disponibles para esta selección.",
			ChartAlt:         "Valores de {indicator} desde {from} hasta {to}",
			ChartHeading:     "{indicator} a lo largo del tiempo",
			MetricsHeading:   "{indicator} en {year}",
			RankingsHeading:  "Clasificación de {indicator} en {year}",
			GrowthHeading:    "Crecimiento anual de {indicator} en {year}",
			AnnualGrowthHint: "Cambio porcentual interanual; el valor del año anterior es el denominador.",
			GrowthTrend:      "Tendencia del crecimiento interanual",
			GrowthTrendHint:  "Cada columna muestra la variación porcentual anual respecto al año calendario anterior.",
			CumulativeGrowth: "Variación acumulada ({from}–{to})",
			CumulativeHint:   "Cambio porcentual desde el año inicial hasta el año final, usando el valor del año inicial como denominador.",
			CoverageHeading:  "Auditoría de cobertura ({from}–{to})",
			CoverageHint:     "Muestra las observaciones disponibles del indicador seleccionado. La cobertura indica disponibilidad, no calidad de los datos.",
			CoverageObserved: "Años observados / totales", CoverageRate: "Cobertura",
			CoverageMissing: "Años sin datos", NoMissingYears: "Ninguno",
			Services: "Servicios de datos", ServiceReady: "El servicio de datos del panel está disponible.",
			ServiceSource: "Fuente", ServiceUpdated: "Última actualización de la instantánea",
			ActivityHeading:    "Actividad en directo",
			ActivityPrivacy:    "Las acciones recientes solo se guardan en esta página; no se envían datos de uso.",
			ActivityLoaded:     "Panel listo: {indicator}, {from}–{to}, {count} países.",
			ActivityIndicator:  "Indicador cambiado a {indicator}.",
			ActivityRange:      "Intervalo de años cambiado a {from}–{to}.",
			ActivityFilters:    "Filtro de región o ingresos cambiado.",
			ActivityCountries:  "Selección de países cambiada ({count} países).",
			ActivityExported:   "CSV exportado para {count} países.",
			PreferencesHeading: "Personaliza tu vista",
			SaveView:           "Guardar esta vista en este dispositivo",
			RestoreView:        "Restaurar vista guardada",
			ClearView:          "Borrar vista guardada",
			ViewSaved:          "Vista del panel guardada en este dispositivo.",
			ViewCleared:        "Vista guardada borrada de este dispositivo.",
			NoSavedView:        "No hay una vista guardada en este dispositivo.",
			PreferencesError:   "No se puede acceder a las vistas guardadas en este navegador.",
			PreferencesPrivacy: "La vista se guarda en este navegador e incluye solo idioma, indicador, filtros, países y años.",
			GrowthUnavailable:  "Crecimiento no disponible", Rank: "Posición", Country: "País",
			CountryName: "Nombre del país", CountryCode: "Código del país", Year: "Año", Value: "Valor",
			Growth: "Crecimiento", NoValuesForYear: "No hay valores disponibles para este año.",
			SelectCountry: "Selecciona al menos un país.", Unavailable: "No disponible",
			ExportCSV: "Exportar datos visibles como CSV", MapHeading: "Mapa mundial: {indicator} en {year}",
			MapAlt: "Mapa mundial de {indicator} en {year}", Lower: "Más bajo", Middle: "Intermedio",
			MapTooltip:   "{country}: {value} ({year})",
			MapScaleHint: "Los valores se agrupan en quintiles.",
			Higher:       "Más alto", NoData: "Sin datos",
			Comparisons:    "Comparaciones por región y grupo de ingresos",
			ComparisonHint: "Los promedios incluyen países que coinciden con los filtros y tienen datos del indicador y año seleccionados.",
			Group:          "Grupo", Average: "Promedio", CountriesCount: "Países",
			MissingMapData: "Ejecuta scripts/refresh-dashboard-data.mjs para cargar los datos del mapa.",
		}
	case "fr":
		return uiText{
			AppTitle: "Tableau de bord du PIB", Intro: "Explorez les indicateurs économiques de",
			SourceName: "Données ouvertes de la Banque mondiale", Language: "Langue",
			Indicator: "Indicateur", GDP: "PIB (USD courants)",
			GDPPerCapita: "PIB par habitant (USD courants)", RealGDP: "PIB réel (USD constants de 2015)",
			Region: "Région", AllRegions: "Toutes les régions",
			IncomeGroup: "Groupe de revenu", AllIncomeGroups: "Tous les groupes de revenu",
			Years: "Années", From: "De", To: "À", Countries: "Pays",
			CountryHint: "Les filtres réduisent la liste des pays, la carte et les moyennes par groupe. Utilisez Ctrl (Windows/Linux) ou ⌘ (Mac) pour sélectionner plusieurs pays.",
			Update:      "Actualiser le tableau", NoDataSelection: "Aucune donnée disponible pour cette sélection.",
			ChartAlt:         "Valeurs du {indicator} de {from} à {to}",
			ChartHeading:     "{indicator} au fil du temps",
			MetricsHeading:   "{indicator} en {year}",
			RankingsHeading:  "Classement du {indicator} en {year}",
			GrowthHeading:    "Croissance annuelle du {indicator} en {year}",
			AnnualGrowthHint: "Variation en pourcentage d'une année à l'autre ; la valeur de l'année précédente est le dénominateur.",
			GrowthTrend:      "Tendance de la croissance annuelle",
			GrowthTrendHint:  "Chaque colonne indique la variation annuelle en pourcentage par rapport à l'année civile précédente.",
			CumulativeGrowth: "Variation cumulée ({from}–{to})",
			CumulativeHint:   "Variation en pourcentage entre les années de début et de fin, avec la valeur de l'année de début comme dénominateur.",
			CoverageHeading:  "Audit de couverture ({from}–{to})",
			CoverageHint:     "Affiche les observations disponibles pour l’indicateur choisi. La couverture décrit la disponibilité, pas la qualité des données.",
			CoverageObserved: "Années observées / total", CoverageRate: "Couverture",
			CoverageMissing: "Années manquantes", NoMissingYears: "Aucune",
			Services: "Services de données", ServiceReady: "Le service de données du tableau de bord est disponible.",
			ServiceSource: "Source", ServiceUpdated: "Dernière actualisation de l’instantané",
			ActivityHeading:    "Activité en direct",
			ActivityPrivacy:    "Les actions récentes restent sur cette page ; aucune télémétrie d’utilisation n’est envoyée.",
			ActivityLoaded:     "Tableau prêt : {indicator}, {from}–{to}, {count} pays.",
			ActivityIndicator:  "Indicateur changé : {indicator}.",
			ActivityRange:      "Période changée : {from}–{to}.",
			ActivityFilters:    "Filtre de région ou de revenu modifié.",
			ActivityCountries:  "Sélection des pays modifiée ({count} pays).",
			ActivityExported:   "CSV exporté pour {count} pays.",
			PreferencesHeading: "Personnaliser votre vue",
			SaveView:           "Enregistrer cette vue sur cet appareil",
			RestoreView:        "Restaurer la vue enregistrée",
			ClearView:          "Supprimer la vue enregistrée",
			ViewSaved:          "Vue du tableau de bord enregistrée sur cet appareil.",
			ViewCleared:        "Vue enregistrée supprimée de cet appareil.",
			NoSavedView:        "Aucune vue enregistrée n’est disponible sur cet appareil.",
			PreferencesError:   "Impossible d’accéder aux vues enregistrées dans ce navigateur.",
			PreferencesPrivacy: "La vue reste dans ce navigateur et contient uniquement la langue, l’indicateur, les filtres, les pays et les années.",
			GrowthUnavailable:  "Croissance indisponible", Rank: "Rang", Country: "Pays",
			CountryName: "Nom du pays", CountryCode: "Code du pays", Year: "Année", Value: "Valeur",
			Growth: "Croissance", NoValuesForYear: "Aucune valeur disponible pour cette année.",
			SelectCountry: "Sélectionnez au moins un pays.", Unavailable: "Indisponible",
			ExportCSV: "Exporter les données visibles au format CSV", MapHeading: "Carte du monde : {indicator} en {year}",
			MapAlt: "Carte mondiale du {indicator} en {year}", Lower: "Le plus bas", Middle: "Moyen",
			MapTooltip:   "{country} : {value} ({year})",
			MapScaleHint: "Les valeurs sont réparties en quintiles.",
			Higher:       "Le plus élevé", NoData: "Aucune donnée",
			Comparisons:    "Comparaisons par région et groupe de revenu",
			ComparisonHint: "Les moyennes incluent les pays correspondant aux filtres et disposant de données pour l’indicateur et l’année choisis.",
			Group:          "Groupe", Average: "Moyenne", CountriesCount: "Pays",
			MissingMapData: "Exécutez scripts/refresh-dashboard-data.mjs pour charger les données cartographiques.",
		}
	default:
		return uiText{
			AppTitle: "GDP dashboard", Intro: "Explore economic indicators from",
			SourceName: "World Bank Open Data", Language: "Language",
			Indicator: "Indicator", GDP: "GDP (current US$)",
			GDPPerCapita: "GDP per capita (current US$)", RealGDP: "Real GDP (constant 2015 US$)",
			Region: "Region", AllRegions: "All regions",
			IncomeGroup: "Income group", AllIncomeGroups: "All income groups",
			Years: "Years", From: "From", To: "To", Countries: "Countries",
			CountryHint: "Filters narrow the country list, map, and group averages. Use Ctrl (Windows/Linux) or ⌘ (Mac) to select multiple countries.",
			Update:      "Update dashboard", NoDataSelection: "No data is available for this selection.",
			ChartAlt:         "{indicator} values from {from} through {to}",
			ChartHeading:     "{indicator} over time",
			MetricsHeading:   "{indicator} in {year}",
			RankingsHeading:  "{indicator} rankings in {year}",
			GrowthHeading:    "Annual {indicator} growth for {year}",
			AnnualGrowthHint: "Year-over-year percent change, using the previous year's value as the denominator.",
			GrowthTrend:      "Year-over-year growth trend",
			GrowthTrendHint:  "Each column shows annual percent change for that year, calculated against the previous calendar year.",
			CumulativeGrowth: "Cumulative change ({from}–{to})",
			CumulativeHint:   "Percent change from the selected start year to the end year, using the start-year value as the denominator.",
			CoverageHeading:  "Data coverage audit ({from}–{to})",
			CoverageHint:     "Shows reported observations for the selected indicator. Coverage describes availability, not data quality.",
			CoverageObserved: "Observed / total years", CoverageRate: "Coverage",
			CoverageMissing: "Missing years", NoMissingYears: "None",
			Services: "Data services", ServiceReady: "Dashboard data service is available.",
			ServiceSource: "Source", ServiceUpdated: "Snapshot last refreshed",
			ActivityHeading:    "Live activity",
			ActivityPrivacy:    "Recent actions are kept on this page only; no usage telemetry is sent.",
			ActivityLoaded:     "Dashboard ready: {indicator}, {from}–{to}, {count} countries.",
			ActivityIndicator:  "Indicator changed to {indicator}.",
			ActivityRange:      "Year range changed to {from}–{to}.",
			ActivityFilters:    "Region or income-group filter changed.",
			ActivityCountries:  "Country selection changed ({count} countries).",
			ActivityExported:   "CSV exported for {count} countries.",
			PreferencesHeading: "Personalize your view",
			SaveView:           "Save this view on this device",
			RestoreView:        "Restore saved view",
			ClearView:          "Clear saved view",
			ViewSaved:          "Dashboard view saved on this device.",
			ViewCleared:        "Saved dashboard view cleared from this device.",
			NoSavedView:        "No saved view is available on this device.",
			PreferencesError:   "Unable to access saved views in this browser.",
			PreferencesPrivacy: "Saved view stays in this browser and includes only language, indicator, filters, countries, and years.",
			GrowthUnavailable:  "Growth unavailable", Rank: "Rank", Country: "Country",
			CountryName: "Country Name", CountryCode: "Country Code", Year: "Year", Value: "Value",
			Growth: "Growth", NoValuesForYear: "No values are available for this year.",
			SelectCountry: "Select at least one country.", Unavailable: "Unavailable",
			ExportCSV: "Export visible data as CSV", MapHeading: "World map: {indicator} in {year}",
			MapAlt: "{indicator} world map in {year}", Lower: "Lower", Middle: "Middle",
			MapTooltip:   "{country}: {value} ({year})",
			MapScaleHint: "Values use quintile buckets.",
			Higher:       "Higher", NoData: "No data",
			Comparisons:    "Regional and income-group comparisons",
			ComparisonHint: "Averages include countries matching the selected filters and with reported values for the selected indicator and year.",
			Group:          "Group", Average: "Average", CountriesCount: "Countries",
			MissingMapData: "Run scripts/refresh-dashboard-data.mjs to load map and indicator data.",
		}
	}
}

type comparisonRow struct {
	Group   string
	Average string
	Count   int
}

type cachedPage struct {
	key  string
	body []byte
}

type pageCache struct {
	mu         sync.Mutex
	capacity   int
	maxBytes   int
	totalBytes int
	entries    map[string]*list.Element
	order      *list.List
}

func newPageCache(capacity int) *pageCache {
	if capacity < 1 {
		capacity = 1
	}
	return &pageCache{
		capacity: capacity,
		maxBytes: 32 << 20,
		entries:  make(map[string]*list.Element, capacity),
		order:    list.New(),
	}
}

func (cache *pageCache) get(key string) ([]byte, bool) {
	cache.mu.Lock()
	defer cache.mu.Unlock()
	element := cache.entries[key]
	if element == nil {
		return nil, false
	}
	cache.order.MoveToFront(element)
	return element.Value.(cachedPage).body, true
}

func (cache *pageCache) put(key string, body []byte) {
	cache.mu.Lock()
	defer cache.mu.Unlock()
	size := len(key) + len(body)
	if size > cache.maxBytes {
		return
	}
	if element := cache.entries[key]; element != nil {
		entry := element.Value.(cachedPage)
		cache.totalBytes -= len(entry.key) + len(entry.body)
		element.Value = cachedPage{key: key, body: body}
		cache.totalBytes += size
		cache.order.MoveToFront(element)
		return
	}
	element := cache.order.PushFront(cachedPage{key: key, body: body})
	cache.entries[key] = element
	cache.totalBytes += size
	for cache.order.Len() > cache.capacity || cache.totalBytes > cache.maxBytes {
		oldest := cache.order.Back()
		entry := oldest.Value.(cachedPage)
		cache.totalBytes -= len(entry.key) + len(entry.body)
		delete(cache.entries, entry.key)
		cache.order.Remove(oldest)
	}
}

const pageTemplate = `<!doctype html>
<html lang="{{.Language}}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{.Text.AppTitle}} — Go</title>
  <style>
    :root{font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#172033;background:#f5f7fb;font-synthesis:none}
    *{box-sizing:border-box}body{margin:0}main{max-width:1160px;margin:0 auto;padding:40px 24px 64px}
    h1{margin:0;font-size:clamp(2rem,5vw,3rem);letter-spacing:-.04em}.intro{color:#647087;line-height:1.6;margin:12px 0 28px;max-width:720px}
    .panel{background:#fff;border:1px solid #e4e9f1;border-radius:16px;padding:22px;box-shadow:0 8px 26px #16244308}
    .controls{display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;align-items:start}
    label,.control-title{font-weight:650;font-size:.94rem}.years{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}
    .year-field{display:grid;gap:6px;color:#59667d;font-size:.84rem}input[type=number]{width:100%;padding:8px;border:1px solid #d5dce7;border-radius:8px}
    select{width:100%;min-height:142px;margin-top:10px;padding:8px;border:1px solid #d5dce7;border-radius:9px;color:inherit;background:#fff}select:not([multiple]){min-height:44px}
    .hint{margin:7px 0 0;color:#738097;font-size:.8rem}button{margin-top:16px;padding:10px 18px;border:0;border-radius:8px;background:#3764d8;color:white;font:inherit;font-weight:650;cursor:pointer}
    h2{font-size:1.2rem;margin:32px 0 14px;letter-spacing:-.015em}.chart-wrap{overflow-x:auto}svg{display:block;width:100%;min-width:560px;height:auto}
    .grid-line{stroke:#e8edf4;stroke-width:1}.axis-label{fill:#758198;font-size:12px}.series-line{fill:none;stroke-width:2.5;stroke-linejoin:round;stroke-linecap:round}
    .legend{display:flex;gap:12px 20px;flex-wrap:wrap;margin-top:12px;color:#49556b;font-size:.85rem}.legend-item{display:inline-flex;gap:7px;align-items:center}
    .swatch{width:10px;height:10px;border-radius:50%}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}
    .metric{padding:16px;border:1px solid #e4e9f1;border-radius:12px}.metric-code{color:#657187;font-size:.84rem;font-weight:650}
    .metric-value{margin-top:8px;font-size:1.45rem;font-weight:720;letter-spacing:-.03em}.metric-growth{margin-top:4px;color:#18835b;font-size:.83rem}
    .actions{display:flex;justify-content:flex-end;margin:18px 0 0}.export-button{display:inline-block;border:0;border-radius:8px;background:#3764d8;color:white;padding:10px 15px;font:inherit;font-weight:650;text-decoration:none}
    .two-column{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}.activity-feed{margin:12px 0 0;padding-left:22px;color:#49556b}.activity-feed li{padding:5px 0}table{width:100%;border-collapse:collapse}
    th,td{padding:10px 12px;border-bottom:1px solid #edf1f6;text-align:left}th{color:#657187;font-size:.82rem}td.numeric,th.numeric{text-align:right;font-variant-numeric:tabular-nums}.missing{color:#78849a}
    .empty{color:#758198;text-align:center;padding:44px 12px}@media(max-width:680px){main{padding:28px 16px 48px}.controls{grid-template-columns:1fr}.panel{padding:17px}}
  </style>
</head>
<body><main>
  <h1>🌍 {{.Text.AppTitle}}</h1>
  <p class="intro">{{.Text.Intro}} <a href="https://data.worldbank.org/">{{.Text.SourceName}}</a>.</p>
  <form method="get" class="panel controls">
    <div><label for="language">{{.Text.Language}}</label><select id="language" name="language">
      <option value="en" {{if eq .Language "en"}}selected{{end}}>English</option>
      <option value="es" {{if eq .Language "es"}}selected{{end}}>Español</option>
      <option value="fr" {{if eq .Language "fr"}}selected{{end}}>Français</option>
    </select></div>
    <div><label for="indicator">{{.Text.Indicator}}</label><select id="indicator" name="indicator">
      <option value="gdp" {{if eq .Indicator "gdp"}}selected{{end}}>{{.Text.GDP}}</option>
      <option value="gdpPerCapita" {{if eq .Indicator "gdpPerCapita"}}selected{{end}}>{{.Text.GDPPerCapita}}</option>
      <option value="realGDP" {{if eq .Indicator "realGDP"}}selected{{end}}>{{.Text.RealGDP}}</option>
    </select></div>
    <div><label for="region">{{.Text.Region}}</label><select id="region" name="region">
      <option value="">{{.Text.AllRegions}}</option>
      {{range .Regions}}<option value="{{.Value}}" {{if .Selected}}selected{{end}}>{{.Value}}</option>{{end}}
    </select></div>
    <div><label for="income">{{.Text.IncomeGroup}}</label><select id="income" name="income">
      <option value="">{{.Text.AllIncomeGroups}}</option>
      {{range .IncomeGroups}}<option value="{{.Value}}" {{if .Selected}}selected{{end}}>{{.Value}}</option>{{end}}
    </select></div>
    <div><div class="control-title">{{.Text.Years}}</div><div class="years">
      <label class="year-field" for="from">{{.Text.From}}<input id="from" name="from" type="number" min="{{.MinYear}}" max="{{.MaxYear}}" value="{{.From}}"></label>
      <label class="year-field" for="to">{{.Text.To}}<input id="to" name="to" type="number" min="{{.MinYear}}" max="{{.MaxYear}}" value="{{.To}}"></label>
    </div></div>
    <div><label for="countries">{{.Text.Countries}}</label>
      <input type="hidden" name="countriesSelected" value="1">
      <select id="countries" name="country" multiple aria-describedby="country-hint">
        {{range .Countries}}<option value="{{.Code}}" {{if .Selected}}selected{{end}}>{{.Code}} — {{.Name}}</option>{{end}}
      </select>
      <p class="hint" id="country-hint">{{.Text.CountryHint}}</p>
      <button type="submit">{{.Text.Update}}</button>
    </div>
  </form>
  <div class="two-column">
    <section class="panel" aria-labelledby="services-heading"><h2 id="services-heading">{{.Text.Services}}</h2>
      <p role="status">{{.Text.ServiceReady}}</p>
      <p class="hint">{{.Text.ServiceSource}}: {{if .DataSource}}{{.DataSource}}{{else}}{{.Text.SourceName}}{{end}}</p>
      <p class="hint">{{.Text.ServiceUpdated}}: <time>{{if .DataUpdatedAt}}{{.DataUpdatedAt}}{{else}}{{.Text.Unavailable}}{{end}}</time></p>
    </section>
    <section class="panel" aria-labelledby="activity-heading"><h2 id="activity-heading">{{.Text.ActivityHeading}}</h2>
      <p class="hint">{{.Text.ActivityPrivacy}}</p>
      <ol id="activity-feed" class="activity-feed" aria-live="polite" aria-relevant="additions"
        data-loaded="{{.Text.ActivityLoaded}}" data-indicator="{{.Text.ActivityIndicator}}"
        data-range="{{.Text.ActivityRange}}" data-filters="{{.Text.ActivityFilters}}"
        data-countries="{{.Text.ActivityCountries}}" data-exported="{{.Text.ActivityExported}}"
        data-indicator-label="{{.IndicatorLabel}}" data-from="{{.From}}" data-to="{{.To}}"
        data-count="{{.SelectedCountryCount}}"></ol>
    </section>
    <section class="panel" aria-labelledby="preferences-heading">
      <h2 id="preferences-heading">{{.Text.PreferencesHeading}}</h2>
      <p class="hint">{{.Text.PreferencesPrivacy}}</p>
      <div class="actions">
        <button id="save-view" data-saved="{{.Text.ViewSaved}}" data-error="{{.Text.PreferencesError}}" type="button">{{.Text.SaveView}}</button>
        <button id="restore-view" data-empty="{{.Text.NoSavedView}}" type="button">{{.Text.RestoreView}}</button>
        <button id="clear-view" data-cleared="{{.Text.ViewCleared}}" data-error="{{.Text.PreferencesError}}" type="button">{{.Text.ClearView}}</button>
      </div>
      <p id="preferences-status" class="hint" role="status" aria-live="polite"></p>
    </section>
  </div>
  <h2>{{.ChartHeading}}</h2><section class="panel chart-wrap">
    {{if .Empty}}<p class="empty">{{.Text.NoDataSelection}}</p>{{else}}
    <svg viewBox="0 0 1000 390" role="img" aria-label="{{.ChartAlt}}">
      {{range .Grid}}<line class="grid-line" x1="76" x2="982" y1="{{.Y}}" y2="{{.Y}}"></line><text class="axis-label" x="66" y="{{add .Y 4}}" text-anchor="end">{{.Label}}</text>{{end}}
      {{range .YearLabels}}<text class="axis-label" x="{{.X}}" y="378" text-anchor="middle">{{.Year}}</text>{{end}}
      {{range .Series}}<polyline class="series-line" stroke="{{.Color}}" points="{{.Points}}"></polyline>{{end}}
    </svg>
    <div class="legend">{{range .Series}}<span class="legend-item"><span class="swatch" style="background:{{.Color}}" aria-hidden="true"></span>{{.Code}}</span>{{end}}</div>
    {{end}}
  </section>
  <h2>{{.MetricsHeading}}</h2><div class="metrics">{{range .Metrics}}
    <article class="metric"><div class="metric-code">{{.Code}} {{$.IndicatorLabel}}</div><div class="metric-value">{{.Value}}</div><div class="metric-growth">{{.Growth}}</div></article>
  {{end}}</div>
  <div class="actions"><a class="export-button" href="/export.csv?from={{.From}}&to={{.To}}&amp;indicator={{.Indicator}}&amp;region={{.Region}}&amp;income={{.IncomeGroup}}&amp;language={{.Language}}{{range .Countries}}{{if .Selected}}&amp;country={{.Code}}{{end}}{{end}}">{{.Text.ExportCSV}}</a></div>
  <div class="two-column">
    <section><h2>{{.RankingsHeading}}</h2><div class="panel"><table><thead><tr><th>{{.Text.Rank}}</th><th>{{.Text.Country}}</th><th class="numeric">{{.Text.Value}}</th></tr></thead><tbody>
      {{range .Rankings}}<tr><td>{{.Rank}}</td><td>{{.Code}} — {{.Name}}</td><td class="numeric">{{.Value}}</td></tr>{{else}}<tr><td colspan="3" class="missing">{{$.Text.NoValuesForYear}}</td></tr>{{end}}
    </tbody></table></div></section>
    <section><h2>{{.GrowthHeading}}</h2><p class="hint">{{.Text.AnnualGrowthHint}}</p><div class="panel"><table><thead><tr><th>{{.Text.Country}}</th><th class="numeric">{{.Text.Growth}}</th></tr></thead><tbody>
      {{range .GrowthRows}}<tr><td>{{.Code}} — {{.Name}}</td><td class="numeric {{if eq .Growth $.Text.Unavailable}}missing{{end}}">{{.Growth}}</td></tr>{{else}}<tr><td colspan="2" class="missing">{{$.Text.SelectCountry}}</td></tr>{{end}}
    </tbody></table></div></section>
  </div>
  <h2>{{.Text.GrowthTrend}}</h2><p class="hint">{{.Text.GrowthTrendHint}}</p>
  <div class="panel chart-wrap"><table><thead><tr><th>{{.Text.Country}}</th>{{range .GrowthYears}}<th class="numeric">{{.}}</th>{{end}}</tr></thead><tbody>
    {{range .GrowthTrendRows}}<tr><td>{{.Code}} — {{.Name}}</td>{{range .Values}}<td class="numeric {{if eq . $.Text.Unavailable}}missing{{end}}">{{.}}</td>{{end}}</tr>{{else}}<tr><td class="missing">{{.Text.SelectCountry}}</td></tr>{{end}}
  </tbody></table></div>
  <h2>{{.CumulativeHeading}}</h2><p class="hint">{{.Text.CumulativeHint}}</p>
  <div class="panel"><table><thead><tr><th>{{.Text.Country}}</th><th class="numeric">{{.Text.Growth}}</th></tr></thead><tbody>
    {{range .CumulativeGrowthRows}}<tr><td>{{.Code}} — {{.Name}}</td><td class="numeric {{if eq .Change $.Text.Unavailable}}missing{{end}}">{{.Change}}</td></tr>{{else}}<tr><td class="missing">{{.Text.SelectCountry}}</td></tr>{{end}}
  </tbody></table></div>
  <h2>{{.CoverageHeading}}</h2><p class="hint">{{.Text.CoverageHint}}</p>
  <div class="panel"><table><thead><tr><th>{{.Text.Country}}</th><th class="numeric">{{.Text.CoverageObserved}}</th><th class="numeric">{{.Text.CoverageRate}}</th><th>{{.Text.CoverageMissing}}</th></tr></thead><tbody>
    {{range .CoverageRows}}<tr><td>{{.Code}} — {{.Name}}</td><td class="numeric">{{.Observed}}</td><td class="numeric">{{.Rate}}</td><td>{{.Missing}}</td></tr>{{else}}<tr><td colspan="4" class="missing">{{.Text.SelectCountry}}</td></tr>{{end}}
  </tbody></table></div>
  <h2>{{.MapHeading}}</h2><section class="panel chart-wrap"><svg viewBox="0 0 1000 500" role="img" aria-label="{{.MapAlt}}">
    {{range .MapCountries}}<path d="{{.Path}}" fill="{{.Fill}}" stroke="#fff" stroke-width="0.7"><title>{{.Title}}</title></path>{{else}}<text x="500" y="250" text-anchor="middle" fill="#758198">{{.Text.MissingMapData}}</text>{{end}}
  </svg><div class="legend"><span>{{.Text.Lower}}</span><span style="color:#6f9ed6">{{.Text.Middle}}</span><span style="color:#203f92">{{.Text.Higher}}</span><span style="color:#9aa3b0">{{.Text.NoData}}</span><span>{{.Text.MapScaleHint}}</span></div></section>
  <h2>{{.Text.Comparisons}}</h2><p class="hint">{{.Text.ComparisonHint}}</p>
  <section class="panel"><table><thead><tr><th>{{.Text.Group}}</th><th class="numeric">{{.Text.Average}}</th><th class="numeric">{{.Text.CountriesCount}}</th></tr></thead><tbody>
    {{range .Comparisons}}<tr><td>{{.Group}}</td><td class="numeric">{{.Average}}</td><td class="numeric">{{.Count}}</td></tr>{{else}}<tr><td colspan="3" class="missing">{{$.Text.NoValuesForYear}}</td></tr>{{end}}
  </tbody></table></section>
  <script>
    const feed = document.getElementById("activity-feed");
    const preferenceStatus = document.getElementById("preferences-status");
    const preferenceKey = "gdp-dashboard:saved-view:v1";
    const entries = [];
    function addActivity(template, values = {}) {
      const text = Object.entries(values).reduce((result, [key, value]) =>
        result.replaceAll("{" + key + "}", String(value)), template);
      entries.unshift(text);
      entries.length = Math.min(entries.length, 8);
      feed.replaceChildren(...entries.map((entry) => {
        const item = document.createElement("li");
        item.textContent = entry;
        return item;
      }));
    }
    const selectedCount = () => document.getElementById("countries").selectedOptions.length;
    addActivity(feed.dataset.loaded, {
      indicator: feed.dataset.indicatorLabel, from: feed.dataset.from,
      to: feed.dataset.to, count: feed.dataset.count
    });
    document.getElementById("from").addEventListener("input", updateRange);
    document.getElementById("to").addEventListener("input", updateRange);
    function updateRange() {
      addActivity(feed.dataset.range, {
        from: document.getElementById("from").value, to: document.getElementById("to").value
      });
    }
    document.getElementById("indicator").addEventListener("change", (event) =>
      addActivity(feed.dataset.indicator, { indicator: event.target.selectedOptions[0].textContent }));
    document.getElementById("countries").addEventListener("change", () =>
      addActivity(feed.dataset.countries, { count: selectedCount() }));
    for (const id of ["region", "income"]) {
      document.getElementById(id).addEventListener("change", () => addActivity(feed.dataset.filters));
    }
    document.querySelector("a.export-button").addEventListener("click", () =>
      addActivity(feed.dataset.exported, { count: selectedCount() }));
    document.getElementById("save-view").addEventListener("click", () => {
      try {
        const savedQuery = new URLSearchParams(new FormData(document.querySelector("form")));
        localStorage.setItem(preferenceKey, savedQuery.toString());
        preferenceStatus.textContent = document.getElementById("save-view").dataset.saved;
      } catch {
        preferenceStatus.textContent = document.getElementById("save-view").dataset.error;
      }
    });
    document.getElementById("restore-view").addEventListener("click", () => {
      try {
        const savedQuery = localStorage.getItem(preferenceKey);
        if (!savedQuery) {
          preferenceStatus.textContent = document.getElementById("restore-view").dataset.empty;
          return;
        }
        if (savedQuery.length > 8192) {
          preferenceStatus.textContent = document.getElementById("save-view").dataset.error;
          return;
        }
        location.search = savedQuery;
      } catch {
        preferenceStatus.textContent = document.getElementById("save-view").dataset.error;
      }
    });
    document.getElementById("clear-view").addEventListener("click", () => {
      try {
        localStorage.removeItem(preferenceKey);
        preferenceStatus.textContent = document.getElementById("clear-view").dataset.cleared;
      } catch {
        preferenceStatus.textContent = document.getElementById("clear-view").dataset.error;
      }
    });
  </script>
</main></body></html>`

func loadDataset(source io.Reader) (*Dataset, error) {
	reader := csv.NewReader(source)
	reader.FieldsPerRecord = -1
	reader.ReuseRecord = true
	header, err := reader.Read()
	if err != nil {
		return nil, fmt.Errorf("read GDP CSV header: %w", err)
	}
	nameIndex, codeIndex := -1, -1
	yearColumns := make([]struct {
		year  int
		index int
	}, 0, len(header))
	for index, column := range header {
		switch strings.TrimSpace(column) {
		case "Country Name":
			nameIndex = index
		case "Country Code":
			codeIndex = index
		}
		if year, parseErr := strconv.Atoi(strings.TrimSpace(column)); parseErr == nil && year >= 1900 {
			yearColumns = append(yearColumns, struct {
				year  int
				index int
			}{year: year, index: index})
		}
	}
	sort.Slice(yearColumns, func(i, j int) bool {
		return yearColumns[i].year < yearColumns[j].year
	})
	if nameIndex < 0 || codeIndex < 0 || len(yearColumns) == 0 {
		return nil, errors.New("GDP CSV is missing the expected World Bank columns")
	}

	dataset := &Dataset{
		ByCode:    make(map[string]Country),
		Years:     make([]int, 0, len(yearColumns)),
		YearIndex: make(map[int]int, len(yearColumns)),
	}
	for index, column := range yearColumns {
		dataset.Years = append(dataset.Years, column.year)
		dataset.YearIndex[column.year] = index
	}
	for {
		record, readErr := reader.Read()
		if readErr == io.EOF {
			break
		}
		if readErr != nil {
			return nil, fmt.Errorf("read GDP CSV row: %w", readErr)
		}
		if len(record) <= maxIndex(nameIndex, codeIndex) {
			continue
		}
		code := strings.TrimSpace(record[codeIndex])
		if code == "" {
			continue
		}
		country := Country{Code: code, Name: record[nameIndex], GDP: make([]float64, len(yearColumns))}
		for index := range country.GDP {
			country.GDP[index] = math.NaN()
		}
		for _, column := range yearColumns {
			if column.index >= len(record) || strings.TrimSpace(record[column.index]) == "" {
				continue
			}
			value, parseErr := strconv.ParseFloat(strings.TrimSpace(record[column.index]), 64)
			if parseErr == nil && !math.IsNaN(value) && !math.IsInf(value, 0) {
				country.GDP[dataset.YearIndex[column.year]] = value
			}
		}
		dataset.ByCode[code] = country
	}

	dataset.Countries = make([]Country, 0, len(dataset.ByCode))
	for _, country := range dataset.ByCode {
		dataset.Countries = append(dataset.Countries, country)
	}
	sort.Slice(dataset.Countries, func(i, j int) bool {
		return dataset.Countries[i].Code < dataset.Countries[j].Code
	})
	return dataset, nil
}

func loadIndicatorData(dataset *Dataset, snapshotSource, mapSource io.Reader) error {
	var snapshot indicatorSnapshot
	if err := json.NewDecoder(snapshotSource).Decode(&snapshot); err != nil {
		return fmt.Errorf("decode World Bank indicator snapshot: %w", err)
	}
	dataset.SnapshotSource = snapshot.Source
	dataset.SnapshotUpdatedAt = snapshot.UpdatedAt
	metadata := make(map[string]indicatorCountry, len(snapshot.Countries))
	for _, entry := range snapshot.Countries {
		metadata[entry.Code] = entry
	}
	for index := range dataset.Countries {
		country := &dataset.Countries[index]
		entry := metadata[country.Code]
		country.GDPPerCapita = make([]float64, len(dataset.Years))
		country.RealGDP = make([]float64, len(dataset.Years))
		for yearIndex, year := range dataset.Years {
			country.GDPPerCapita[yearIndex] = math.NaN()
			country.RealGDP[yearIndex] = math.NaN()
			if value, ok := entry.GDPPerCapita[strconv.Itoa(year)]; ok && !math.IsNaN(value) && !math.IsInf(value, 0) {
				country.GDPPerCapita[yearIndex] = value
			}
			if value, ok := entry.RealGDP[strconv.Itoa(year)]; ok && !math.IsNaN(value) && !math.IsInf(value, 0) {
				country.RealGDP[yearIndex] = value
			}
		}
		country.Region, country.IncomeLevel = strings.TrimSpace(entry.Region), strings.TrimSpace(entry.IncomeLevel)
		dataset.ByCode[country.Code] = *country
	}
	var boundaries geoCollection
	if err := json.NewDecoder(mapSource).Decode(&boundaries); err != nil {
		return fmt.Errorf("decode Natural Earth country boundaries: %w", err)
	}
	if len(boundaries.Features) < 100 {
		return errors.New("Natural Earth country boundaries are incomplete")
	}
	dataset.Map = make([]mapCountry, 0, len(boundaries.Features))
	for _, feature := range boundaries.Features {
		code := geoProperty(feature, "ISO_A3_EH")
		if code == "" || code == "-99" {
			code = geoProperty(feature, "ADM0_A3")
		}
		if code == "" || code == "-99" {
			code = geoProperty(feature, "ISO_A3")
		}
		if code == "" || code == "-99" || feature.Geometry.Type == "" {
			continue
		}
		pathData, err := geoJSONPath(feature.Geometry.Coordinates)
		if err != nil {
			return fmt.Errorf("parse Natural Earth geometry for %s: %w", code, err)
		}
		dataset.Map = append(dataset.Map, mapCountry{
			Code:  code,
			Path:  pathData,
			Title: geoProperty(feature, "ADMIN"),
		})
	}
	if len(dataset.Map) == 0 {
		return errors.New("Natural Earth country boundaries contain no usable country codes")
	}
	return nil
}

func geoProperty(feature geoFeature, key string) string {
	value, _ := feature.Properties[key].(string)
	return value
}

func geoJSONPath(raw json.RawMessage) (string, error) {
	var coordinates any
	if err := json.Unmarshal(raw, &coordinates); err != nil {
		return "", err
	}
	var pathData strings.Builder
	var visit func(any)
	visit = func(value any) {
		points, isArray := value.([]any)
		if !isArray || len(points) == 0 {
			return
		}
		if _, isCoordinate := points[0].(float64); isCoordinate {
			return
		}
		if first, ok := points[0].([]any); ok && len(first) >= 2 {
			if _, isCoordinate := first[0].(float64); isCoordinate {
				for index, rawPoint := range points {
					point, ok := rawPoint.([]any)
					if !ok || len(point) < 2 {
						continue
					}
					longitude, lonOK := point[0].(float64)
					latitude, latOK := point[1].(float64)
					if !lonOK || !latOK {
						continue
					}
					x := (longitude + 180) / 360 * 1000
					y := (90 - latitude) / 180 * 500
					command := "L"
					if index == 0 {
						command = "M"
					}
					fmt.Fprintf(&pathData, "%s%.2f,%.2f", command, x, y)
				}
				pathData.WriteByte('Z')
				return
			}
		}
		for _, child := range points {
			visit(child)
		}
	}
	visit(coordinates)
	if pathData.Len() == 0 {
		return "", errors.New("empty coordinate path")
	}
	return pathData.String(), nil
}

func valueAt(dataset *Dataset, country Country, year int, indicator string) (float64, bool) {
	if indicator == "gdpPerCapita" || indicator == "realGDP" {
		values := country.GDPPerCapita
		if indicator == "realGDP" {
			values = country.RealGDP
		}
		index, exists := dataset.YearIndex[year]
		if !exists || index >= len(values) || math.IsNaN(values[index]) || math.IsInf(values[index], 0) {
			return 0, false
		}
		return values[index], true
	}
	return dataset.gdpAt(country, year)
}

func growthRate(dataset *Dataset, country Country, year int, indicator string) (float64, bool) {
	current, hasCurrent := valueAt(dataset, country, year, indicator)
	previous, hasPrevious := valueAt(dataset, country, year-1, indicator)
	if !hasCurrent || !hasPrevious || previous == 0 {
		return 0, false
	}
	return (current/previous - 1) * 100, true
}

func indicatorTitle(indicator, language string) string {
	text := translationsFor(language)
	switch indicator {
	case "gdpPerCapita":
		return text.GDPPerCapita
	case "realGDP":
		return text.RealGDP
	default:
		return text.GDP
	}
}

func localizedMessage(message string, replacements ...string) string {
	pairs := make([]string, 0, len(replacements))
	for index := 0; index+1 < len(replacements); index += 2 {
		pairs = append(pairs, "{"+replacements[index]+"}", replacements[index+1])
	}
	return strings.NewReplacer(pairs...).Replace(message)
}

func formatValue(value float64, indicator string) string {
	if indicator == "gdpPerCapita" {
		return "$" + strconv.FormatFloat(value, 'f', 0, 64)
	}
	return "$" + strconv.FormatFloat(value/1e9, 'f', 0, 64) + "B"
}

func (dataset *Dataset) gdpAt(country Country, year int) (float64, bool) {
	index, exists := dataset.YearIndex[year]
	if !exists || index >= len(country.GDP) || math.IsNaN(country.GDP[index]) {
		return 0, false
	}
	return country.GDP[index], true
}

func chartPoints(dataset *Dataset, country Country, from, to int) []chartPoint {
	return chartPointsFor(dataset, country, from, to, "gdp")
}

func chartPointsFor(dataset *Dataset, country Country, from, to int, indicator string) []chartPoint {
	const maximumPoints = 800
	yearSpan := to - from + 1
	if yearSpan <= maximumPoints {
		points := make([]chartPoint, 0, yearSpan)
		for year := from; year <= to; year++ {
			if value, exists := valueAt(dataset, country, year, indicator); exists {
				points = append(points, chartPoint{Year: year, Value: value})
			}
		}
		return points
	}

	const bucketLimit = (maximumPoints - 2) / 2
	bucketCount := minInt(bucketLimit, yearSpan)
	buckets := make([]pointBucket, bucketCount)
	var first, last chartPoint
	hasPoint := false
	for year := from; year <= to; year++ {
		value, exists := valueAt(dataset, country, year, indicator)
		if !exists {
			continue
		}
		point := chartPoint{Year: year, Value: value}
		if !hasPoint {
			first = point
			hasPoint = true
		}
		last = point
		bucketIndex := (year - from) * bucketCount / yearSpan
		if bucketIndex >= bucketCount {
			bucketIndex = bucketCount - 1
		}
		bucket := &buckets[bucketIndex]
		if !bucket.Has {
			bucket.Min, bucket.Max, bucket.Has = point, point, true
		} else {
			if point.Value < bucket.Min.Value {
				bucket.Min = point
			}
			if point.Value > bucket.Max.Value {
				bucket.Max = point
			}
		}
	}
	if !hasPoint {
		return nil
	}

	points := make([]chartPoint, 0, maximumPoints)
	points = append(points, first)
	for _, bucket := range buckets {
		if bucket.Has {
			points = append(points, bucket.Min, bucket.Max)
		}
	}
	points = append(points, last)
	sort.Slice(points, func(i, j int) bool {
		return points[i].Year < points[j].Year
	})
	unique := points[:0]
	for _, point := range points {
		if len(unique) == 0 || unique[len(unique)-1].Year != point.Year {
			unique = append(unique, point)
		}
	}
	return unique
}

func minInt(left, right int) int {
	if left < right {
		return left
	}
	return right
}

func maxIndex(left, right int) int {
	if left > right {
		return left
	}
	return right
}

func selectedCodes(query []string, dataset *Dataset) []string {
	seen := make(map[string]bool)
	selected := make([]string, 0, len(query))
	for _, code := range query {
		if _, exists := dataset.ByCode[code]; exists && !seen[code] {
			selected = append(selected, code)
			seen[code] = true
		}
	}
	return selected
}

func countryMatchesFilters(country Country, region, incomeGroup string) bool {
	return (region == "" || country.Region == region) &&
		(incomeGroup == "" || country.IncomeLevel == incomeGroup)
}

func hasFilterOption(options []filterOption, selected string) bool {
	for _, option := range options {
		if option.Value == selected {
			return true
		}
	}
	return false
}

func filterOptions(countries []Country, region, incomeGroup, selected string) []filterOption {
	values := make(map[string]bool)
	for _, country := range countries {
		value := country.Region
		if incomeGroup != "" {
			value = country.IncomeLevel
		}
		if value != "" {
			values[value] = true
		}
	}
	ordered := make([]string, 0, len(values))
	for value := range values {
		ordered = append(ordered, value)
	}
	sort.Strings(ordered)
	options := make([]filterOption, 0, len(ordered))
	for _, value := range ordered {
		options = append(options, filterOption{Value: value, Selected: value == selected})
	}
	return options
}

func boundedYear(value string, fallback, minimum, maximum int) int {
	year, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	if year < minimum {
		return minimum
	}
	if year > maximum {
		return maximum
	}
	return year
}

func buildPage(dataset *Dataset, request *http.Request) pageData {
	minimum, maximum := dataset.Years[0], dataset.Years[len(dataset.Years)-1]
	indicator := request.URL.Query().Get("indicator")
	if indicator != "gdpPerCapita" && indicator != "realGDP" {
		indicator = "gdp"
	}
	language := request.URL.Query().Get("language")
	if language != "es" && language != "fr" {
		language = "en"
	}
	text := translationsFor(language)
	indicatorLabel := indicatorTitle(indicator, language)
	region := request.URL.Query().Get("region")
	incomeGroup := request.URL.Query().Get("income")
	knownRegions := filterOptions(dataset.Countries, "", "", region)
	knownIncomeGroups := filterOptions(dataset.Countries, "", "income", incomeGroup)
	if region != "" && !hasFilterOption(knownRegions, region) {
		region = ""
	}
	if incomeGroup != "" && !hasFilterOption(knownIncomeGroups, incomeGroup) {
		incomeGroup = ""
	}
	filteredCountries := make([]Country, 0, len(dataset.Countries))
	for _, country := range dataset.Countries {
		if countryMatchesFilters(country, region, incomeGroup) {
			filteredCountries = append(filteredCountries, country)
		}
	}
	from := boundedYear(request.URL.Query().Get("from"), minimum, minimum, maximum)
	to := boundedYear(request.URL.Query().Get("to"), maximum, minimum, maximum)
	if from > to {
		from = to
	}
	query := request.URL.Query()
	countryCodes, hasCountryParameter := query["country"]
	if !hasCountryParameter && request.URL.RawQuery == "" {
		countryCodes = []string{"DEU", "FRA", "GBR", "BRA", "MEX", "JPN"}
	}
	selected := selectedCodes(countryCodes, dataset)
	filteredSelected := make([]string, 0, len(selected))
	for _, code := range selected {
		if countryMatchesFilters(dataset.ByCode[code], region, incomeGroup) {
			filteredSelected = append(filteredSelected, code)
		}
	}
	selected = filteredSelected
	selectedSet := make(map[string]bool, len(selected))
	for _, code := range selected {
		selectedSet[code] = true
	}

	page := pageData{
		From: from, To: to, MinYear: minimum, MaxYear: maximum,
		Indicator: indicator, IndicatorLabel: indicatorLabel, Language: language, Text: text,
		ChartHeading:         localizedMessage(text.ChartHeading, "indicator", indicatorLabel),
		ChartAlt:             localizedMessage(text.ChartAlt, "indicator", indicatorLabel, "from", strconv.Itoa(from), "to", strconv.Itoa(to)),
		MetricsHeading:       localizedMessage(text.MetricsHeading, "indicator", indicatorLabel, "year", strconv.Itoa(to)),
		RankingsHeading:      localizedMessage(text.RankingsHeading, "indicator", indicatorLabel, "year", strconv.Itoa(to)),
		GrowthHeading:        localizedMessage(text.GrowthHeading, "indicator", indicatorLabel, "year", strconv.Itoa(to)),
		CumulativeHeading:    localizedMessage(text.CumulativeGrowth, "from", strconv.Itoa(from), "to", strconv.Itoa(to)),
		CoverageHeading:      localizedMessage(text.CoverageHeading, "from", strconv.Itoa(from), "to", strconv.Itoa(to)),
		DataSource:           dataset.SnapshotSource,
		DataUpdatedAt:        dataset.SnapshotUpdatedAt,
		SelectedCountryCount: len(selected),
		MapHeading:           localizedMessage(text.MapHeading, "indicator", indicatorLabel, "year", strconv.Itoa(to)),
		MapAlt:               localizedMessage(text.MapAlt, "indicator", indicatorLabel, "year", strconv.Itoa(to)),
		Region:               region, IncomeGroup: incomeGroup,
		Regions: knownRegions, IncomeGroups: knownIncomeGroups,
		Countries:            make([]countryOption, 0, len(filteredCountries)),
		Metrics:              make([]metric, 0, len(selected)),
		Rankings:             make([]rankingRow, 0, len(selected)),
		GrowthRows:           make([]annualGrowthRow, 0, len(selected)),
		GrowthYears:          make([]int, 0, to-from+1),
		GrowthTrendRows:      make([]growthTrendRow, 0, len(selected)),
		CumulativeGrowthRows: make([]cumulativeGrowthRow, 0, len(selected)),
		CoverageRows:         make([]coverageRow, 0, len(selected)),
	}
	for year := from; year <= to; year++ {
		page.GrowthYears = append(page.GrowthYears, year)
	}
	for _, country := range filteredCountries {
		page.Countries = append(page.Countries, countryOption{
			Code: country.Code, Name: country.Name, Selected: selectedSet[country.Code],
		})
	}

	const width, height, left, right, top, bottom = 1000.0, 390.0, 76.0, 18.0, 18.0, 40.0
	plotWidth, plotHeight := width-left-right, height-top-bottom
	maxGDP := 0.0
	hasGDP := false
	for _, code := range selected {
		for year := from; year <= to; year++ {
			value, exists := valueAt(dataset, dataset.ByCode[code], year, indicator)
			if exists {
				hasGDP = true
				if value > maxGDP {
					maxGDP = value
				}
			}
		}
	}
	page.Empty = !hasGDP
	if !page.Empty {
		scaleGDP := math.Max(maxGDP, 1)
		for tick := 0; tick <= 4; tick++ {
			page.Grid = append(page.Grid, gridLine{
				Y:     top + plotHeight*float64(tick)/4,
				Label: formatValue(scaleGDP*float64(4-tick)/4, indicator),
			})
		}
		span := maxInt(to-from, 1)
		step := maxInt(1, int(math.Ceil(float64(span)/8)))
		labels := map[int]bool{from: true, to: true}
		for year := ((from + step - 1) / step) * step; year <= to; year += step {
			labels[year] = true
		}
		years := make([]int, 0, len(labels))
		for year := range labels {
			years = append(years, year)
		}
		sort.Ints(years)
		for _, year := range years {
			x := left + float64(year-from)/float64(span)*plotWidth
			page.YearLabels = append(page.YearLabels, yearLabel{X: x, Year: year})
		}

		palette := []string{"#3764d8", "#e05c42", "#14946b", "#9a56c4", "#da9b22", "#168eaa", "#d34d88", "#697b30"}
		for index, code := range selected {
			country := dataset.ByCode[code]
			points := chartPointsFor(dataset, country, from, to, indicator)
			coordinates := make([]string, 0, len(points))
			for _, point := range points {
				x := left + float64(point.Year-from)/float64(span)*plotWidth
				y := top + plotHeight - point.Value/scaleGDP*plotHeight
				coordinates = append(coordinates, fmt.Sprintf("%.2f,%.2f", x, y))
			}
			if len(coordinates) > 0 {
				page.Series = append(page.Series, chartSeries{
					Code: code, Color: palette[index%len(palette)], Points: strings.Join(coordinates, " "),
				})
			}
			current, hasCurrent := valueAt(dataset, country, to, indicator)
			initial, hasInitial := valueAt(dataset, country, from, indicator)
			valueLabel, growth := "N/A", text.GrowthUnavailable
			if hasCurrent {
				valueLabel = formatValue(current, indicator)
			}
			if hasCurrent && hasInitial && initial != 0 {
				growth = fmt.Sprintf("%.2f× since %d", current/initial, from)
			}
			page.Metrics = append(page.Metrics, metric{Code: code, Value: valueLabel, Growth: growth})
		}
	} else {
		for _, code := range selected {
			country := dataset.ByCode[code]
			current, hasCurrent := valueAt(dataset, country, to, indicator)
			valueLabel := "N/A"
			if hasCurrent {
				valueLabel = formatValue(current, indicator)
			}
			page.Metrics = append(page.Metrics, metric{Code: code, Value: valueLabel, Growth: text.GrowthUnavailable})
		}
	}

	ranked := make([]struct {
		code  string
		name  string
		value float64
	}, 0, len(selected))
	for _, code := range selected {
		country := dataset.ByCode[code]
		if value, exists := valueAt(dataset, country, to, indicator); exists {
			ranked = append(ranked, struct {
				code  string
				name  string
				value float64
			}{code: code, name: country.Name, value: value})
		}
	}
	sort.Slice(ranked, func(i, j int) bool {
		return ranked[i].value > ranked[j].value
	})
	for index, entry := range ranked {
		page.Rankings = append(page.Rankings, rankingRow{
			Rank:  index + 1,
			Code:  entry.code,
			Name:  entry.name,
			Value: formatValue(entry.value, indicator),
		})
	}
	for _, code := range selected {
		country := dataset.ByCode[code]
		rate, hasRate := growthRate(dataset, country, to, indicator)
		growth := text.Unavailable
		if hasRate {
			growth = fmt.Sprintf("%.2f%%", rate)
		}
		page.GrowthRows = append(page.GrowthRows, annualGrowthRow{
			Code:   code,
			Name:   country.Name,
			Growth: growth,
		})
		trend := growthTrendRow{Code: code, Name: country.Name, Values: make([]string, 0, len(page.GrowthYears))}
		for _, year := range page.GrowthYears {
			rate, hasRate := growthRate(dataset, country, year, indicator)
			value := text.Unavailable
			if hasRate {
				value = fmt.Sprintf("%.2f%%", rate)
			}
			trend.Values = append(trend.Values, value)
		}
		page.GrowthTrendRows = append(page.GrowthTrendRows, trend)
		start, hasStart := valueAt(dataset, country, from, indicator)
		end, hasEnd := valueAt(dataset, country, to, indicator)
		change := text.Unavailable
		if hasStart && hasEnd && start != 0 {
			change = fmt.Sprintf("%.2f%%", (end/start-1)*100)
		}
		page.CumulativeGrowthRows = append(page.CumulativeGrowthRows, cumulativeGrowthRow{
			Code: code, Name: country.Name, Change: change,
		})
		observedYears := 0
		missingYears := make([]string, 0, to-from+1)
		for year := from; year <= to; year++ {
			if _, available := valueAt(dataset, country, year, indicator); available {
				observedYears++
			} else {
				missingYears = append(missingYears, strconv.Itoa(year))
			}
		}
		missing := text.NoMissingYears
		if len(missingYears) > 0 {
			missing = strings.Join(missingYears, ", ")
		}
		totalYears := to - from + 1
		page.CoverageRows = append(page.CoverageRows, coverageRow{
			Code:     code,
			Name:     country.Name,
			Observed: fmt.Sprintf("%d/%d", observedYears, totalYears),
			Rate:     fmt.Sprintf("%.1f%%", float64(observedYears)/float64(totalYears)*100),
			Missing:  missing,
		})
	}
	groupTotals := make(map[string]struct {
		total float64
		count int
	})
	for _, country := range filteredCountries {
		value, exists := valueAt(dataset, country, to, indicator)
		if !exists {
			continue
		}
		for _, label := range []string{text.Region + ": " + country.Region, text.IncomeGroup + ": " + country.IncomeLevel} {
			if strings.HasSuffix(label, ": ") {
				continue
			}
			entry := groupTotals[label]
			entry.total += value
			entry.count++
			groupTotals[label] = entry
		}
	}
	for label, group := range groupTotals {
		page.Comparisons = append(page.Comparisons, comparisonRow{
			Group: label, Average: formatValue(group.total/float64(group.count), indicator), Count: group.count,
		})
	}
	sort.Slice(page.Comparisons, func(i, j int) bool {
		return page.Comparisons[i].Group < page.Comparisons[j].Group
	})
	mapValues := make([]float64, 0, len(dataset.Map))
	for _, boundary := range dataset.Map {
		if country, exists := dataset.ByCode[boundary.Code]; exists {
			if value, available := valueAt(dataset, country, to, indicator); available {
				mapValues = append(mapValues, value)
			}
		}
	}
	sort.Float64s(mapValues)
	breaks := make([]float64, 4)
	for index := range breaks {
		if len(mapValues) > 0 {
			breaks[index] = mapValues[minInt(len(mapValues)-1, (index+1)*len(mapValues)/5)]
		}
	}
	palette := []string{"#dce8f6", "#a9c5e8", "#6f9ed6", "#3764d8", "#203f92"}
	for _, boundary := range dataset.Map {
		fill, title := "#e9edf2", boundary.Title
		if country, exists := dataset.ByCode[boundary.Code]; exists && countryMatchesFilters(country, region, incomeGroup) {
			if value, available := valueAt(dataset, country, to, indicator); available {
				bin := 0
				for bin < len(breaks) && value > breaks[bin] {
					bin++
				}
				fill = palette[bin]
				title = localizedMessage(text.MapTooltip, "country", country.Name, "value", formatValue(value, indicator), "year", strconv.Itoa(to))
			}
		}
		if title == "" {
			title = boundary.Code
		} else {
			title += " (" + boundary.Code + ")"
		}
		page.MapCountries = append(page.MapCountries, mapCountry{
			Code: boundary.Code, Path: boundary.Path, Fill: fill, Title: title + " in " + strconv.Itoa(to),
		})
	}
	return page
}

func maxInt(left, right int) int {
	if left > right {
		return left
	}
	return right
}

func run() error {
	dataPath := flag.String("data", "data/gdp_data.csv", "path to the World Bank GDP CSV")
	indicatorPath := flag.String("indicators", "data/world_bank_indicators.json", "path to the refreshed World Bank indicator snapshot")
	mapPath := flag.String("map", "data/world_countries.geojson", "path to the Natural Earth country boundaries")
	flag.Parse()
	file, err := os.Open(*dataPath)
	if err != nil {
		return fmt.Errorf("open GDP dataset %q: %w", *dataPath, err)
	}
	defer file.Close()
	dataset, err := loadDataset(file)
	if err != nil {
		return err
	}
	if len(dataset.Years) == 0 {
		return errors.New("GDP dataset contains no years")
	}
	indicatorFile, indicatorErr := os.Open(*indicatorPath)
	if indicatorErr == nil {
		mapFile, mapErr := os.Open(*mapPath)
		if mapErr != nil {
			indicatorFile.Close()
			return fmt.Errorf("open Natural Earth boundaries %q: %w", *mapPath, mapErr)
		}
		if err := loadIndicatorData(dataset, indicatorFile, mapFile); err != nil {
			indicatorFile.Close()
			mapFile.Close()
			return err
		}
		indicatorFile.Close()
		mapFile.Close()
	} else if !errors.Is(indicatorErr, os.ErrNotExist) {
		return fmt.Errorf("open World Bank indicator snapshot %q: %w", *indicatorPath, indicatorErr)
	} else {
		log.Printf("indicator/map data not found; run scripts/refresh-dashboard-data.mjs to enable the new views")
	}
	tmpl, err := template.New("dashboard").Funcs(template.FuncMap{
		"add": func(left, right float64) float64 { return left + right },
	}).Parse(pageTemplate)
	if err != nil {
		return fmt.Errorf("parse dashboard template: %w", err)
	}
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	mux := http.NewServeMux()
	pages := newPageCache(16)
	mux.HandleFunc("/", func(response http.ResponseWriter, request *http.Request) {
		if request.URL.Path != "/" {
			http.NotFound(response, request)
			return
		}
		if request.Method != http.MethodGet && request.Method != http.MethodHead {
			response.Header().Set("Allow", "GET, HEAD")
			http.Error(response, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		response.Header().Set("Content-Type", "text/html; charset=utf-8")
		response.Header().Set("X-Content-Type-Options", "nosniff")
		response.Header().Set("Cache-Control", "private, max-age=30")
		cacheKey := request.URL.RawQuery
		if body, ok := pages.get(cacheKey); ok {
			_, _ = response.Write(body)
			return
		}
		var body bytes.Buffer
		if err := tmpl.Execute(&body, buildPage(dataset, request)); err != nil {
			log.Printf("render dashboard: %v", err)
			http.Error(response, "Unable to render dashboard", http.StatusInternalServerError)
			return
		}
		page := body.Bytes()
		pages.put(cacheKey, page)
		_, _ = response.Write(page)
	})
	mux.HandleFunc("/export.csv", func(response http.ResponseWriter, request *http.Request) {
		if request.Method != http.MethodGet {
			response.Header().Set("Allow", "GET")
			http.Error(response, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		minimum, maximum := dataset.Years[0], dataset.Years[len(dataset.Years)-1]
		from := boundedYear(request.URL.Query().Get("from"), minimum, minimum, maximum)
		to := boundedYear(request.URL.Query().Get("to"), maximum, minimum, maximum)
		if from > to {
			from = to
		}
		selected := selectedCodes(request.URL.Query()["country"], dataset)
		region := request.URL.Query().Get("region")
		incomeGroup := request.URL.Query().Get("income")
		indicator := request.URL.Query().Get("indicator")
		if indicator != "gdpPerCapita" && indicator != "realGDP" {
			indicator = "gdp"
		}
		language := request.URL.Query().Get("language")
		if language != "es" && language != "fr" {
			language = "en"
		}
		text := translationsFor(language)
		response.Header().Set("Content-Type", "text/csv; charset=utf-8")
		response.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s-%d-%d.csv\"", indicator, from, to))
		response.Header().Set("X-Content-Type-Options", "nosniff")
		response.Header().Set("Cache-Control", "no-store")
		writer := csv.NewWriter(response)
		_ = writer.Write([]string{text.CountryName, text.CountryCode, text.Year, indicatorTitle(indicator, language)})
		for _, code := range selected {
			country := dataset.ByCode[code]
			if !countryMatchesFilters(country, region, incomeGroup) {
				continue
			}
			for year := from; year <= to; year++ {
				value := ""
				if observation, exists := valueAt(dataset, country, year, indicator); exists {
					value = strconv.FormatFloat(observation, 'f', -1, 64)
				}
				_ = writer.Write([]string{country.Name, country.Code, strconv.Itoa(year), value})
			}
		}
		writer.Flush()
		if err := writer.Error(); err != nil {
			log.Printf("write CSV export: %v", err)
		}
	})
	address := "127.0.0.1:" + port
	log.Printf("GDP dashboard v%s listening at http://localhost:%s", appVersion, port)
	return http.ListenAndServe(address, mux)
}

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}
