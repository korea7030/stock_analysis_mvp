import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { siteConfig } from "./siteConfig";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        {children}
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <Link href="/" className="font-medium text-slate-700 hover:underline">
                {siteConfig.name}
              </Link>
              <span className="ml-2">SEC filings and financial statement research tools.</span>
            </div>
            <nav className="flex flex-wrap gap-x-4 gap-y-2">
              <Link href="/stocks" className="hover:text-slate-900 hover:underline">Stocks</Link>
              <Link href="/about" className="hover:text-slate-900 hover:underline">About</Link>
              <Link href="/privacy" className="hover:text-slate-900 hover:underline">Privacy</Link>
              <Link href="/terms" className="hover:text-slate-900 hover:underline">Terms</Link>
              <Link href="/disclaimer" className="hover:text-slate-900 hover:underline">Disclaimer</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
