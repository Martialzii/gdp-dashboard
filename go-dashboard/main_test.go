package main

import (
	"bytes"
	"fmt"
	"html/template"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestLoadDatasetParsesWorldBankRowsAndMissingValues(t *testing.T) {
	input := `Country Name,Country Code,Indicator Name,1960,1961
Example Republic,EXR,GDP,100,200
Missing Economy,MSE,GDP,,not-a-number
`
	dataset, err := loadDataset(strings.NewReader(input))
	if err != nil {
		t.Fatalf("loadDataset() error = %v", err)
	}
	country, exists := dataset.ByCode["EXR"]
	if !exists || country.GDP[0] != 100 || country.GDP[1] != 200 {
		t.Fatalf("unexpected parsed country: %+v", country)
	}
	missing := dataset.ByCode["MSE"]
	if len(missing.GDP) != len(dataset.Years) {
		t.Fatalf("GDP values should use compact year-indexed storage, got %d values", len(missing.GDP))
	}
	if _, available := dataset.gdpAt(missing, 1960); available {
		t.Fatalf("missing GDP values should remain unavailable, got %+v", missing.GDP)
	}
	if got := []int{dataset.Years[0], dataset.Years[1]}; got[0] != 1960 || got[1] != 1961 {
		t.Fatalf("unexpected years: %v", got)
	}
}

func TestBuildPageRendersSpanishInterface(t *testing.T) {
	dataset, err := loadDataset(strings.NewReader(`Country Name,Country Code,1960,1961
Example,EXM,100,200
`))
	if err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest("GET", "/?from=1960&to=1961&country=EXM&language=es", nil)
	page := buildPage(dataset, request)
	if page.Language != "es" || page.Text.AppTitle != "Panel del PIB" ||
		page.ChartHeading != "PIB (US$ actuales) a lo largo del tiempo" {
		t.Fatalf("unexpected Spanish page strings: %+v", page)
	}
	tmpl, err := template.New("dashboard").Funcs(template.FuncMap{
		"add": func(left, right float64) float64 { return left + right },
	}).Parse(pageTemplate)
	if err != nil {
		t.Fatalf("parse dashboard template: %v", err)
	}
	var rendered bytes.Buffer
	if err := tmpl.Execute(&rendered, page); err != nil {
		t.Fatalf("render Spanish dashboard: %v", err)
	}
	for _, expected := range []string{
		`<html lang="es">`, "Panel del PIB", "Idioma", "Actualizar panel",
		"el valor del año anterior es el denominador", "Tendencia del crecimiento interanual",
		"Variación acumulada (1960–1961)", "100.00%",
		"Servicios de datos", "Actividad en directo", "no se envían datos de uso",
	} {
		if !strings.Contains(rendered.String(), expected) {
			t.Errorf("rendered Spanish page is missing %q", expected)
		}
	}
}

func TestAnnualGrowthUsesPreviousYearAsDenominator(t *testing.T) {
	dataset, err := loadDataset(strings.NewReader(`Country Name,Country Code,1960,1961,1962
Example,EXM,100,200,500
Zero Baseline,ZER,100,0,50
Missing Prior,MSP,100,,150
Missing Start,MSE,,100,150
Zero Start,ZST,0,100,150
`))
	if err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest("GET", "/?from=1960&to=1962&country=EXM&country=ZER&country=MSP&country=MSE&country=ZST", nil)
	page := buildPage(dataset, request)
	growthByCode := make(map[string]string)
	for _, row := range page.GrowthRows {
		growthByCode[row.Code] = row.Growth
	}
	if growthByCode["EXM"] != "150.00%" {
		t.Fatalf("growth should use 1961 as the denominator, got %q", growthByCode["EXM"])
	}
	if growthByCode["ZER"] != "Unavailable" || growthByCode["MSP"] != "Unavailable" {
		t.Fatalf("zero or missing previous-year values should be unavailable: %+v", growthByCode)
	}
	if len(page.GrowthYears) != 3 || page.GrowthYears[0] != 1960 || page.GrowthYears[2] != 1962 {
		t.Fatalf("unexpected growth trend years: %+v", page.GrowthYears)
	}
	trendByCode := make(map[string][]string)
	for _, row := range page.GrowthTrendRows {
		trendByCode[row.Code] = row.Values
	}
	if got := strings.Join(trendByCode["EXM"], ","); got != "Unavailable,100.00%,150.00%" {
		t.Fatalf("unexpected year-over-year trend values for EXM: %s", got)
	}
	if got := strings.Join(trendByCode["ZER"], ","); got != "Unavailable,-100.00%,Unavailable" {
		t.Fatalf("zero prior-year observation should make the next trend value unavailable: %s", got)
	}
	if got := strings.Join(trendByCode["MSP"], ","); got != "Unavailable,Unavailable,Unavailable" {
		t.Fatalf("missing observations should remain unavailable in trend: %s", got)
	}
	cumulativeByCode := make(map[string]string)
	for _, row := range page.CumulativeGrowthRows {
		cumulativeByCode[row.Code] = row.Change
	}
	if cumulativeByCode["EXM"] != "400.00%" || cumulativeByCode["ZER"] != "-50.00%" ||
		cumulativeByCode["MSP"] != "50.00%" || cumulativeByCode["MSE"] != "Unavailable" ||
		cumulativeByCode["ZST"] != "Unavailable" {
		t.Fatalf("unexpected cumulative change values: %+v", cumulativeByCode)
	}
}

func TestBuildPageDefaultsAndHandlesInvalidCountries(t *testing.T) {
	dataset, err := loadDataset(strings.NewReader(`Country Name,Country Code,1960,1961
Germany,DEU,1000000000,2000000000
France,FRA,3000000000,6000000000
`))
	if err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest("GET", "/", nil)
	page := buildPage(dataset, request)
	if page.From != 1960 || page.To != 1961 || len(page.Metrics) != 2 || len(page.Series) != 2 {
		t.Fatalf("unexpected default page: %+v", page)
	}

	request = httptest.NewRequest("GET", "/?from=1961&to=1960&country=UNKNOWN", nil)
	page = buildPage(dataset, request)
	if page.From != 1960 || page.To != 1960 || len(page.Metrics) != 0 || !page.Empty {
		t.Fatalf("unexpected page for invalid selection: %+v", page)
	}

	request = httptest.NewRequest("GET", "/?from=1960&to=1961", nil)
	page = buildPage(dataset, request)
	if len(page.Metrics) != 0 || !page.Empty {
		t.Fatalf("an empty country selection should remain empty: %+v", page)
	}
}

func TestBuildPageAddsAnnualGrowthAndRankings(t *testing.T) {
	dataset, err := loadDataset(strings.NewReader(`Country Name,Country Code,1960,1961,1962
Germany,DEU,100,110,0
France,FRA,200,220,330
Missing Economy,MSE,,100,
`))
	if err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest("GET", "/?from=1960&to=1962&country=DEU&country=FRA&country=MSE", nil)
	page := buildPage(dataset, request)
	if len(page.Rankings) != 2 {
		t.Fatalf("rankings should omit missing GDP values, got %+v", page.Rankings)
	}
	if page.Rankings[0].Code != "FRA" || page.Rankings[1].Code != "DEU" {
		t.Fatalf("unexpected ranking order: %+v", page.Rankings)
	}
	growthByCode := make(map[string]string)
	for _, row := range page.GrowthRows {
		growthByCode[row.Code] = row.Growth
	}
	if growthByCode["FRA"] != "50.00%" || growthByCode["DEU"] != "-100.00%" || growthByCode["MSE"] != "Unavailable" {
		t.Fatalf("unexpected annual growth: %+v", growthByCode)
	}
}

func TestPageCacheLimitsEntriesAndMemory(t *testing.T) {
	cache := newPageCache(2)
	cache.maxBytes = 7
	cache.put("a", []byte("12"))
	cache.put("b", []byte("34"))
	if _, ok := cache.get("a"); !ok {
		t.Fatal("expected cached page")
	}
	cache.put("c", []byte("5"))
	if _, ok := cache.get("b"); ok {
		t.Fatal("least recently used entry should be evicted")
	}
	if body, ok := cache.get("a"); !ok || string(body) != "12" {
		t.Fatalf("unexpected cached page: %q, %v", body, ok)
	}
	cache.put("z", []byte("1234567"))
	if _, ok := cache.get("z"); ok {
		t.Fatal("page larger than the cache budget should not be stored")
	}
	if cache.totalBytes > cache.maxBytes || cache.order.Len() > cache.capacity {
		t.Fatalf("cache exceeded its limits: bytes=%d entries=%d", cache.totalBytes, cache.order.Len())
	}
}

func TestChartPointsDownsamplesAndKeepsExtrema(t *testing.T) {
	const from, yearCount = 1960, 1000
	dataset := &Dataset{
		YearIndex: make(map[int]int, yearCount),
		Years:     make([]int, yearCount),
	}
	country := Country{GDP: make([]float64, yearCount)}
	for index := 0; index < yearCount; index++ {
		year := from + index
		dataset.Years[index] = year
		dataset.YearIndex[year] = index
		country.GDP[index] = float64(index)
	}
	country.GDP[500] = 1000000

	points := chartPoints(dataset, country, from, from+yearCount-1)
	if len(points) > 800 {
		t.Fatalf("chart should cap its points, got %d", len(points))
	}
	if points[0].Year != from || points[len(points)-1].Year != from+yearCount-1 {
		t.Fatalf("chart endpoints were not preserved: %+v", points)
	}
	foundPeak := false
	for _, point := range points {
		if point.Year == from+500 && point.Value == 1000000 {
			foundPeak = true
			break
		}
	}
	if !foundPeak {
		t.Fatal("chart downsampling should preserve local peaks")
	}
}

func TestBuildPageTreatsZeroGDPAsAnAvailableObservation(t *testing.T) {
	dataset, err := loadDataset(strings.NewReader(`Country Name,Country Code,1960,1961
Zero GDP,ZER,0,0
`))
	if err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest("GET", "/?from=1960&to=1961&country=ZER", nil)
	page := buildPage(dataset, request)
	if page.Empty || len(page.Rankings) != 1 || page.Metrics[0].Value != "$0B" {
		t.Fatalf("zero GDP should remain a valid observation: %+v", page)
	}
}

func TestIndicatorSnapshotAddsPerCapitaMapAndGroupComparisons(t *testing.T) {
	dataset, err := loadDataset(strings.NewReader(`Country Name,Country Code,1960,1961
Example,EXM,100,200
Second,SEC,300,400
Outside,OTH,500,600
`))
	if err != nil {
		t.Fatal(err)
	}
	snapshot := `{"source":"World Bank Indicators API v2","updatedAt":"2026-01-02T03:04:05.000Z","countries":[
		{"code":"EXM","region":"East Asia","incomeLevel":"High income","gdpPerCapita":{"1960":5,"1961":10},"realGDP":{"1960":50,"1961":100}},
		{"code":"SEC","region":"East Asia","incomeLevel":"High income","gdpPerCapita":{"1960":15,"1961":20},"realGDP":{"1960":150,"1961":200}},
		{"code":"OTH","region":"Europe","incomeLevel":"Low income","gdpPerCapita":{"1960":25,"1961":30},"realGDP":{"1960":250,"1961":300}}
	]}`
	var boundaries strings.Builder
	boundaries.WriteString(`{"type":"FeatureCollection","features":[`)
	for index := 0; index < 100; index++ {
		if index > 0 {
			boundaries.WriteByte(',')
		}
		code := fmt.Sprintf("C%02d", index)
		if index == 0 {
			code = "EXM"
		} else if index == 1 {
			code = "OTH"
		}
		fmt.Fprintf(&boundaries, `{"type":"Feature","properties":{"ISO_A3_EH":%q,"ADMIN":"Test"},"geometry":{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,0]]]}}`, code)
	}
	boundaries.WriteString(`]}`)
	if err := loadIndicatorData(dataset, strings.NewReader(snapshot), strings.NewReader(boundaries.String())); err != nil {
		t.Fatal(err)
	}
	if dataset.SnapshotSource != "World Bank Indicators API v2" ||
		dataset.SnapshotUpdatedAt != "2026-01-02T03:04:05.000Z" {
		t.Fatalf("snapshot service metadata was not loaded: source=%q updatedAt=%q", dataset.SnapshotSource, dataset.SnapshotUpdatedAt)
	}
	request := httptest.NewRequest("GET", "/?from=1960&to=1961&country=EXM&country=SEC&country=OTH&indicator=gdpPerCapita&region=East+Asia&income=High+income", nil)
	page := buildPage(dataset, request)
	if page.IndicatorLabel != "GDP per capita (current US$)" || len(page.Rankings) != 2 || page.Rankings[0].Value != "$20" {
		t.Fatalf("unexpected indicator rankings: %+v", page)
	}
	if page.Region != "East Asia" || page.IncomeGroup != "High income" || len(page.Countries) != 2 {
		t.Fatalf("region/income filters did not narrow the country selection: %+v", page)
	}
	if len(page.Regions) != 2 || len(page.IncomeGroups) != 2 {
		t.Fatalf("expected all filter choices to remain available: regions=%+v income=%+v", page.Regions, page.IncomeGroups)
	}
	if len(page.MapCountries) != 100 || len(page.Comparisons) != 2 || page.Comparisons[0].Count != 2 {
		t.Fatalf("indicator data was not used for map and group comparisons: map=%d groups=%+v", len(page.MapCountries), page.Comparisons)
	}
	if page.MapCountries[1].Code != "OTH" || page.MapCountries[1].Fill != "#e9edf2" {
		t.Fatalf("map should show out-of-filter countries as no-data: %+v", page.MapCountries[1])
	}
}
