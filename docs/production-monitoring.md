# Production monitoring

`.github/workflows/monitor-production.yml` runs every 30 minutes and can also be
started manually with `workflow_dispatch`.

## Configuration

Repository variables are optional. The workflow uses these production defaults
when variables or manual inputs are absent.

| Variable | Default |
| --- | --- |
| `PRODUCTION_SITE_URL` | `https://finnblog.pe.kr` |
| `PRODUCTION_TOOL_URL` | `https://app.finnblog.pe.kr` |
| `PRODUCTION_API_BASE_URL` | Cloud Run production API URL |
| `MONITOR_SMOKE_TICKER` | `AAPL` |
| `MONITOR_SMOKE_FORM` | `10-Q` |

Manual runs expose `site_url`, `tool_url`, and `api_base_url` inputs. URL values
may include a trailing slash; the workflow normalizes it before checks.

## Checks

- Publication home canonical URL
- `robots.txt` sitemap declaration and sitemap availability
- AdSense script on a representative editorial page
- Publication 404 status, `noindex`, and absence of AdSense
- Tool home and 404 `noindex`, with no AdSense script
- Legacy publication query route containing the tool origin
- Backend health, calendar, and SEC analysis smoke responses

Every response must match its expected HTTP status and required body marker.
Checks for excluded routes also fail when the AdSense script is present.

## Failure handling

Every run uploads `production-monitor-summary`. A failed check makes the workflow
fail and creates or updates the open `[prod-alert] Production smoke checks failed`
issue. Production triage and remediation workflows use that failed run and its
artifact as diagnostic input.
