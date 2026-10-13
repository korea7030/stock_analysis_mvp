import type { MetadataRoute } from "next";
import { caseStudies, caseStudyPath } from "./case-studies/caseStudyData";
import { guideArticles, guidePath } from "./guides/guideData";
import { siteConfig } from "./siteConfig";

export const dynamic = "force-static";

const staticRoutes = [
  "",
  "/guides",
  "/case-studies",
  "/methodology",
  "/editorial-policy",
  "/about",
  "/authors/lee-jae-hyun",
  "/privacy",
  "/terms",
  "/disclaimer",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${siteConfig.url}${route}`,
    changeFrequency: "monthly",
    priority: route === "" ? 1 : route === "/methodology" ? 0.75 : 0.6,
  }));
  const guideEntries: MetadataRoute.Sitemap = guideArticles.map((article) => ({
    url: `${siteConfig.url}${guidePath(article.slug)}`,
    lastModified: article.updatedAt,
    changeFrequency: "monthly",
    priority: 0.8,
  }));
  const caseStudyEntries: MetadataRoute.Sitemap = caseStudies.map((study) => ({
    url: `${siteConfig.url}${caseStudyPath(study.slug)}`,
    lastModified: study.updatedAt,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...staticEntries, ...guideEntries, ...caseStudyEntries];
}
