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
  "/privacy",
  "/terms",
  "/disclaimer",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = [
    ...staticRoutes,
    ...guideArticles.map((article) => guidePath(article.slug)),
    ...caseStudies.map((study) => caseStudyPath(study.slug)),
  ];

  return routes.map((route) => ({
    url: `${siteConfig.url}${route}`,
    lastModified: now,
    changeFrequency: route.startsWith("/guides/") || route.startsWith("/case-studies/")
      ? "weekly"
      : "monthly",
    priority: route === "" ? 1 : route.startsWith("/guides/") || route.startsWith("/case-studies/") ? 0.8 : route === "/methodology" ? 0.75 : 0.6,
  }));
}
