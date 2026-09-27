import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SEC 공시 분석 도구",
  description: "티커와 보고서 유형으로 최근 SEC 공시의 재무제표와 핵심 지표를 확인합니다.",
  alternates: { canonical: "/tools/sec-filing" },
  robots: {
    index: false,
    follow: true,
  },
};

export default function SecFilingToolLayout({ children }: { children: React.ReactNode }) {
  return children;
}
