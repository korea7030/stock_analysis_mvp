import type { Metadata } from "next";
/* eslint-disable @next/next/no-html-link-for-pages -- Full reload clears AdSense on excluded routes. */
import Link from "next/link";
import { caseStudies, caseStudyPath } from "./case-studies/caseStudyData";
import { guideArticles, guidePath } from "./guides/guideData";
import { HomePublisherAdSense } from "./HomePublisherAdSense";
import { LegacyToolRedirect } from "./LegacyToolRedirect";

export const metadata: Metadata = {
  title: "SEC 공시 분석과 재무제표 검증",
  description:
    "SEC 원문 공시와 자동 추출 결과를 대조해 재무제표의 기간, 단위, 부호 차이를 분석하는 독립 리서치 사이트입니다.",
  alternates: { canonical: "/" },
};

const filingChecklist = [
  "최근 분기 매출과 전년 동기 매출의 차이가 일회성 요인인지 확인합니다.",
  "영업이익률과 순이익률이 동시에 개선되는지, 비용 증가로 훼손되는지 비교합니다.",
  "영업활동 현금흐름과 잉여현금흐름이 순이익과 같은 방향으로 움직이는지 봅니다.",
  "부채, 재고, 매출채권, 주식보상비용처럼 손익계산서만으로 보이지 않는 항목을 확인합니다.",
];

export default function HomePage() {
  const featuredStudy = caseStudies[0];
  const recentStudies = caseStudies.slice(1, 3);
  const featuredGuides = guideArticles.slice(0, 6);

  return (
    <main className="min-h-screen bg-slate-50">
      <HomePublisherAdSense />
      <LegacyToolRedirect />
      <div className="mx-auto max-w-7xl space-y-12 p-4 pb-12 sm:space-y-16 sm:p-6 sm:pb-16">
        <header className="border-b border-slate-200 pb-5 pt-2">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <Link href="/" className="text-lg font-semibold tracking-tight text-slate-950">
              SEC Filing Dashboard
            </Link>
            <nav aria-label="주요 메뉴" className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
              <a href="/case-studies" className="hover:text-slate-950 hover:underline">공시 분석</a>
              <a href="/guides" className="hover:text-slate-950 hover:underline">가이드</a>
              <a href="/methodology" className="hover:text-slate-950 hover:underline">방법론</a>
              <a href="/tools/sec-filing" className="font-medium text-blue-700 hover:underline">분석 도구</a>
            </nav>
          </div>
        </header>

        <section className="grid gap-8 border-b border-slate-200 pb-12 sm:pb-16 lg:grid-cols-12 lg:gap-10" aria-labelledby="publication-title">
          <div className="lg:col-span-7 lg:pr-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Independent SEC research</p>
            <h1 id="publication-title" className="mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl">
              SEC 공시를 숫자보다 문맥으로 읽습니다
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              원문 보고서와 자동 추출 결과를 대조해 기간, 단위, 부호가 달라지는 지점을 분석합니다.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="#latest-research"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800 active:translate-y-px"
              >
                최신 분석 보기
              </Link>
              <a
                href="/tools/sec-filing"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 hover:border-slate-400 hover:bg-slate-50 active:translate-y-px"
              >
                분석 도구 열기
              </a>
            </div>
          </div>

          {featuredStudy && (
            <article className="border-slate-200 lg:col-span-5 lg:border-l lg:pl-8">
              <p className="text-sm font-medium text-slate-500">최신 검증 사례</p>
              <p className="mt-5 text-xs text-slate-500">{featuredStudy.updated}</p>
              <h2 className="mt-2 text-2xl font-semibold leading-8 tracking-tight text-slate-950">
                <Link href={caseStudyPath(featuredStudy.slug)} className="hover:text-blue-700 hover:underline">
                  {featuredStudy.title}
                </Link>
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">{featuredStudy.description}</p>
              <Link href={caseStudyPath(featuredStudy.slug)} className="mt-5 inline-flex text-sm font-semibold text-blue-700 hover:underline">
                사례 전문 읽기
              </Link>
            </article>
          )}
        </section>

        <section id="latest-research" aria-labelledby="latest-research-title" className="scroll-mt-6">
          <div className="max-w-3xl">
            <h2 id="latest-research-title" className="text-2xl font-semibold tracking-tight text-slate-950">최신 공시 검증</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              실제 보고서에서 자동 추출 결과가 어긋난 사례와 원문 확인 과정을 기록합니다.
            </p>
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {recentStudies.map((study) => (
              <article key={study.slug} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs text-slate-500">{study.updated}</p>
                <h3 className="mt-2 text-lg font-semibold leading-7 text-slate-950">
                  <Link href={caseStudyPath(study.slug)} className="hover:text-blue-700 hover:underline">{study.title}</Link>
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{study.description}</p>
                <Link href={caseStudyPath(study.slug)} className="mt-4 inline-flex text-sm font-medium text-blue-700 hover:underline">
                  검증 과정 보기
                </Link>
              </article>
            ))}
          </div>
          <a href="/case-studies" className="mt-5 inline-flex text-sm font-semibold text-blue-700 hover:underline">
            전체 공시 분석 보기
          </a>
        </section>

        <section aria-labelledby="guide-index-title" className="border-t border-slate-200 pt-10">
          <div className="max-w-3xl">
            <h2 id="guide-index-title" className="text-2xl font-semibold tracking-tight text-slate-950">공시를 읽는 기준</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              보고서 유형, 재무제표 기간, GAAP 기준을 구분하는 데 필요한 핵심 자료입니다.
            </p>
          </div>
          <div className="mt-7 grid gap-x-10 gap-y-7 md:grid-cols-2">
            {featuredGuides.map((article) => (
              <article key={article.slug} className="border-b border-slate-200 pb-6">
                <div className="flex items-center justify-between gap-4 text-xs text-slate-500">
                  <span>Updated {article.updated}</span>
                  <span>{article.readingTime}</span>
                </div>
                <h3 className="mt-2 text-base font-semibold leading-6 text-slate-950">
                  <Link href={guidePath(article.slug)} className="hover:text-blue-700 hover:underline">{article.title}</Link>
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{article.description}</p>
              </article>
            ))}
          </div>
          <a href="/guides" className="mt-5 inline-flex text-sm font-semibold text-blue-700 hover:underline">전체 가이드 보기</a>
        </section>

        <section className="grid gap-8 rounded-xl border border-slate-200 bg-slate-100 p-6 lg:grid-cols-12 lg:p-8" aria-labelledby="research-standard-title">
          <div className="lg:col-span-5">
            <h2 id="research-standard-title" className="text-xl font-semibold text-slate-950">분석 기준과 출처</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              공시 데이터는 SEC EDGAR 원문을 기준으로 합니다. 자동 분석 결과는 표 구조에 따라 누락되거나
              다르게 분류될 수 있어 중요한 수치는 원문과 회사 IR 자료에서 다시 확인합니다.
            </p>
            <div className="mt-5 flex flex-wrap gap-4 text-sm font-medium">
              <a href="/methodology" className="text-blue-700 hover:underline">분석 방법론</a>
              <a href="/editorial-policy" className="text-blue-700 hover:underline">편집 원칙</a>
            </div>
          </div>
          <div className="lg:col-span-7">
            <h3 className="text-sm font-semibold text-slate-900">공시 검증 체크리스트</h3>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {filingChecklist.map((item) => (
                <li key={item} className="rounded-lg bg-white p-4 text-sm leading-6 text-slate-600 shadow-sm">{item}</li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
