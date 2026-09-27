/* eslint-disable @next/next/no-html-link-for-pages -- Full reload clears AdSense on excluded routes. */
import type { Metadata } from "next";
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
              <a href="/" className="font-medium text-slate-700 hover:underline">
                {siteConfig.name}
              </a>
              <span className="ml-2">SEC filings and financial statement research tools.</span>
            </div>
            <nav className="flex flex-wrap gap-x-4 gap-y-2">
              <a href="/guides" className="hover:text-slate-900 hover:underline">Guides</a>
              <a href="/case-studies" className="hover:text-slate-900 hover:underline">Case Studies</a>
              <a href="/methodology" className="hover:text-slate-900 hover:underline">Methodology</a>
              <a href="/editorial-policy" className="hover:text-slate-900 hover:underline">Editorial Policy</a>
              <a href="/about" className="hover:text-slate-900 hover:underline">About</a>
              <a href="/privacy" className="hover:text-slate-900 hover:underline">Privacy</a>
              <a href="/terms" className="hover:text-slate-900 hover:underline">Terms</a>
              <a href="/disclaimer" className="hover:text-slate-900 hover:underline">Disclaimer</a>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
