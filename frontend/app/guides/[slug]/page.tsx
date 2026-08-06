import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { guideArticles, guidePath } from "../guideData";
import { siteConfig } from "../../siteConfig";

type GuidePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamicParams = false;

function getGuide(slug: string) {
  return guideArticles.find((article) => article.slug === slug);
}

export function generateStaticParams() {
  return guideArticles.map((article) => ({
    slug: article.slug,
  }));
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getGuide(slug);
  if (!article) {
    return { title: "SEC Filing Guide" };
  }

  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: guidePath(article.slug) },
    openGraph: {
      title: article.title,
      description: article.description,
      url: `${siteConfig.url}${guidePath(article.slug)}`,
      type: "article",
    },
  };
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { slug } = await params;
  const article = getGuide(slug);
  if (!article) notFound();

  return (
    <main className="min-h-screen bg-slate-50">
      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link href="/guides" className="font-medium text-blue-700 hover:underline">
            Guides
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-500">{article.readingTime}</span>
        </div>

        <header className="mt-6 border-b border-slate-200 pb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Updated {article.updated}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            {article.title}
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">{article.description}</p>
        </header>

        <div className="mt-8 space-y-8">
          {article.sections.map((section) => (
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
            이 글은 투자 조언이 아니라 SEC 공시를 직접 검토하기 위한 교육용 자료입니다. 중요한
            숫자는 원문 SEC 보고서, 회사 IR 자료, 회계 주석과 함께 확인해야 합니다.
          </p>
          <Link href="/" className="mt-3 inline-block font-medium text-blue-700 hover:underline">
            분석 도구로 이동
          </Link>
        </footer>
      </article>
    </main>
  );
}
