# :earth_americas: GDP dashboard template

A simple GDP dashboard with Python, TypeScript, and Go implementations. Each version reads the shared World Bank dataset in `data/gdp_data.csv`.

[![Open in Streamlit](https://static.streamlit.io/badges/streamlit_badge_black_white.svg)](https://gdp-dashboard-template.streamlit.app/)

## Python

Install the requirements and start Streamlit:

```sh
pip install -r requirements.txt
streamlit run streamlit_app.py
```

## Setup

From the repository root, run the interactive setup and choose TypeScript, Go, or both:

```bat
.\scripts\setup.cmd
```

The equivalent PowerShell setup is also available as `.\scripts\setup.ps1`. On macOS or Linux, use the POSIX setup script:

```sh
sh ./scripts/setup.sh
```

The setup scripts accept a choice to skip the prompt (`typescript`, `go`, or `both`). They check the required runtime, install/build only the selected implementation, and leave Python untouched. TypeScript setup requires Node.js 18+ and npm, runs `npm ci`, and builds the frontend; Go setup requires Go 1.21+ and builds a local binary in `bin/`. Install runtimes from [nodejs.org](https://nodejs.org/) and [go.dev/dl](https://go.dev/dl/).

## TypeScript / JavaScript

Requires Node.js 18 or newer. To install and run it manually from the repository root:

```sh
node scripts/refresh-dashboard-data.mjs
cd typescript-dashboard
npm ci
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000). Set `PORT` to use a different port.

Run the TypeScript build, server checks, and fixture-based refresh tests with `cd typescript-dashboard && npm test`.

## Go

Requires Go 1.21 or newer. From the repository root:

```sh
node scripts/refresh-dashboard-data.mjs
go run ./go-dashboard
```

Open [http://localhost:8080](http://localhost:8080). Set `PORT` to use a different port or pass `-data path/to/gdp_data.csv` to load a different CSV file.

Run the Go tests with `go test ./go-dashboard`. The Go test and build also run in GitHub Actions when Go dashboard files change.

### Performance and caching

The TypeScript server loads the small HTML and compiled JavaScript assets once, streams the CSV from disk, and supports ETag/conditional requests. The browser parses CSV incrementally and stores GDP values in compact typed arrays. Both dashboards downsample long chart series while retaining peaks and endpoints; Go also caches rendered pages within a 32 MiB memory budget. Missing observations remain unavailable rather than becoming zero.

### Dashboard features

Both non-Python dashboards provide:

- Country and year selection
- GDP-over-time chart
- GDP summaries and annual growth
- GDP rankings for the selected end year
- CSV export of the visible country/year selection
- Explicit unavailable states for missing World Bank observations
- GDP per capita (current US$) and inflation-adjusted GDP (constant 2015 US$)
- A selected-year world map and region/income-group comparisons for the selected indicator

### Indicator and map data

The Python implementation is unchanged. The TypeScript and Go dashboards use the existing `data/gdp_data.csv` for headline GDP and a generated shared snapshot for the additional views. Refresh it with `node scripts/refresh-dashboard-data.mjs`; it downloads:

- `NY.GDP.PCAP.CD` (GDP per capita, current US$) and `NY.GDP.MKTP.KD` (GDP, constant 2015 US$) from the [World Bank Indicators API v2](https://datahelpdesk.worldbank.org/knowledgebase/articles/889392-about-the-indicators-api-documentation).
- 1:110m country boundaries from [Natural Earth](https://www.naturalearthdata.com/downloads/110m-cultural-vectors/).

The refresh year range defaults to the years in `data/gdp_data.csv`. Set `WB_START_YEAR` and `WB_END_YEAR` to override it, `WORLD_BANK_API_BASE` to change the API base, and `NATURAL_EARTH_GEOJSON_URL` to select another compatible GeoJSON boundary file. `DASHBOARD_DATA_DIR` can direct output to a separate directory containing `gdp_data.csv`. Both remote sources are fetched and validated before the existing snapshot files are replaced, so a failed download leaves the prior snapshots available. Restart the dashboard after a refresh to load the updated files.

The map uses an equirectangular projection and joins Natural Earth country codes to World Bank ISO-3 codes; a few territories or disputed areas may not match. Missing indicator observations are omitted from rankings and group averages and shown as unfilled map areas. Group values are unweighted country averages, not population-weighted values or regional totals. The World Bank API may return unavailable values for recent years; refresh uses the range of the existing GDP CSV by default.
