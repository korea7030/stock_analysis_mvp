import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig, stockPath, stockProfiles } from "../siteConfig";

export const metadata: Metadata = {
  title: "Stock Filing Research",
  description:
    "Browse company filing research pages for popular public companies and open the SEC filing analyzer for each ticker.",
  alternates: { canonical: "/stocks" },
};

export default function StocksPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="max-w-3xl">
          <Link href="/" className="text-sm font-medium text-blue-600 hover:underline">
            Back to dashboard
          </Link>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
            Stock Filing Research Pages
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Browse indexable company pages for public filing research. Each page links to
            {` ${siteConfig.name}`} with the ticker preloaded for interactive SEC filing analysis.
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stockProfiles.map((stock) => (
            <Link
              key={stock.ticker}
              href={stockPath(stock.ticker)}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">{stock.ticker}</h2>
                  <p className="text-sm text-slate-600">{stock.name}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">
                  {stock.sector}
                </span>
              </div>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">
                {stock.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
