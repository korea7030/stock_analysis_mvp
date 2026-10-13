import { editorialAuthor } from "../editorialData";
import type { EditorialArticleData } from "../editorialData";

export type CaseStudy = EditorialArticleData & {
  slug: string;
  title: string;
  description: string;
  sections: {
    title: string;
    body: string[];
  }[];
};

export const caseStudies = [
  {
    slug: "amd-2026-q2-income-statement-periods",
    title: "AMD 2026년 2분기 손익계산서에서 기간 비교가 틀어지는 지점",
    description:
      "AMD 10-Q 손익계산서를 예로 들어 3개월 실적과 6개월 누적 실적의 비교 위치를 확인하는 방법입니다.",
    publishedAt: "2026-09-08",
    updatedAt: "2026-10-13",
    author: editorialAuthor,
    sources: [
      {
        label: "AMD 2026 Q2 Form 10-Q",
        url: "https://www.sec.gov/Archives/edgar/data/2488/000000248826000123/amd-20260627.htm",
        documentType: "SEC Form 10-Q",
        publishedAt: "2026-08-05",
        accessionNumber: "0000002488-26-000123",
      },
      {
        label: "AMD filing detail",
        url: "https://www.sec.gov/Archives/edgar/data/2488/000000248826000123/0000002488-26-000123-index.html",
        documentType: "SEC filing index",
        publishedAt: "2026-08-05",
        accessionNumber: "0000002488-26-000123",
      },
    ],
    evidence: {
      title: "AMD 매출 기간별 재계산",
      description: "원문 단위는 백만 달러입니다. 각 변화율은 같은 길이의 현재 기간과 전년 동기 값을 사용했습니다.",
      columns: ["기간", "2026", "2025", "재계산"],
      rows: [
        ["Three Months Ended", "11,536", "7,685", "+50.1%"],
        ["Six Months Ended", "21,789", "15,123", "+44.1%"],
      ],
    },
    limitations: [
      "이 표는 매출 열 연결을 검증하는 예시이며 AMD 전체 실적의 투자 판단을 제공하지 않습니다.",
      "SEC가 수정 보고서를 제출하면 accession과 원문 수치를 다시 확인해야 합니다.",
    ],
    corrections: [],
    sections: [
      {
        title: "문제는 숫자가 아니라 기간 그룹입니다",
        body: [
          "AMD의 2026년 2분기 10-Q 손익계산서는 Three Months Ended와 Six Months Ended를 같은 표 안에 배치합니다. 이 구조에서는 첫 번째 숫자쌍이 분기 실적 비교이고, 두 번째 숫자쌍이 6개월 누적 실적 비교입니다.",
          "Net revenue 행을 보면 3개월 값은 2026년 6월 27일 기준 11,536, 2025년 6월 28일 기준 7,685입니다. 6개월 누적 값은 2026년 6월 27일 기준 21,789, 2025년 6월 28일 기준 15,123입니다.",
        ],
      },
      {
        title: "등락률은 최신 날짜 셀에 붙어야 합니다",
        body: [
          "자동 분석에서 흔한 오류는 네 개 숫자를 단순히 왼쪽부터 두 개씩 묶지 않고, 헤더 행의 날짜와 연결하지 못하는 것입니다. 6개월 누적 비교의 등락률은 2026년 6월 27일 값인 21,789 쪽에 표시되어야 합니다.",
          "만약 2025년 6월 28일 값에 등락률이 표시된다면 비교 기준이 뒤집힌 것입니다. 사용자는 표 제목, 기간 헤더, 행 이름을 함께 보고 같은 기간끼리 비교됐는지 확인해야 합니다.",
        ],
      },
      {
        title: "비용 행은 색상 해석이 다릅니다",
        body: [
          "Cost of sales나 operating expenses처럼 비용성 항목은 증가율이 양수라도 영업 관점에서는 부담이 커진 것입니다. 그래서 변화율 숫자와 시각적 방향을 분리해서 해석해야 합니다.",
          "매출 증가와 비용 증가를 같은 초록색 상승으로 보면 마진 변화를 잘못 읽을 수 있습니다. AMD처럼 매출과 비용이 함께 증가하는 경우에는 gross profit과 operating income까지 이어서 확인해야 합니다.",
        ],
      },
    ],
  },
  {
    slug: "ionq-8k-10q-warrant-liability",
    title: "IonQ 실적 발표와 10-Q에서 워런트 부채 항목을 비교하는 법",
    description:
      "IonQ 사례로 8-K 실적 발표 자료와 10-Q 정식 보고서의 항목 표시 차이를 점검합니다.",
    publishedAt: "2026-09-08",
    updatedAt: "2026-10-13",
    author: editorialAuthor,
    sources: [
      {
        label: "IonQ 2026 Q2 earnings release",
        url: "https://investors.ionq.com/news/news-details/2026/IonQ-Announces-Record-Second-Quarter-2026-Revenues-Growing-287-YoY/default.aspx",
        documentType: "Company investor-relations release",
        publishedAt: "2026-08-05",
      },
      {
        label: "IonQ 2026 Q2 Form 10-Q",
        url: "https://www.sec.gov/Archives/edgar/data/1824920/000119312526341001/ionq-20260630.htm",
        documentType: "SEC Form 10-Q",
        publishedAt: "2026-08-10",
        accessionNumber: "0001193125-26-341001",
      },
      {
        label: "IonQ filing detail",
        url: "https://www.sec.gov/Archives/edgar/data/1824920/000119312526341001/0001193125-26-341001-index.html",
        documentType: "SEC filing index",
        publishedAt: "2026-08-10",
        accessionNumber: "0001193125-26-341001",
      },
    ],
    evidence: {
      title: "IonQ 워런트 관련 표시값 비교",
      description: "단위는 천 달러입니다. 같은 경제적 사건도 표의 기간과 현금흐름 조정 방향에 따라 부호와 금액이 달라집니다.",
      columns: ["표", "기간", "표시값", "해석"],
      rows: [
        ["손익계산서", "2026년 2분기 3개월", "(1,649,115)", "워런트 부채 공정가치 변동 손실"],
        ["현금흐름표", "2026년 상반기 6개월", "591,487", "순손실에서 비현금 손실을 되돌리는 조정"],
        ["Non-GAAP 조정표", "2026년 2분기 3개월", "1,576,198", "워런트 등을 포함한 공정가치 측정 조정"],
      ],
    },
    limitations: [
      "세 표는 기간과 조정 범위가 달라 숫자를 서로 같은 항목으로 직접 비교할 수 없습니다.",
      "Non-GAAP 공정가치 조정에는 워런트 이외 항목이 포함될 수 있으므로 조정표 정의를 함께 확인해야 합니다.",
    ],
    corrections: [],
    sections: [
      {
        title: "8-K와 10-Q는 같은 목적의 문서가 아닙니다",
        body: [
          "실적 발표 자료는 빠른 요약을 위해 만들어지고, 8-K에 첨부되는 경우가 많습니다. 10-Q는 SEC에 제출되는 정식 분기 보고서로 재무제표와 주석의 범위가 더 넓습니다.",
          "IonQ처럼 워런트 부채 평가손익이 있는 기업은 발표 자료와 10-Q에서 항목 위치, 부호, 조정 방식이 다르게 보일 수 있습니다. 따라서 문서 유형을 먼저 구분해야 합니다.",
        ],
      },
      {
        title: "워런트 부채 평가손익은 영업 성과가 아닐 수 있습니다",
        body: [
          "Gain or loss on change in fair value of warrant liabilities는 주가, 변동성, 만기, 행사 조건에 따라 움직일 수 있는 비현금성 평가 항목입니다. 이 항목은 매출 성장이나 고객 계약 증가와 분리해서 읽어야 합니다.",
          "순이익이 크게 흔들릴 때 이 항목이 포함되어 있으면 영업손실, 현금흐름, 현금 보유액을 함께 봐야 합니다. 발표 자료의 조정 지표만 보면 실제 GAAP 손익과 차이가 커질 수 있습니다.",
        ],
      },
      {
        title: "자동 추출 결과는 원문 표와 대조해야 합니다",
        body: [
          "워런트 부채 행은 gain, loss, change in fair value 같은 단어가 섞여 있어 자동 파서가 부호를 잘못 해석하기 쉬운 항목입니다. 괄호 표기와 XBRL sign 속성을 같이 확인해야 합니다.",
          "숫자가 예상과 다르면 자동 분석 결과보다 원문 문서를 우선합니다. 특히 8-K 발표 자료와 10-Q 재무제표를 같은 문서처럼 비교하면 안 됩니다.",
        ],
      },
    ],
  },
  {
    slug: "sec-filing-dashboard-parser-limitations",
    title: "SEC 자동 파서가 틀릴 수 있는 상황과 확인 순서",
    description:
      "자동 재무제표 추출 결과가 원문과 다르게 보일 때 사용자가 확인해야 할 실무 절차입니다.",
    publishedAt: "2026-09-08",
    updatedAt: "2026-10-13",
    author: editorialAuthor,
    sources: [
      {
        label: "SEC EDGAR Search Filings",
        url: "https://www.sec.gov/search-filings",
        documentType: "SEC filing search",
      },
      {
        label: "SEC Inline XBRL",
        url: "https://www.sec.gov/data-research/structured-data/inline-xbrl",
        documentType: "SEC structured-data guidance",
      },
      {
        label: "Accessing EDGAR Data",
        url: "https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data",
        documentType: "SEC EDGAR data access guidance",
      },
    ],
    evidence: {
      title: "파서 실패 유형과 확인 위치",
      description: "자동 추출 결과가 원문과 다를 때 원인을 분리하기 위한 진단표입니다.",
      columns: ["실패 유형", "화면 증상", "원문 확인 위치"],
      rows: [
        ["표 선택", "세그먼트 또는 조정표 값이 표시됨", "표 제목과 문서 섹션"],
        ["기간 매핑", "등락률이 과거 열이나 누적 열에 표시됨", "다단 헤더와 날짜"],
        ["부호", "손실이 양수로 표시됨", "괄호·항목명·XBRL sign"],
        ["단위", "값이 1,000배 또는 1,000,000배 차이", "표 상단 단위와 주당 표시"],
      ],
    },
    limitations: [
      "진단표는 오류 유형을 분류하지만 개별 문서의 올바른 값을 자동으로 확정하지 않습니다.",
      "XBRL 태그 자체가 잘못되거나 수정 제출된 경우에는 최신 SEC 원문을 기준으로 다시 검증해야 합니다.",
    ],
    corrections: [],
    sections: [
      {
        title: "표 선택 오류",
        body: [
          "SEC 보고서에는 공식 재무제표 외에도 세그먼트 표, 비GAAP 조정표, 주석 표가 많이 포함됩니다. 자동 파서는 표 제목과 행 이름을 점수화해 손익계산서, 재무상태표, 현금흐름표를 고르지만 항상 완벽하지는 않습니다.",
          "사용자는 원문에서 표 제목을 먼저 확인해야 합니다. Condensed Consolidated Statements of Operations, Balance Sheets, Cash Flows처럼 공식 재무제표 제목인지 보는 것이 첫 단계입니다.",
        ],
      },
      {
        title: "기간 헤더 해석 오류",
        body: [
          "3개월, 6개월, 9개월, 연간 기간이 한 표에 함께 들어가면 단순한 열 순서만으로는 현재와 과거를 판단하기 어렵습니다. 날짜 헤더를 읽어 같은 길이의 기간끼리 비교해야 합니다.",
          "현재 연도가 오른쪽에 있는 기업도 있고 왼쪽에 있는 기업도 있습니다. 자동 분석 결과에서 등락률 위치가 어색하면 헤더 행과 숫자 행을 같이 대조해야 합니다.",
        ],
      },
      {
        title: "부호와 단위 오류",
        body: [
          "음수는 괄호, 마이너스 기호, XBRL sign 속성으로 표시될 수 있습니다. 화면에 표시된 값이 원문과 반대로 보이면 이 세 가지를 확인해야 합니다.",
          "단위도 중요합니다. In millions, in thousands, except per share amounts가 섞이면 같은 표 안에서도 행마다 의미가 달라질 수 있습니다. 주당 금액은 매출이나 현금흐름과 직접 비교하지 않습니다.",
        ],
      },
    ],
  },
] satisfies CaseStudy[];

export function caseStudyPath(slug: string) {
  return `/case-studies/${slug}`;
}
