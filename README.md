# F1 2026 Season Tracker

A single-page dashboard that pulls live Formula One data and visualises each driver's and constructor's championship points progression across the season.

## How to use

Open `index.html` directly in a browser — no build step, no server required. The page fetches data from the Jolpica API on load, so an internet connection is needed.

## Tech stack

| Concern | Choice |
|---|---|
| Data | [Jolpica F1 API](https://github.com/jolpica/jolpica-f1) — open-source, Ergast-compatible |
| Charts | [Chart.js 4.4](https://www.chartjs.org/) via CDN |
| Styling | Vanilla CSS with custom properties |
| Persistence | `localStorage` (theme preference only) |

Everything lives in a single `index.html` file with no external dependencies beyond the two CDN scripts.

## Features

- **Driver standings** — cumulative points line chart, filterable to Top 5 / Top 10 / All, with click-to-toggle individual lines
- **Constructor standings** — same treatment for teams
- **Stats strip** — championship leaders, races complete, last race winner, next race countdown
- **Season progress bar** — visual indicator of how far through the 24-round calendar we are
- **Race calendar** — all 24 rounds at a glance with completed/upcoming states
- **Light/dark theme** — toggle in the header, preference saved to `localStorage`
- **Sprint points** — automatically merged in when sprint races have been held

## Data source notes

The Jolpica API is backwards-compatible with the now-deprecated Ergast API. Endpoints used:

```
GET https://api.jolpi.ca/ergast/f1/2026.json          — full season schedule
GET https://api.jolpi.ca/ergast/f1/2026/results.json  — all race results
GET https://api.jolpi.ca/ergast/f1/2026/sprint.json   — sprint results (merged into race totals)
```

## Potential improvements

- [ ] Per-race breakdown modal on row click
- [ ] Head-to-head driver comparison view
- [ ] Qualifying gap chart
- [ ] PWA / offline support with cached API responses
- [ ] Animated chart transitions between filter states
