import type { Metadata } from "next";
import Link from "next/link";
import { editorialAuthor, serializeJsonLd } from "../../editorialData";
import { siteConfig } from "../../siteConfig";

export const metadata: Metadata = {
  title: editorialAuthor.name,
  description: "SEC Filing Dashboard 운영자, 개발자, 편집자 소개와 공시 분석 원칙.",
  alternates: { canonical: editorialAuthor.path },
};

export default function AuthorPage() {
  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: editorialAuthor.name,
    url: `${siteConfig.url}${editorialAuthor.path}`,
    jobTitle: editorialAuthor.role,
    worksFor: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
    },
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(personJsonLd) }} />
      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link href="/" className="text-sm font-medium text-blue-700 hover:underline">홈으로</Link>
        <header className="mt-6 border-b border-slate-200 pb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Author</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">{editorialAuthor.name}</h1>
          <p className="mt-3 text-sm text-slate-600">{editorialAuthor.role}</p>
        </header>
        <div className="mt-8 space-y-8 text-sm leading-7 text-slate-700">
          <section>
            <h2 className="text-xl font-semibold text-slate-950">담당 업무</h2>
            <p className="mt-3">
              SEC Filing Dashboard를 운영하고 자동 공시 분석 기능을 개발하며, SEC 원문과 자동 추출 결과를
              대조한 가이드와 사례 글을 작성합니다.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-950">검증 원칙</h2>
            <p className="mt-3">
              보고서 유형, 제출일, 표 제목, 기간 헤더, 단위와 부호를 순서대로 확인합니다. 자동 분석과 원문이
              다르면 SEC 원문을 우선하고, 확인 가능한 출처와 계산 근거를 글에 함께 남깁니다.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-950">역할의 한계</h2>
            <p className="mt-3">
              이 사이트의 글은 투자·법률·세무 자문이 아닙니다. 작성자는 특정 종목의 매수나 매도를 권유하지
              않으며, 중요한 판단에는 원문 공시와 자격을 갖춘 전문가의 검토가 필요합니다.
            </p>
          </section>
          <section className="border-t border-slate-200 pt-6">
            <div className="flex flex-wrap gap-4">
              <Link href="/editorial-policy" className="font-medium text-blue-700 hover:underline">편집 원칙</Link>
              <Link href="/methodology" className="font-medium text-blue-700 hover:underline">분석 방법론</Link>
              <Link href="/case-studies" className="font-medium text-blue-700 hover:underline">검증 사례</Link>
            </div>
          </section>
        </div>
      </article>
    </main>
  );
}
