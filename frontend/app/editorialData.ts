import { siteConfig } from "./siteConfig";

export type EditorialSource = {
  label: string;
  url: string;
  documentType: string;
  publishedAt?: string;
  accessionNumber?: string;
};

export type EvidenceTable = {
  title: string;
  description: string;
  columns: string[];
  rows: string[][];
};

export type CorrectionEntry = {
  date: string;
  description: string;
};

export type EditorialArticleData = {
  publishedAt: string;
  updatedAt: string;
  author: typeof editorialAuthor;
  sources: EditorialSource[];
  evidence: EvidenceTable;
  limitations: string[];
  corrections: CorrectionEntry[];
};

export const editorialAuthor = {
  name: "Lee Jae Hyun",
  role: "SEC Filing Dashboard 운영·개발·편집",
  path: "/authors/lee-jae-hyun",
};

export function formatEditorialDate(date: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function buildArticleJsonLd(article: {
  title: string;
  description: string;
  path: string;
  publishedAt: string;
  updatedAt: string;
  author: typeof editorialAuthor;
  sources: EditorialSource[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    mainEntityOfPage: `${siteConfig.url}${article.path}`,
    isAccessibleForFree: true,
    author: {
      "@type": "Person",
      name: article.author.name,
      url: `${siteConfig.url}${article.author.path}`,
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
    },
    citation: article.sources.map((source) => source.url),
  };
}

export function serializeJsonLd(data: object) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
