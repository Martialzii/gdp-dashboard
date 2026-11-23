package main

import (
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
