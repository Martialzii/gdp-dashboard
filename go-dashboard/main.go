package main

import (
	"encoding/csv"
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
)

type Country struct {
	Code string
	Name string
	GDP  map[int]float64
}

type Dataset struct {
	Countries []Country
	ByCode    map[string]Country
	Years     []int
}

type chartSeries struct {
	Code   string
	Color  string
	Points string
}

type countryOption struct {
	Code     string
	Name     string
	Selected bool
}

type metric struct {
	Code   string
	Value  string
	Growth string
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
	From       int
	To         int
	MinYear    int
	MaxYear    int
	Countries  []countryOption
	Series     []chartSeries
	Metrics    []metric
	Grid       []gridLine
	YearLabels []yearLabel
	Empty      bool
}

const pageTemplate = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>GDP dashboard — Go</title>
  <style>
    :root{font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#172033;background:#f5f7fb;font-synthesis:none}
    *{box-sizing:border-box}body{margin:0}main{max-width:1160px;margin:0 auto;padding:40px 24px 64px}
    h1{margin:0;font-size:clamp(2rem,5vw,3rem);letter-spacing:-.04em}.intro{color:#647087;line-height:1.6;margin:12px 0 28px;max-width:720px}
    .panel{background:#fff;border:1px solid #e4e9f1;border-radius:16px;padding:22px;box-shadow:0 8px 26px #16244308}
    .controls{display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start}
    label,.control-title{font-weight:650;font-size:.94rem}.years{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}
    .year-field{display:grid;gap:6px;color:#59667d;font-size:.84rem}input[type=number]{width:100%;padding:8px;border:1px solid #d5dce7;border-radius:8px}
    select{width:100%;min-height:142px;margin-top:10px;padding:8px;border:1px solid #d5dce7;border-radius:9px;color:inherit;background:#fff}
    .hint{margin:7px 0 0;color:#738097;font-size:.8rem}button{margin-top:16px;padding:10px 18px;border:0;border-radius:8px;background:#3764d8;color:white;font:inherit;font-weight:650;cursor:pointer}
    h2{font-size:1.2rem;margin:32px 0 14px;letter-spacing:-.015em}.chart-wrap{overflow-x:auto}svg{display:block;width:100%;min-width:560px;height:auto}
    .grid-line{stroke:#e8edf4;stroke-width:1}.axis-label{fill:#758198;font-size:12px}.series-line{fill:none;stroke-width:2.5;stroke-linejoin:round;stroke-linecap:round}
    .legend{display:flex;gap:12px 20px;flex-wrap:wrap;margin-top:12px;color:#49556b;font-size:.85rem}.legend-item{display:inline-flex;gap:7px;align-items:center}
    .swatch{width:10px;height:10px;border-radius:50%}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}
    .metric{padding:16px;border:1px solid #e4e9f1;border-radius:12px}.metric-code{color:#657187;font-size:.84rem;font-weight:650}
    .metric-value{margin-top:8px;font-size:1.45rem;font-weight:720;letter-spacing:-.03em}.metric-growth{margin-top:4px;color:#18835b;font-size:.83rem}
    .empty{color:#758198;text-align:center;padding:44px 12px}@media(max-width:680px){main{padding:28px 16px 48px}.controls{grid-template-columns:1fr}.panel{padding:17px}}
  </style>
</head>
<body><main>
  <h1>🌍 GDP dashboard</h1>
  <p class="intro">Explore GDP (current US$) from the <a href="https://data.worldbank.org/">World Bank Open Data</a>. Data spans {{.MinYear}}–{{.MaxYear}}; some countries have missing years.</p>
  <form method="get" class="panel controls">
    <div><div class="control-title">Years</div><div class="years">
      <label class="year-field" for="from">From<input id="from" name="from" type="number" min="{{.MinYear}}" max="{{.MaxYear}}" value="{{.From}}"></label>
      <label class="year-field" for="to">To<input id="to" name="to" type="number" min="{{.MinYear}}" max="{{.MaxYear}}" value="{{.To}}"></label>
    </div></div>
    <div><label for="countries">Countries</label>
      <select id="countries" name="country" multiple aria-describedby="country-hint">
        {{range .Countries}}<option value="{{.Code}}" {{if .Selected}}selected{{end}}>{{.Code}} — {{.Name}}</option>{{end}}
      </select>
      <p class="hint" id="country-hint">Use Ctrl (Windows/Linux) or ⌘ (Mac) to select multiple countries.</p>
      <button type="submit">Update dashboard</button>
    </div>
  </form>
  <h2>GDP over time</h2><section class="panel chart-wrap">
    {{if .Empty}}<p class="empty">No GDP data is available for this selection.</p>{{else}}
    <svg viewBox="0 0 1000 390" role="img" aria-label="GDP by year from {{.From}} through {{.To}}">
      {{range .Grid}}<line class="grid-line" x1="76" x2="982" y1="{{.Y}}" y2="{{.Y}}"></line><text class="axis-label" x="66" y="{{add .Y 4}}" text-anchor="end">{{.Label}}</text>{{end}}
      {{range .YearLabels}}<text class="axis-label" x="{{.X}}" y="378" text-anchor="middle">{{.Year}}</text>{{end}}
      {{range .Series}}<polyline class="series-line" stroke="{{.Color}}" points="{{.Points}}"></polyline>{{end}}
    </svg>
    <div class="legend">{{range .Series}}<span class="legend-item"><span class="swatch" style="background:{{.Color}}" aria-hidden="true"></span>{{.Code}}</span>{{end}}</div>
    {{end}}
  </section>
  <h2>GDP in {{.To}}</h2><div class="metrics">{{range .Metrics}}
    <article class="metric"><div class="metric-code">{{.Code}} GDP</div><div class="metric-value">{{.Value}}</div><div class="metric-growth">{{.Growth}}</div></article>
  {{end}}</div>
</main></body></html>`

func loadDataset(source io.Reader) (*Dataset, error) {
	reader := csv.NewReader(source)
	reader.FieldsPerRecord = -1
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
	if nameIndex < 0 || codeIndex < 0 || len(yearColumns) == 0 {
		return nil, errors.New("GDP CSV is missing the expected World Bank columns")
	}

	dataset := &Dataset{ByCode: make(map[string]Country), Years: make([]int, 0, len(yearColumns))}
	for _, column := range yearColumns {
		dataset.Years = append(dataset.Years, column.year)
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
		country := Country{Code: code, Name: record[nameIndex], GDP: make(map[int]float64)}
		for _, column := range yearColumns {
			if column.index >= len(record) || strings.TrimSpace(record[column.index]) == "" {
				continue
			}
			value, parseErr := strconv.ParseFloat(strings.TrimSpace(record[column.index]), 64)
			if parseErr == nil && !math.IsNaN(value) && !math.IsInf(value, 0) {
				country.GDP[column.year] = value
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
	selectedSet := make(map[string]bool, len(selected))
	for _, code := range selected {
		selectedSet[code] = true
	}

	page := pageData{
		From: from, To: to, MinYear: minimum, MaxYear: maximum,
		Countries: make([]countryOption, 0, len(dataset.Countries)),
		Metrics:   make([]metric, 0, len(selected)),
	}
	for _, country := range dataset.Countries {
		page.Countries = append(page.Countries, countryOption{
			Code: country.Code, Name: country.Name, Selected: selectedSet[country.Code],
		})
	}

	const width, height, left, right, top, bottom = 1000.0, 390.0, 76.0, 18.0, 18.0, 40.0
	plotWidth, plotHeight := width-left-right, height-top-bottom
	maxGDP := 0.0
	for _, code := range selected {
		for year := from; year <= to; year++ {
			if value := dataset.ByCode[code].GDP[year]; value > maxGDP {
				maxGDP = value
			}
		}
	}
	page.Empty = maxGDP == 0
	if !page.Empty {
		for tick := 0; tick <= 4; tick++ {
			page.Grid = append(page.Grid, gridLine{
				Y: top + plotHeight*float64(tick)/4,
				Label: fmt.Sprintf("$%sB", strconv.FormatFloat(maxGDP*float64(4-tick)/4/1e9, 'f', 1, 64)),
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
			points := make([]string, 0, to-from+1)
			for year := from; year <= to; year++ {
				value, exists := country.GDP[year]
				if !exists {
					continue
				}
				x := left + float64(year-from)/float64(span)*plotWidth
				y := top + plotHeight - value/maxGDP*plotHeight
				points = append(points, fmt.Sprintf("%.2f,%.2f", x, y))
			}
			if len(points) > 0 {
				page.Series = append(page.Series, chartSeries{
					Code: code, Color: palette[index%len(palette)], Points: strings.Join(points, " "),
				})
			}
			current, hasCurrent := country.GDP[to]
			initial, hasInitial := country.GDP[from]
			valueLabel, growth := "N/A", "Growth unavailable"
			if hasCurrent {
				valueLabel = "$" + strconv.FormatFloat(current/1e9, 'f', 0, 64) + "B"
			}
			if hasCurrent && hasInitial && initial != 0 {
				growth = fmt.Sprintf("%.2f× since %d", current/initial, from)
			}
			page.Metrics = append(page.Metrics, metric{Code: code, Value: valueLabel, Growth: growth})
		}
	} else {
		for _, code := range selected {
			country := dataset.ByCode[code]
			current, hasCurrent := country.GDP[to]
			valueLabel := "N/A"
			if hasCurrent {
				valueLabel = "$" + strconv.FormatFloat(current/1e9, 'f', 0, 64) + "B"
			}
			page.Metrics = append(page.Metrics, metric{Code: code, Value: valueLabel, Growth: "Growth unavailable"})
		}
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
	mux.HandleFunc("/", func(response http.ResponseWriter, request *http.Request) {
		if request.URL.Path != "/" {
			http.NotFound(response, request)
			return
		}
		response.Header().Set("Content-Type", "text/html; charset=utf-8")
		response.Header().Set("X-Content-Type-Options", "nosniff")
		if err := tmpl.Execute(response, buildPage(dataset, request)); err != nil {
			log.Printf("render dashboard: %v", err)
		}
	})
	address := "127.0.0.1:" + port
	log.Printf("GDP dashboard listening at http://localhost:%s", port)
	return http.ListenAndServe(address, mux)
}

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}
