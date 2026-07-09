# Deployment Checklist

## Frontend

Set these environment variables in the frontend hosting provider before building:

- `NEXT_PUBLIC_SITE_URL` — public canonical site URL, `https://finnblog.pe.kr`.
- `NEXT_PUBLIC_API_BASE_URL` — deployed FastAPI backend URL, for example `https://stock-backend-api-344913823090.us-central1.run.app`.

If using the runtime `frontend/public/config.json` fallback, keep `apiBaseUrl` aligned with `NEXT_PUBLIC_API_BASE_URL`.

After deployment, verify:

- `https://your-domain/`
- `https://your-domain/about`
- `https://your-domain/privacy`
- `https://your-domain/terms`
- `https://your-domain/disclaimer`
- `https://your-domain/stocks/aapl`
- `https://your-domain/robots.txt`
- `https://your-domain/sitemap.xml`

## Backend

Set these GitHub Actions secrets:

- `WIF_PROVIDER`
- `SERVICE_ACCOUNT_EMAIL`
- `DATABASE_URL` — optional for the backend, but required if persistent `response_cache` and scheduled prewarm jobs should run.
- `OPENAI_API_KEY` — required only if AI summaries should be enabled.

Set these GitHub Actions variables:

- `ALLOWED_ORIGINS` — comma-separated frontend origins. Default deployment value is `https://finnblog.pe.kr,https://www.finnblog.pe.kr,https://stock-analysis-mvp.pages.dev`; set this explicitly if the production domain changes.
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
