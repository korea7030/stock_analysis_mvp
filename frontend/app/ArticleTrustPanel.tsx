import type { EditorialArticleData } from "./editorialData";
import { formatEditorialDate } from "./editorialData";

export function ArticleByline({ article }: { article: EditorialArticleData }) {
  return (
    <dl className="mt-5 grid gap-3 border-t border-slate-200 pt-5 text-sm text-slate-600 sm:grid-cols-3">
      <div>
        <dt className="text-xs font-semibold text-slate-500">작성</dt>
        <dd className="mt-1">
          <a href={article.author.path} className="font-medium text-blue-700 hover:underline">
            {article.author.name}
          </a>
        </dd>
      </div>
      <div>
        <dt className="text-xs font-semibold text-slate-500">게시</dt>
        <dd className="mt-1">
          <time dateTime={article.publishedAt}>{formatEditorialDate(article.publishedAt)}</time>
        </dd>
      </div>
      <div>
        <dt className="text-xs font-semibold text-slate-500">최종 수정</dt>
        <dd className="mt-1">
          <time dateTime={article.updatedAt}>{formatEditorialDate(article.updatedAt)}</time>
        </dd>
      </div>
    </dl>
  );
}

export function ArticleTrustPanel({ article }: { article: EditorialArticleData }) {
  return (
    <div className="mt-10 space-y-8 border-t border-slate-200 pt-8">
      <section aria-labelledby="evidence-heading">
        <h2 id="evidence-heading" className="text-xl font-semibold text-slate-950">
          {article.evidence.title}
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">{article.evidence.description}</p>
        <div className="mt-4 overflow-x-auto border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                {article.evidence.columns.map((column) => (
                  <th key={column} scope="col" className="border-b border-slate-200 px-4 py-3 font-semibold">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-slate-700">
              {article.evidence.rows.map((row) => (
                <tr key={row.join("|")} className="border-b border-slate-100 last:border-0">
                  {row.map((cell, index) => (
                    <td key={`${index}-${cell}`} className="px-4 py-3 align-top">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="sources-heading">
        <h2 id="sources-heading" className="text-xl font-semibold text-slate-950">1차 출처</h2>
        <ul className="mt-3 divide-y divide-slate-200 border-y border-slate-200 text-sm">
          {article.sources.map((source) => (
            <li key={source.url} className="py-3">
              <a href={source.url} target="_blank" rel="noreferrer" className="font-medium text-blue-700 hover:underline">
                {source.label}
              </a>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {source.documentType}
                {source.publishedAt ? ` · ${formatEditorialDate(source.publishedAt)}` : ""}
                {source.accessionNumber ? ` · Accession ${source.accessionNumber}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="limitations-heading">
        <h2 id="limitations-heading" className="text-xl font-semibold text-slate-950">분석 한계</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700">
          {article.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}
        </ul>
      </section>

      <section aria-labelledby="corrections-heading">
        <h2 id="corrections-heading" className="text-xl font-semibold text-slate-950">정정 이력</h2>
        {article.corrections.length ? (
          <ul className="mt-3 space-y-3 text-sm leading-7 text-slate-700">
            {article.corrections.map((correction) => (
              <li key={`${correction.date}-${correction.description}`}>
                <time dateTime={correction.date} className="font-medium text-slate-900">
                  {formatEditorialDate(correction.date)}
                </time>
                {` · ${correction.description}`}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm leading-7 text-slate-600">현재까지 공개된 중대한 정정은 없습니다.</p>
        )}
      </section>
    </div>
  );
}
