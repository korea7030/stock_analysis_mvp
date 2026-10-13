# SEC filing tool frontend

Standalone static Next.js application for `https://app.finnblog.pe.kr`.

The dashboard implementation remains in `../frontend/components/SecFilingDashboard.tsx`. This app owns only the tool-domain layout, metadata, robots policy, runtime API configuration, and static export.

## Environment

- `NEXT_PUBLIC_SITE_URL`: publication origin, default `https://finnblog.pe.kr`.
- `NEXT_PUBLIC_TOOL_URL`: tool origin, default `https://app.finnblog.pe.kr`.
- `NEXT_PUBLIC_API_BASE_URL`: optional build-time API override. `public/config.json` remains the runtime fallback.

Both site URL values must be HTTP(S) origins without a path, query, hash, or credentials, and they must be different.

## Commands

Run tool commands from the repository root so npm installs both frontend workspaces and shared imports resolve through the root `node_modules` directory:

```bash
npm ci
npm run lint:tool
npm run build:tool
```

The static deployment output is `out`. It contains the tool root, 404 page, and `robots.txt`; it must not contain AdSense code or editorial routes.

## Cloudflare Workers

Create the tool project from the repository with a blank root directory, build command `npm run build:tool`, deploy command `npm run deploy:tool`, and custom domain `app.finnblog.pe.kr`. `wrangler.jsonc` deploys `out` as Workers Static Assets. Pin `NODE_VERSION=22.16.0` and configure all environment variables above. Full deployment and legacy redirect settings are documented in `../DEPLOYMENT_CHECKLIST.md`.
