import type { MetadataRoute } from "next";
import { siteConfig, stockPath, stockProfiles } from "./siteConfig";

export const dynamic = "force-static";

const staticRoutes = [
  "",
  "/stocks",
  "/about",
  "/privacy",
  "/terms",
  "/disclaimer",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = [
    ...staticRoutes,
    ...stockProfiles.map((stock) => stockPath(stock.ticker)),
  ];

  return routes.map((route) => ({
    url: `${siteConfig.url}${route}`,
    lastModified: now,
    changeFrequency: route.startsWith("/stocks/") ? "weekly" : "monthly",
    priority: route === "" ? 1 : route.startsWith("/stocks/") ? 0.7 : 0.6,
  }));
}
