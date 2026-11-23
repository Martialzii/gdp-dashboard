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
cd typescript-dashboard
npm ci
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000). Set `PORT` to use a different port.

Run the TypeScript build and server checks with `cd typescript-dashboard && npm test`.

## Go

Requires Go 1.21 or newer. From the repository root:

```sh
go run ./go-dashboard
```

Open [http://localhost:8080](http://localhost:8080). Set `PORT` to use a different port or pass `-data path/to/gdp_data.csv` to load a different CSV file.

Run the Go tests with `go test ./...`.

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
