import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { siteConfig, stockPath, stockProfiles } from "../../siteConfig";

type StockPageProps = {
  params: Promise<{
    ticker: string;
  }>;
};

export const dynamicParams = false;

function getStock(ticker: string) {
  const normalized = ticker.toUpperCase();
  return stockProfiles.find((stock) => stock.ticker === normalized);
}

export function generateStaticParams() {
  return stockProfiles.map((stock) => ({
    ticker: stock.ticker.toLowerCase(),
  }));
}

export async function generateMetadata({ params }: StockPageProps): Promise<Metadata> {
  const { ticker } = await params;
  const stock = getStock(ticker);
  if (!stock) {
    return {
      title: "Stock Filing Research",
    };
  }

  return {
    title: `${stock.ticker} SEC Filing Analysis`,
    description: `${stock.name} filing research page with SEC filing analyzer access, financial statement extraction, earnings context, and original filing review links.`,
    alternates: {
      canonical: stockPath(stock.ticker),
    },
    openGraph: {
      title: `${stock.ticker} SEC Filing Analysis`,
      description: stock.description,
      url: `${siteConfig.url}${stockPath(stock.ticker)}`,
      type: "article",
    },
  };
}

export default async function StockPage({ params }: StockPageProps) {
  const { ticker } = await params;
  const stock = getStock(ticker);
  if (!stock) notFound();

  const analyzerHref = `/?ticker=${encodeURIComponent(stock.ticker)}&form=10-Q`;
  const secSearchHref = `https://www.sec.gov/edgar/search/#/q=${encodeURIComponent(stock.ticker)}`;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link href="/stocks" className="font-medium text-blue-600 hover:underline">
            Stocks
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-500">{stock.ticker}</span>
        </div>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {stock.sector}
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                {stock.name} ({stock.ticker}) SEC Filing Analysis
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
                {stock.description}
              </p>
            </div>
            <Link
              href={analyzerHref}
              className="inline-flex h-10 shrink-0 items-center justify-center rounded bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800"
            >
              Analyze {stock.ticker}
            </Link>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Financial Statements</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Open the analyzer to extract income statement, balance sheet, and cash flow tables
              from recent public filings when structured tables are available.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Key Metrics</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Review automatically extracted revenue, profitability, cash flow, assets,
              liabilities, equity, and period-over-period changes.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Original Filing Review</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Use source links and SEC search to verify extracted values against original company
              filings before relying on any data.
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">
            How to research {stock.ticker} filings
          </h2>
          <div className="mt-4 grid gap-4 text-sm leading-6 text-slate-600 md:grid-cols-2">
            <div>
              <h3 className="font-semibold text-slate-900">Start with recent 10-Q or 10-K filings</h3>
              <p className="mt-1">
                Quarterly and annual filings usually contain the most complete financial statements.
                Use the dashboard to compare current and prior reported periods.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Verify important figures</h3>
              <p className="mt-1">
                Automated parsing is useful for screening, but original filings remain the source of
                record. Check the company filing when a metric looks unusual.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Watch cash flow and balance sheet changes</h3>
              <p className="mt-1">
                Revenue and earnings are only part of the picture. Cash generation, debt, equity,
                and asset changes can explain the quality of reported results.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Compare context over time</h3>
              <p className="mt-1">
                Stored analysis history can help show trends after multiple filing periods have been
                analyzed and cached by the service.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={analyzerHref}
              className="inline-flex h-10 items-center justify-center rounded bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800"
            >
              Open analyzer
            </Link>
            <a
              href={secSearchHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center rounded border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Search SEC filings
            </a>
          </div>
        </section>

        <p className="mt-6 text-xs leading-5 text-slate-400">
          This page is informational and is not investment advice. Filing metrics may be incomplete
          or incorrect when automated extraction cannot interpret a filing table.
        </p>
      </div>
    </main>
  );
}
