import type { Metadata } from "next";
import Link from "next/link";
import { caseStudies, caseStudyPath } from "./caseStudyData";

export const metadata: Metadata = {
  title: "SEC Filing Case Studies",
  description:
    "Case studies that show how to verify SEC filing tables, earnings releases, period headers, and automated extraction results.",
  alternates: { canonical: "/case-studies" },
};

export default function CaseStudiesPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Link href="/" className="text-sm font-medium text-blue-700 hover:underline">
          Back to dashboard
        </Link>

        <header className="mt-6 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Filing case studies
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            실제 공시 표를 검증하는 사례
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            자동 분석 결과를 그대로 믿기보다, 원문 SEC 보고서와 실적 발표 자료를 어떻게 대조해야
            하는지 실제 문서 구조를 기준으로 설명합니다.
          </p>
        </header>

        <section className="mt-8 grid gap-4">
          {caseStudies.map((study) => (
            <article key={study.slug} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs text-slate-500">Updated {study.updated}</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">
                <Link href={caseStudyPath(study.slug)} className="hover:underline">
                  {study.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{study.description}</p>
              <Link
                href={caseStudyPath(study.slug)}
                className="mt-4 inline-flex h-9 items-center justify-center rounded border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Read case study
              </Link>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
