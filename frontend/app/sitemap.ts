import type { MetadataRoute } from "next";
import { guideArticles, guidePath } from "./guides/guideData";
import { siteConfig, stockPath, stockProfiles } from "./siteConfig";

export const dynamic = "force-static";

const staticRoutes = [
  "",
  "/stocks",
  "/guides",
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
    ...stockProfiles.map((stock) => stockPath(stock.ticker)),
  ];

  return routes.map((route) => ({
    url: `${siteConfig.url}${route}`,
    lastModified: now,
    changeFrequency: route.startsWith("/stocks/") || route.startsWith("/guides/")
      ? "weekly"
      : "monthly",
    priority: route === "" ? 1 : route.startsWith("/guides/") ? 0.8 : route.startsWith("/stocks/") ? 0.7 : 0.6,
  }));
}
