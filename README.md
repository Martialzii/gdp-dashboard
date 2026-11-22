# :earth_americas: GDP dashboard template

A simple GDP dashboard with Python, TypeScript, and Go implementations. Each version reads the shared World Bank dataset in `data/gdp_data.csv`.

[![Open in Streamlit](https://static.streamlit.io/badges/streamlit_badge_black_white.svg)](https://gdp-dashboard-template.streamlit.app/)

## Python

Install the requirements and start Streamlit:

```sh
pip install -r requirements.txt
streamlit run streamlit_app.py
```

## TypeScript / JavaScript

Requires Node.js 18 or newer. From the repository root:

```sh
cd typescript-dashboard
npm install
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000). Set `PORT` to use a different port.

## Go

Requires Go 1.21 or newer. From the repository root:

```sh
go run ./go-dashboard
```

Open [http://localhost:8080](http://localhost:8080). Set `PORT` to use a different port or pass `-data path/to/gdp_data.csv` to load a different CSV file.

### Dashboard features

Both non-Python dashboards provide:

- Country and year selection
- GDP-over-time chart
- GDP summaries and annual growth
- GDP rankings for the selected end year
- CSV export of the visible country/year selection
- Explicit unavailable states for missing World Bank observations
