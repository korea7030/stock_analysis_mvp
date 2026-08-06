import type { Metadata } from "next";
import Link from "next/link";
import { guideArticles, guidePath } from "./guideData";

export const metadata: Metadata = {
  title: "SEC Filing Guides",
  description:
    "Guides for reading SEC filings, earnings releases, 10-Q, 10-K, 8-K reports, and financial statement tables.",
  alternates: { canonical: "/guides" },
};

export default function GuidesPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Link href="/" className="text-sm font-medium text-blue-700 hover:underline">
          Back to dashboard
        </Link>

        <header className="mt-6 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Research guides
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            SEC 공시와 실적 자료를 읽는 방법
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            이 가이드는 자동 분석 결과를 더 정확하게 해석하기 위한 배경 지식을 제공합니다.
            10-Q, 10-K, 8-K의 차이, 재무제표 검증 순서, 실적 발표 자료와 정식 SEC 보고서의
            차이를 정리했습니다.
          </p>
        </header>

        <section className="mt-8 grid gap-4">
          {guideArticles.map((article) => (
            <article key={article.slug} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs text-slate-500">
                    Updated {article.updated} · {article.readingTime}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-950">
                    <Link href={guidePath(article.slug)} className="hover:underline">
                      {article.title}
                    </Link>
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{article.description}</p>
                </div>
                <Link
                  href={guidePath(article.slug)}
                  className="inline-flex h-9 shrink-0 items-center justify-center rounded border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Read guide
                </Link>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
