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
	if !exists || country.GDP[1960] != 100 || country.GDP[1961] != 200 {
		t.Fatalf("unexpected parsed country: %+v", country)
	}
	missing := dataset.ByCode["MSE"]
	if len(missing.GDP) != 0 {
		t.Fatalf("missing GDP values should be omitted, got %+v", missing.GDP)
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
