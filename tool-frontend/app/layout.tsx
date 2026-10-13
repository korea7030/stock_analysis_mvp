import type { Metadata } from "next";
import "./globals.css";
import { toolSiteConfig } from "./siteConfig";

export const metadata: Metadata = {
  metadataBase: new URL(toolSiteConfig.toolOrigin),
  title: "SEC 공시 분석 도구",
  description: "티커와 보고서 유형으로 최근 SEC 공시의 재무제표와 핵심 지표를 확인합니다.",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: false,
    follow: true,
  },
  openGraph: {
    title: "SEC 공시 분석 도구",
    description: "최근 SEC 공시의 재무제표와 핵심 지표를 확인하는 분석 도구입니다.",
    url: toolSiteConfig.toolOrigin,
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
