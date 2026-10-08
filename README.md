# Finance App

A small React dashboard that compares **IBM** with four competitors (Microsoft, Oracle, SAP, Salesforce) using Yahoo Finance data, over three time windows:

| Tab | What it shows |
|---|---|
| **Current day** | Headline cards (IBM price, top mover), a price card per company, and an intraday comparison chart |
| **Last 7 days** | IBM's 7-day change, its lead or lag versus the peer average, its rank, a trend chart and a change bar chart |
| **Last quarter** | The same headline cards, a longer trend chart and a ranking table with IBM highlighted |

Trend charts are rebased so every company starts at 100. This makes stocks with different price levels comparable.

## Quick start

Requires **Node 22 or later** (`yahoo-finance2` v4 needs it).

```bash
npm install
npm run dev:mock   # offline demo data, no network needed
```

Open http://localhost:5173.

For live Yahoo Finance data:

```bash
npm run dev        # starts the web app and the data proxy together
```

The browser cannot call Yahoo directly, so `npm run dev` also starts a small proxy on port 4000. Vite forwards `/api` requests to it.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Web app (port 5173) plus Yahoo proxy (port 4000) |
| `npm run dev:mock` | Web app only, with deterministic offline data |
| `npm run dev:server` | Proxy only |
| `npm run lint` | ESLint and TypeScript check |
| `npm run typecheck` | TypeScript check only |
| `npm test` | Run all tests once |
| `npm run test:coverage` | Tests with coverage thresholds |
| `npm run build` | Type check and production build into `dist/` |
| `npm run validate` | Lint, tests with coverage, and build in one command |
| `npm run preview` | Serve the production build locally |

See [`docs/VALIDATION.md`](docs/VALIDATION.md) for what each check covers and what success looks like.

## Configuration

| Setting | Where | Default | Notes |
|---|---|---|---|
| `VITE_DATA_SOURCE` | `.env` (see `.env.example`) | `live` | `mock` serves offline fixtures. Any other value is treated as `live`, so a typo never silently shows fake data. |
| `PORT` | Environment of the proxy | `4000` | If you change it, also change the proxy target in `vite.config.ts`. |

## How it works

```
Browser UI ─ MarketDataProvider ─┬─ httpProvider ─▶ /api ─▶ Express proxy ─▶ yahoo-finance2
                                 │                           └ 60 s cache
                                 └─ mockProvider  (offline fixtures)
```

The UI depends only on the `MarketDataProvider` interface (`getQuotes`, `getHistory`). The data source is chosen in one place, `src/services/marketData/index.ts`.

### Project layout

```
src/
├── app/                  App root
├── config/               companies.ts, timeWindows.ts
├── domain/               types.ts, metrics.ts (pctChange, rebaseTo100, rankByChange, average)
├── services/
│   ├── errors.ts         MarketDataError (INVALID_SYMBOL, NO_DATA, UPSTREAM)
│   └── marketData/       provider interface, http and mock providers, normalize.ts, symbols.ts
├── hooks/                useAsync, useQuotes, useHistories
├── components/           ChartCard, SummaryCard, StatCard, RankingTable, PriceLineChart, ChangeBarChart
└── features/dashboard/   DashboardPage, DayView, WeekView, QuarterView, comparison.ts
server/                   Express app, Yahoo provider, cache
```

### Proxy API

| Endpoint | Returns |
|---|---|
| `GET /api/quotes?symbols=IBM,MSFT` | `{ quotes: Quote[] }` for 1 to 10 symbols |
| `GET /api/history?symbol=IBM&window=day\|week\|quarter` | `{ symbol, window, points: [{ t, close }] }` |

Errors use the shape `{ error: { code, message } }` with status 400 (invalid input), 404 (no data) or 502 (Yahoo unavailable). Raw upstream errors are never forwarded.

### Time windows

| Window | Yahoo interval | Lookback |
|---|---|---|
| Current day | 15 minutes | 5 days, then only the latest trading session is kept |
| Last 7 days | 1 hour | 7 days |
| Last quarter | 1 day | 92 days |

The day view looks back several days so weekends and holidays still show the last session.

## Extending

- **Add a company:** add one entry to `DEFAULT_COMPANIES` in `src/config/companies.ts` (symbol, display name, colour). Add `mockBasePrice` too if you want it available in mock mode. The dashboard is designed for IBM plus up to four competitors (`MAX_COMPETITORS`), and a test enforces that limit.
- **Change a time window:** edit `src/config/timeWindows.ts`.
- **Use a different data source:** implement `MarketDataProvider` and select it in `src/services/marketData/index.ts`. The UI does not change.
- **Add a view:** create a component that takes `ViewProps` (`src/features/dashboard/viewTypes.ts`) and register it in `DashboardPage.tsx`.

## Testing

Tests use fixtures and fakes, so **no test calls Yahoo Finance**. They cover:

- data transformation (`normalize.ts`) and metrics
- both data providers and the source switch
- the proxy server: routes, status codes, caching, partial results
- the `useAsync` hook, including stale responses and retry
- rendering of each dashboard view, one failing company, and total failure with Retry

Coverage floors are set in `vite.config.ts`, and `npm run test:coverage` fails if coverage drops below them.

## Limitations

- **Unofficial data source.** `yahoo-finance2` is not endorsed by Yahoo and can break or be rate limited without notice. Use `npm run dev:mock` as a fallback, for example in a workshop.
- **Mock data is not realistic.** Mock prices follow a fixed wave pattern, so rankings are repeatable but meaningless.
- **Not financial advice.** Data may be delayed or incomplete.
- Tests do not check that charts actually draw lines and bars, because jsdom has no layout. Use `npm run dev:mock` for a visual check.
