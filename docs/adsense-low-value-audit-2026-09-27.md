# AdSense low-value content audit

Date: 2026-09-27

## Implementation progress

- Phase 1 complete: the home page now presents recent source-based filing reviews, core guides, methodology, and editorial standards before the interactive analyzer.
- The home page links to the analyzer without embedding its search, loading, result, or error states.
- Phase 2 complete: the analyzer now lives at `/tools/sec-filing`, declares `noindex, follow`, and old root query-string entry points redirect in the browser without changing ticker or form values.
- Phase 3 complete: the AdSense loader is limited to the publication home page and individual guide and case-study articles. Tool, stock, list, methodology, about, editorial-policy, legal, and error pages do not load it.

## Conclusion

Adding more generic guide pages is unlikely to resolve the rejection by itself. The stronger strategy is to separate the interactive research tool from monetizable editorial inventory, limit ads to pages with substantial publisher content, establish visible authorship and update history, and wait until Google has indexed the revised structure before requesting another review.

## Observed state

- The live home page, guides, case studies, editorial policy, sitemap, and robots file return HTTP 200.
- The sitemap currently exposes 12 guides and 3 case studies. Stock directory and stock detail pages are excluded from the sitemap and declare `noindex`.
- The AdSense loader is no longer included in the root layout. It is rendered only by the publication home page and individual guide and case-study article pages.
- Guide articles have titles, summaries, and update labels, but no named author, reviewer, citations, publication date, or structured Article metadata.
- Most guides use the same short section-and-paragraph template and were published in a small number of batches.
- The current Google search result for the site still shows older home-page copy describing stock pages as indexable and does not surface the new case-study pages independently. This indicates stale or incomplete indexing; it is not proof that the AdSense crawler sees the same snapshot.

## Main risks

1. **Tool screens counted as ad inventory.** Auto ads can treat the search form, loading state, no-result state, and API error state as pages with little publisher content. Google Publisher Policies prohibit ads on screens without publisher content, with low-value content, or used mainly for navigation/actions.
2. **Editorial pages look mass-produced.** A simultaneous batch of similarly structured, lightly sourced guides can resemble content created for approval or search acquisition. Google warns against scaled pages created without substantial original value.
3. **Financial trust signals are weak.** This is financial information, where Google says trust receives additional weight. No visible author identity, qualifications or experience, reviewer, precise publication dates, correction history, or per-claim citations are present on guide pages.
4. **Recent changes may not be evaluated yet.** Search results still reflect older copy. Reapplying before the revised pages are crawled can reproduce the same decision.
5. **User-interest evidence may be insufficient.** Google publishes no fixed approval traffic threshold, but the rejection text explicitly asks for sustained operation and real user interest. Repeated submissions cannot create these signals.

## Recommended architecture

### Preferred: publication-first root, tool section

- Keep `finnblog.pe.kr` as an editorial research publication.
- Move the interactive dashboard to `/tools/sec-filing` or `app.finnblog.pe.kr`.
- Make the root page a dated research feed containing original filing analyses, corrections, and methodology updates.
- Load or place ads only on substantial editorial articles after approval. Exclude tool, loading, no-result, error, legal, and navigation pages from auto ads.
- Publish fewer but deeper source-based analyses on a real cadence. Each article should include author, reviewed-by information where applicable, exact publication/update dates, primary SEC/IR sources, calculations, limitations, and correction history.

### Lower-change alternative: same routes, controlled inventory

- Keep the dashboard on `/`, but disable Auto ads for tool and utility routes.
- Add a primary `Research` navigation and a real article archive.
- Replace generic guides with original company/event analyses and keep only guides that materially support them.
- Do not request review until Search Console reports the important editorial URLs as indexed and the site has a measurable period of returning use.

## Suggested gate before resubmission

- New information architecture deployed and crawlable.
- No ad eligibility on tool, empty, loading, error, legal, or thin pages.
- At least several independently useful, source-backed analyses published across multiple dates rather than one batch.
- Author and editorial accountability visible on every financial article.
- Important URLs indexed in Search Console; live test shows current HTML.
- Analytics show genuine organic/direct visits and repeat engagement over time.
- No broken links, empty calendar states on the editorial landing page, or misleading freshness dates.

There is no guaranteed article count, traffic number, waiting period, or approval outcome. These are quality gates, not policy thresholds.

## Primary sources

- [Google Publisher Policies](https://support.google.com/adsense/answer/10502938?hl=ko)
- [Google AdSense content and user experience guidance](https://support.google.com/adsense/answer/10015918?hl=ko)
- [Google Search spam policies](https://developers.google.com/search/docs/essentials/spam-policies?hl=ko)
- [Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
