# SEC filing tool frontend

Standalone static Next.js application for `https://app.finnblog.pe.kr`.

The dashboard implementation remains in `../frontend/components/SecFilingDashboard.tsx`. This app owns only the tool-domain layout, metadata, robots policy, runtime API configuration, and static export.

## Environment

- `NEXT_PUBLIC_SITE_URL`: publication origin, default `https://finnblog.pe.kr`.
- `NEXT_PUBLIC_TOOL_URL`: tool origin, default `https://app.finnblog.pe.kr`.
- `NEXT_PUBLIC_API_BASE_URL`: optional build-time API override. `public/config.json` remains the runtime fallback.

Both site URL values must be HTTP(S) origins without a path, query, hash, or credentials, and they must be different.

## Commands

```bash
npm ci
npm run lint
npm run build
```

The static deployment output is `out`. It contains the tool root, 404 page, and `robots.txt`; it must not contain AdSense code or editorial routes.
