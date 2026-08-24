import type { MetadataRoute } from "next";
import { guideArticles, guidePath } from "./guides/guideData";
import { siteConfig } from "./siteConfig";

export const dynamic = "force-static";

const staticRoutes = [
  "",
  "/stocks",
  "/guides",
  "/methodology",
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
  ];

  return routes.map((route) => ({
    url: `${siteConfig.url}${route}`,
    lastModified: now,
    changeFrequency: route.startsWith("/guides/")
      ? "weekly"
      : "monthly",
    priority: route === "" ? 1 : route.startsWith("/guides/") ? 0.8 : route === "/methodology" ? 0.75 : 0.6,
  }));
}
