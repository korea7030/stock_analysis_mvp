import type { Metadata } from "next";
/* eslint-disable @next/next/no-html-link-for-pages -- Full reload clears AdSense on excluded routes. */
import { notFound } from "next/navigation";
import { caseStudies, caseStudyPath } from "../caseStudyData";
import { siteConfig } from "../../siteConfig";
import { PublisherAdSense } from "../../PublisherAdSense";

type CaseStudyPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamicParams = false;

function getCaseStudy(slug: string) {
  return caseStudies.find((study) => study.slug === slug);
}

export function generateStaticParams() {
  return caseStudies.map((study) => ({
    slug: study.slug,
  }));
}

export async function generateMetadata({ params }: CaseStudyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const study = getCaseStudy(slug);
  if (!study) return { title: "SEC Filing Case Study" };

  return {
    title: study.title,
    description: study.description,
    alternates: { canonical: caseStudyPath(study.slug) },
    openGraph: {
      title: study.title,
      description: study.description,
      url: `${siteConfig.url}${caseStudyPath(study.slug)}`,
      type: "article",
    },
  };
}

export default async function CaseStudyPage({ params }: CaseStudyPageProps) {
  const { slug } = await params;
  const study = getCaseStudy(slug);
  if (!study) notFound();

  return (
    <main className="min-h-screen bg-slate-50">
      <PublisherAdSense />
      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <a href="/case-studies" className="font-medium text-blue-700 hover:underline">
            Case studies
          </a>
          <span className="text-slate-300">/</span>
          <span className="text-slate-500">{study.updated}</span>
        </div>

        <header className="mt-6 border-b border-slate-200 pb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Source-based review
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            {study.title}
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">{study.description}</p>
          <a
            href={study.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex text-sm font-medium text-blue-700 hover:underline"
          >
            Source: {study.sourceLabel}
          </a>
        </header>

        <div className="mt-8 space-y-8">
          {study.sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-semibold text-slate-950">{section.title}</h2>
              <div className="mt-3 space-y-4 text-sm leading-7 text-slate-700">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-10 rounded-lg border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600">
          <p>
            이 사례는 투자 조언이 아니라 자동 추출 결과를 원문과 대조하는 방법을 설명하기 위한
            교육용 자료입니다.
          </p>
          <a href="/methodology" className="mt-3 inline-block font-medium text-blue-700 hover:underline">
            분석 방법론 보기
          </a>
        </footer>
      </article>
    </main>
  );
}
