import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Editorial Policy",
  description:
    "Editorial standards for SEC Filing Dashboard, including source use, automated data checks, corrections, and investment disclaimer boundaries.",
  alternates: { canonical: "/editorial-policy" },
};

const policies = [
  {
    title: "원문 우선 원칙",
    body:
      "SEC Filing Dashboard의 해설은 SEC EDGAR 원문 보고서, 회사 IR 발표 자료, 공식 재무제표 표 제목을 기준으로 작성합니다. 자동 추출된 숫자는 원문 확인을 돕는 보조 정보이며, 원문과 다르면 원문을 우선합니다.",
  },
  {
    title: "자동 분석 결과 검증",
    body:
      "재무제표 표는 기간 헤더, 표 제목, 행 이름, 단위, 괄호 표기, XBRL 부호를 함께 확인합니다. 등락률이나 부호가 어색한 항목은 사례 페이지에 검증 과정을 남기고, 같은 유형의 오류가 반복되지 않도록 파서 기준을 조정합니다.",
  },
  {
    title: "투자 조언과의 구분",
    body:
      "이 사이트는 특정 증권의 매수, 매도, 보유를 권유하지 않습니다. 콘텐츠는 공시 읽기와 재무제표 확인 방법을 설명하기 위한 교육용 자료이며, 투자 판단은 사용자의 책임입니다.",
  },
  {
    title: "정정과 업데이트",
    body:
      "공식 문서와 다른 숫자, 잘못된 기간 비교, 오해를 부를 수 있는 설명을 발견하면 해당 페이지의 설명을 수정하고 관련 사례를 보강합니다. 실적 발표와 SEC 보고서는 제출 이후 수정될 수 있으므로 업데이트 시점을 함께 표시합니다.",
  },
];

export default function EditorialPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link href="/" className="text-sm font-medium text-blue-700 hover:underline">
          Back to dashboard
        </Link>

        <header className="mt-6 border-b border-slate-200 pb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Editorial policy
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            콘텐츠 작성과 데이터 검증 기준
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            이 페이지는 SEC Filing Dashboard가 공시 데이터, 실적 발표 자료, 자동 추출 결과를 어떤
            기준으로 다루는지 설명합니다.
          </p>
        </header>

        <div className="mt-8 space-y-6">
          {policies.map((policy) => (
            <section key={policy.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">{policy.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-700">{policy.body}</p>
            </section>
          ))}
        </div>

        <section className="mt-8 rounded-lg border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-700 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">관련 문서</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href="/methodology" className="font-medium text-blue-700 hover:underline">
              분석 방법론
            </Link>
            <Link href="/case-studies" className="font-medium text-blue-700 hover:underline">
              공시 검증 사례
            </Link>
            <Link href="/disclaimer" className="font-medium text-blue-700 hover:underline">
              투자 유의사항
            </Link>
          </div>
        </section>
      </article>
    </main>
  );
}
