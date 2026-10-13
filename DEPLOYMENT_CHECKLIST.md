# Deployment Checklist

## Cloudflare Frontends

Create two Cloudflare projects from the same GitHub repository. Pin Node.js instead of relying on the platform default.

### Publication project

- Root directory: `frontend`
- Build command: `npm run build`
- Build output directory: `out`
- Custom domain: `finnblog.pe.kr`

Set these environment variables for both production and preview builds:

- `NODE_VERSION=22.16.0`
- `NEXT_PUBLIC_SITE_URL=https://finnblog.pe.kr`
- `NEXT_PUBLIC_TOOL_URL=https://app.finnblog.pe.kr`
- `NEXT_PUBLIC_API_BASE_URL=<deployed FastAPI backend URL>`

### Tool project (Workers Static Assets)

- Root directory: `tool-frontend`
- Build command: `npm ci --prefix .. && npm run build`
- Deploy command: `npm run deploy`
- Static assets directory: `out` (configured in `wrangler.jsonc`)
- Custom domain: `app.finnblog.pe.kr`

Set the same four environment variables as the publication project. The build runs from `tool-frontend`, while `npm ci --prefix ..` installs the repository-root workspace so imports shared with `frontend` resolve correctly. The tool output must contain only the analyzer, its 404 page, and `robots.txt`; it must not contain AdSense code or publication pages.

### Legacy tool redirect

The publication build contains a 308 redirect for `/tools/sec-filing`. Cloudflare Pages preserves the incoming `ticker` and `form` query parameters for this rule; no separate zone rule is required.

If a zone-level **Single Redirect** is later added to override the Pages rule, configure URI Path `/tools/sec-filing`, target `https://app.finnblog.pe.kr/`, status `308`, and enable **Preserve query string**.

If using the runtime `frontend/public/config.json` fallback, keep `apiBaseUrl` aligned with `NEXT_PUBLIC_API_BASE_URL`.

After deployment, verify:

- `https://finnblog.pe.kr/`
- `https://finnblog.pe.kr/about`
- `https://finnblog.pe.kr/privacy`
- `https://finnblog.pe.kr/terms`
- `https://finnblog.pe.kr/disclaimer`
- `https://finnblog.pe.kr/stocks/aapl`
- `https://finnblog.pe.kr/robots.txt`
- `https://finnblog.pe.kr/sitemap.xml`
- `https://app.finnblog.pe.kr/`
- `curl -I 'https://finnblog.pe.kr/tools/sec-filing?ticker=GOOGL&form=8-K'` returns `308` and a `Location` containing both query parameters.

## Backend

Set these GitHub Actions secrets:

- `WIF_PROVIDER`
- `SERVICE_ACCOUNT_EMAIL`
- `DATABASE_URL` — optional for the backend, but required if persistent `response_cache` and scheduled prewarm jobs should run.
- `OPENAI_API_KEY` — required only if AI summaries should be enabled.

Set these GitHub Actions variables:

- `ALLOWED_ORIGINS` — comma-separated frontend origins. Use `https://finnblog.pe.kr,https://www.finnblog.pe.kr,https://app.finnblog.pe.kr,https://stock-analysis-mvp.pages.dev`. An explicitly configured repository variable overrides the workflow default, so update both when origins change.
- `RATE_LIMIT_ENABLED` — default `true`.
- `ANALYZE_IP_LIMIT` / `ANALYZE_IP_WINDOW_S` — default `20` / `3600`.
- `ANALYZE_TICKER_LIMIT` / `ANALYZE_TICKER_WINDOW_S` — default `8` / `900`.
- `SUMMARY_IP_LIMIT` / `SUMMARY_IP_WINDOW_S` — default `10` / `86400`.
- `SUMMARY_TICKER_LIMIT` / `SUMMARY_TICKER_WINDOW_S` — default `3` / `86400`.
- `CALENDAR_IP_LIMIT` / `CALENDAR_IP_WINDOW_S` — default `120` / `600`.
- `PREWARM_TICKERS` — optional comma-separated tickers for scheduled cache prewarm.
- `PREWARM_FORMS` — optional comma-separated forms, default `10-Q`.
- `PREWARM_SLEEP_S` — optional delay between prewarm calls, default `1.5`.

For Supabase, run `supabase/enable_rls.sql` once in the SQL Editor after the cache/history tables have been created. The backend also enables RLS automatically during table initialization.

After backend deployment, verify:

- `GET /health`
- `GET /calendar?weeks=1`
- `GET /analyze?ticker=AAPL&form=10-Q`
- Browser access from frontend origin without CORS errors.

## AdSense Readiness

Before submitting to AdSense:

- Confirm policy pages are reachable from the site footer.
- Confirm `robots.txt` allows crawling.
- Submit `sitemap.xml` in Google Search Console.
- Let Google index the site before adding ad units.
- Add `ads.txt` only after AdSense provides the publisher ID.
