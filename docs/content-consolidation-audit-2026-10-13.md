# Content consolidation audit

Date: 2026-10-13

## Decision

The current guide inventory should be reduced from 12 short, similarly structured pages to four source-backed pillar guides. Three industry checklist pages should be removed until they can be replaced by company-specific filing research. Five overlapping guides should be merged into the four retained guides.

This consolidation addresses duplication and batch-publishing signals. It does not by itself demonstrate sustained operation or user interest. AdSense resubmission remains blocked until the publication and audience gates below are met.

## Inventory decisions

| Current slug | Decision | Destination or requirement | Reason |
| --- | --- | --- | --- |
| `10q-10k-8k-difference` | KEEP_AND_EXPAND | Retain current URL | Core filing-type guide. Add filing timelines, primary SEC sources, a decision table, and a worked example. |
| `sec-financial-statements-checklist` | KEEP_AND_EXPAND | Retain current URL | Core statement-reading guide. Add calculation tables and absorb the three statement-specific pages. |
| `earnings-release-vs-sec-filing` | MERGE | `10q-10k-8k-difference` | Repeats the 8-K, earnings release, and 10-Q distinction already covered by the retained guide. |
| `income-statement-period-comparison` | MERGE | `sec-financial-statements-checklist` | Useful subject, but too narrow and substantially repeated in the checklist and AMD case study. |
| `balance-sheet-current-vs-prior-period` | MERGE | `sec-financial-statements-checklist` | Useful subject, but currently a short generic subsection without a primary-source example. |
| `cash-flow-statement-quality-of-earnings` | MERGE | `sec-financial-statements-checklist` | Useful subject, but stronger as the cash-flow chapter of one complete statement guide. |
| `gaap-vs-non-gaap-earnings` | KEEP_AND_EXPAND | Retain current URL | Distinct decision problem. Add an actual GAAP reconciliation table and recurring-adjustment analysis. |
| `warrant-liability-fair-value` | MERGE | `gaap-vs-non-gaap-earnings` | Generic explanation overlaps the IonQ case study. Keep the concept as a worked adjustment example. |
| `semiconductor-filing-checklist` | REMOVE | No redirect until a specific replacement exists | Generic industry summary with no company filing, calculation, or primary-source evidence. |
| `software-saas-filing-checklist` | REMOVE | No redirect until a specific replacement exists | Generic industry summary with no company filing, calculation, or primary-source evidence. |
| `bank-filing-checklist` | REMOVE | No redirect until a specific replacement exists | Generic industry summary with no company filing, calculation, or primary-source evidence. |
| `verify-automated-sec-extraction` | KEEP_AND_EXPAND | Retain current URL | Most product-specific guide. Add parser failure examples, a reproducible validation workflow, and known limitations. |

## Target inventory

1. `10q-10k-8k-difference`
2. `sec-financial-statements-checklist`
3. `gaap-vs-non-gaap-earnings`
4. `verify-automated-sec-extraction`

The guide index, home-page guide selection, sitemap, and static route generation must use only this final inventory after consolidation.

## Article contract

Every retained guide and future case study must provide:

- `publishedAt`: exact ISO date representing first publication.
- `updatedAt`: exact ISO date changed only when editorial content materially changes.
- `author`: stable author identity linked to an author profile.
- `reviewer`: optional named reviewer for financial or accounting verification.
- `sources`: one or more primary sources with label, URL, document type, filing date, and accession number when available.
- `evidence`: at least one worked table, calculation, document excerpt reference, or reproducible verification procedure.
- `limitations`: what the analysis cannot establish and when the SEC original controls.
- `corrections`: visible correction entries when a material claim or number changes.

The page must emit matching `Article` JSON-LD. Month-only dates, build-time timestamps, unsupported reading-time labels, and generic source links are not acceptable substitutes.

## Case-study gap

The three existing case studies were materially expanded on 2026-10-13. They now include exact dates, author identity, multiple primary sources where relevant, displayed calculations, reproducible verification steps, limitations, and correction status. The AMD study documents multi-period column mapping, the IonQ study separates 8-K, 10-Q, cash-flow, and Non-GAAP contexts, and the parser study connects those failures to the implemented extraction pipeline. The related table annotation now treats a zero comparison baseline as unavailable instead of reporting a false 0% change.

New case studies should be based on actual filing discrepancies or interpretation problems. Industry overview pages should not return until backed by multiple named companies and primary filings.

## Redirect and removal rules

- Merged guide URLs receive permanent redirects to the retained guide containing their material.
- Removed industry checklist URLs return `404` and are removed from navigation and sitemap. They must not all redirect to the guide index or one unrelated guide.
- Retained URLs preserve canonical URLs.
- Sitemap `lastModified` must use each article's real `updatedAt`, not the deployment time.
- Removed and merged pages must not load AdSense.

## Publication gate

Do not request another AdSense review until all conditions hold:

- Four retained guides satisfy the article contract.
- Existing three case studies satisfy the article contract.
- At least six additional source-backed case studies have been published across at least six weeks.
- No more than two substantive articles are first published on the same date.
- Search Console reports the retained guides and case studies as indexed.
- There are no indexed removed URLs, soft-404 redirects, broken source links, or false freshness dates.

## Audience gate

Review requires real data rather than a guessed traffic threshold. Record a 28-day and 90-day snapshot from Search Console and analytics containing:

- Organic clicks and impressions.
- Indexed editorial URLs.
- Users and engaged sessions.
- Returning users.
- Median engagement time for editorial pages.
- Top landing pages and queries.

Resubmission should wait when editorial pages have near-zero impressions, no returning users, or no evidence that readers reach more than one page. Google does not publish a guaranteed numeric approval threshold.

## Implementation phases

1. **Complete (2026-10-13):** Consolidate guide data and route behavior according to this audit.
2. **Complete (2026-10-13):** Add article metadata, authorship, sources, evidence blocks, corrections, and JSON-LD.
3. **Complete (2026-10-13):** The analyzer is deployed at `app.finnblog.pe.kr` as a standalone static app with its own canonical metadata, noindex policy, dependencies, and AdSense-free output. Cloudflare builds from `tool-frontend`, installs the parent npm workspace with `npm ci --prefix ..`, and deploys `out` with Workers Static Assets. The custom domain, backend CORS, publication links, and legacy redirect are live with `ticker` and `form` query parameters preserved.
4. **In progress (2026-10-13):** The three existing case studies satisfy the article contract. Publishing at least six additional source-backed case studies across at least six weeks remains pending.
5. Validate indexing and audience gates before resubmission.
