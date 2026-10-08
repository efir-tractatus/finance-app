# Validation guide

Everything below runs offline. Tests use fixtures and fakes, so **no check ever calls Yahoo Finance**.
Requires Node 22+ (`yahoo-finance2` v4).

## Commands

| Command | What it does | When to run it |
|---|---|---|
| `npm install` | Installs dependencies | Once, and after pulling changes |
| `npm run lint` | ESLint plus `tsc --noEmit` | Before every commit |
| `npm run typecheck` | Type check only | Quick feedback while editing |
| `npm test` | Runs all tests once | Fast loop while developing |
| `npm run test:coverage` | Tests plus coverage thresholds | Before opening a PR (CI runs this) |
| `npm run build` | Type check plus production bundle in `dist/` | Before opening a PR |
| `npm run validate` | Lint, then tests with coverage, then build | **One command that mirrors CI** |
| `npm run dev:mock` | Web app with offline demo data | Visual check, no network needed |
| `npm run dev` | Web app plus Yahoo proxy on port 4000 | Visual check with live data |

## What success looks like

`npm run validate` ends with all of the following and exits with code 0:

- **Lint:** no ESLint output and no TypeScript errors.
- **Tests:** every test file passes, with no failed or skipped tests.
- **Coverage:** the summary prints, and no `ERROR: Coverage for ... does not meet global threshold` line appears.
  Floors are lines 85%, statements 85%, functions 85%, branches 80%, set in `vite.config.ts`.
- **Build:** `✓ built in ...ms` and a `dist/` folder.

Visual check with `npm run dev:mock`, then open http://localhost:5173:

1. **Current day** tab: two headline cards, five company cards, one intraday chart with five lines.
2. **Last 7 days** tab: IBM 7-day change, versus-peers and rank cards, a trend chart and a bar chart.
3. **Last quarter** tab: the same three cards, a trend chart and a ranking table with the IBM row highlighted.

With `npm run dev` (live data), prices are real and change between runs.
If Yahoo is unreachable you should see an error message with a **Retry** button, not a blank page.

## What is tested

| Area | Files | What is checked |
|---|---|---|
| Data transformation | `normalize.test.ts` | Yahoo quote mapping, missing fields, rounding, null closes, duplicate timestamps, sort order, latest-session filtering for the day view |
| Symbol validation | `normalize.test.ts` | Case and whitespace, accepted tickers (`BRK-B`, `^GSPC`), rejected input (`IBM;DROP`, too long) |
| Metrics | `metrics.test.ts`, `comparison.test.ts` | Percent change, rebase to 100, ranking, peer average, missing focus company |
| Data providers | `httpProvider.test.ts`, `mockProvider.test.ts`, `index.test.ts` | Request URLs, error mapping, offline contract, source selection (`mock` or live) |
| Proxy server | `server/server.test.ts` | Status codes (400, 404, 502), no leaked error details, caching, partial results |
| State hook | `useAsync.test.ts` | Loading, success, error, retry, ignoring stale responses |
| Config guards | `config.test.ts` | Unique valid symbols, at most 4 competitors, window definitions |
| UI rendering | `DashboardPage.test.tsx`, `ChartCard.test.tsx` | Each of the three views, tab switching, one failing company, total failure with Retry |

## When a check fails

- **Lint error:** fix the code; do not disable the rule without a comment explaining why.
- **Coverage below a threshold:** add a test for the new code. Do not lower the threshold.
- **Test fails after a data change:** check whether `normalize.ts` or `metrics.ts` changed behaviour on purpose,
  then update the test and say so in the PR.
- **Live mode shows errors but tests pass:** Yahoo is an unofficial API and can change or block requests.
  Use `npm run dev:mock` to confirm the app itself is healthy.
