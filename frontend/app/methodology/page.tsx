import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Methodology and Data Sources",
  description:
    "How SEC Filing Dashboard collects public filing data, extracts financial tables, calculates comparisons, and asks readers to verify source filings.",
  alternates: { canonical: "/methodology" },
};

const sections = [
  {
    title: "데이터를 어디에서 가져오는가",
    body: [
      "SEC Filing Dashboard는 미국 증권거래위원회 EDGAR에 공개된 기업 보고서를 중심으로 작동합니다. 사용자가 티커와 보고서 유형을 선택하면 최근 제출된 10-Q, 10-K, 8-K, 20-F, 6-K 문서를 검색하고, 문서 안에 포함된 재무제표 표를 읽어 분석 화면에 표시합니다.",
      "실적 일정과 경제지표는 외부 캘린더 데이터의 업데이트 상태에 따라 보완적으로 사용됩니다. 일정 데이터는 발표 예정 여부를 빠르게 파악하기 위한 보조 정보이며, 회사가 실제로 제출한 SEC 보고서와 투자자관계 페이지의 공식 발표 자료를 대체하지 않습니다.",
    ],
  },
  {
    title: "자동 파싱이 수행하는 일",
    body: [
      "파서는 보고서 HTML에서 손익계산서, 재무상태표, 현금흐름표로 보이는 표를 찾습니다. 표 제목, 행 이름, XBRL 태그, 숫자 셀, 기간 헤더를 함께 검토해 매출, 순이익, 현금, 자산, 부채, 영업현금흐름, 설비투자 같은 기본 항목을 추출합니다.",
      "기업마다 같은 항목을 다른 이름으로 표시하기 때문에 완전한 정답을 보장할 수는 없습니다. 예를 들어 revenue, net sales, total revenue는 비슷한 의미로 쓰일 수 있지만, segment revenue나 product revenue와는 비교 기준이 달라질 수 있습니다.",
    ],
  },
  {
    title: "등락률 계산 기준",
    body: [
      "등락률은 현재 기간 값과 비교 기간 값을 나누어 계산합니다. 손익계산서와 현금흐름표는 같은 길이의 기간끼리 비교해야 하므로 3개월은 전년 동기 3개월과, 6개월 누적은 전년 동기 6개월 누적과 비교합니다. 재무상태표는 특정일의 잔액이므로 최근 보고일과 과거 보고일의 잔액을 비교합니다.",
      "비용성 항목은 해석 방향을 별도로 처리합니다. 비용이 증가하면 숫자 변화율은 양수이지만 영업 관점에서는 부담이 커진 것이므로 시각적 표시는 불리한 변화로 보여줍니다. 반대로 비용 감소는 음수 변화율이라도 비용 부담 완화로 해석될 수 있습니다.",
    ],
  },
  {
    title: "8-K와 10-Q를 구분하는 이유",
    body: [
      "실적 발표 직후에는 회사가 보도자료를 8-K로 먼저 제출하는 경우가 많습니다. 이 문서는 빠르지만 전체 주석과 세부 재무제표가 제한적일 수 있습니다. 이후 제출되는 10-Q는 정식 분기 보고서이므로 재무제표, 주석, 리스크 업데이트, 경영진 논의가 더 상세합니다.",
      "따라서 실적 당일의 headline은 8-K로 확인하고, 회계적 검증과 세부 비교는 10-Q가 나온 뒤 다시 확인하는 흐름이 안전합니다. 두 문서의 숫자가 다르게 보이면 기간, 단위, GAAP/Non-GAAP 구분, 일회성 항목 여부를 먼저 확인해야 합니다.",
    ],
  },
  {
    title: "사용자가 직접 검증해야 하는 부분",
    body: [
      "자동 추출 결과는 원문 검토를 돕는 출발점입니다. 중요한 숫자를 발견하면 원문 SEC 보고서에서 같은 표 제목, 같은 기간, 같은 단위를 찾아 확인해야 합니다. 특히 괄호 음수, XBRL sign 속성, 주당 금액, 백만 달러 단위, 누적 기간 표시는 자동화에서 오류가 생기기 쉬운 영역입니다.",
      "이 사이트는 매수, 매도, 보유 판단을 제공하지 않습니다. 재무제표 수치와 실적 일정은 투자 판단의 일부 자료일 뿐이며, 사업 모델, 경쟁 환경, 밸류에이션, 리스크 요인, 본인의 투자 기준과 함께 검토해야 합니다.",
    ],
  },
];

export default function MethodologyPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link href="/" className="text-sm font-medium text-blue-700 hover:underline">
          Back to dashboard
        </Link>

        <header className="mt-6 border-b border-slate-200 pb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Data methodology
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            SEC 공시 데이터와 자동 분석 방법론
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            이 페이지는 사이트가 공개 공시 데이터를 어떻게 가져오고, 재무제표 표를 어떻게 해석하며,
            사용자가 어떤 절차로 원문과 대조해야 하는지 설명합니다.
          </p>
        </header>

        <div className="mt-8 space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-semibold text-slate-950">{section.title}</h2>
              <div className="mt-3 space-y-4 text-sm leading-7 text-slate-700">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-10 rounded-lg border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600">
          <p>
            관련 배경 지식은 SEC 공시 해설 가이드에서 더 자세히 볼 수 있습니다.
          </p>
          <Link href="/guides" className="mt-3 inline-block font-medium text-blue-700 hover:underline">
            가이드 목록 보기
          </Link>
        </footer>
      </article>
    </main>
  );
}
