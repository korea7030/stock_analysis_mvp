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
    slug: "aapl-2026-q3-balance-sheet-date-order",
    title: "Apple 8-K 재무상태표에서 최신 날짜 열을 판별하는 법",
    description:
      "Apple 2026년 3분기 실적 8-K를 예로 들어 재무상태표의 현재 잔액, 비교 잔액, 등락률 표시 위치를 검증합니다.",
    publishedAt: "2026-10-18",
    updatedAt: "2026-10-18",
    author: editorialAuthor,
    sources: [
      {
        label: "Apple 2026 Q3 earnings Form 8-K",
        url: "https://www.sec.gov/Archives/edgar/data/320193/000032019326000018/0000320193-26-000018-index.htm",
        documentType: "SEC Form 8-K filing index",
        publishedAt: "2026-07-30",
        accessionNumber: "0000320193-26-000018",
      },
      {
        label: "Apple 2026 Q3 earnings release exhibit",
        url: "https://www.sec.gov/Archives/edgar/data/320193/000032019326000018/a8-kex991q3202606272026.htm",
        documentType: "SEC Form 8-K Exhibit 99.1",
        publishedAt: "2026-07-30",
        accessionNumber: "0000320193-26-000018",
      },
      {
        label: "Apple 2026 Q3 Form 10-Q",
        url: "https://www.sec.gov/Archives/edgar/data/320193/000032019326000020/aapl-20260627.htm",
        documentType: "SEC Form 10-Q",
        publishedAt: "2026-07-31",
        accessionNumber: "0000320193-26-000020",
      },
    ],
    evidence: {
      title: "Apple 재무상태표 기준일별 재계산",
      description: "단위는 백만 달러입니다. 변화율은 2026년 6월 27일 잔액과 2025년 9월 27일 잔액을 비교한 값이며 전년 동기 비교가 아닙니다.",
      columns: ["항목", "2026-06-27", "2025-09-27", "재계산"],
      rows: [
        ["현금 및 현금성자산", "39,544", "35,934", "+10.0%"],
        ["매출채권", "31,398", "39,777", "-21.1%"],
        ["재고자산", "11,092", "5,718", "+94.0%"],
        ["총자산", "383,266", "359,241", "+6.7%"],
        ["총부채", "275,746", "285,508", "-3.4%"],
        ["총주주자본", "107,520", "73,733", "+45.8%"],
      ],
    },
    limitations: [
      "두 열은 분기말과 직전 회계연도말 잔액이므로 전년 동기 성장률로 해석할 수 없습니다.",
      "잔액 변화만으로 원인을 확정할 수 없으며 현금흐름표와 재무제표 주석을 함께 확인해야 합니다.",
      "실적 발표 Exhibit 99.1의 표는 빠른 확인용이며 다음 날 제출된 10-Q가 더 상세한 기준 문서입니다.",
    ],
    corrections: [],
    sections: [
      {
        title: "실적 8-K의 실제 표는 Exhibit 99.1에 있습니다",
        body: [
          "Apple은 2026년 7월 30일 Item 2.02 실적 8-K를 제출했습니다. 8-K 본문은 2026년 6월 27일 종료 분기의 실적 발표를 알리고, 손익계산서·재무상태표·현금흐름표는 Exhibit 99.1에 첨부합니다.",
          "먼저 ticker와 form만 확인하지 말고 accession 0000320193-26-000018, filing date, Exhibit 99.1을 함께 확인해야 다른 8-K나 본문 표지를 재무제표로 오인하지 않습니다.",
        ],
      },
      {
        title: "재무상태표는 기간이 아니라 두 기준일을 비교합니다",
        body: [
          "Apple 표의 왼쪽 열은 2026년 6월 27일, 오른쪽 열은 2025년 9월 27일입니다. 손익계산서처럼 Three Months Ended나 Nine Months Ended를 비교하는 표가 아니라 각 날짜 시점의 자산·부채·자본 잔액입니다.",
          "따라서 총자산 383,266과 359,241의 +6.7%는 약 9개월 동안의 잔액 변화입니다. 이를 전년 동기 성장률이나 단일 분기 증가율이라고 부르면 기간 의미가 달라집니다.",
        ],
      },
      {
        title: "등락률은 최신 날짜 값에 표시해야 합니다",
        body: [
          "현재값은 단순히 특정 연도나 화면 방향으로 추측하지 않고 두 날짜 중 더 최근 날짜로 결정합니다. 이 표에서는 2026년 6월 27일 값이 현재값이므로 모든 등락률 배지는 왼쪽 숫자 셀에 붙어야 합니다.",
          "과거값 35,934 옆에 현금 증가율 +10.0%를 표시하면 계산식이 맞더라도 표시 기준은 틀립니다. 반대로 열 순서가 과거에서 현재로 배치된 다른 기업에서는 오른쪽 최신 날짜 셀에 배지를 붙여야 합니다.",
        ],
      },
      {
        title: "숫자 셀 순서만으로 비교하면 안 됩니다",
        body: [
          "헤더 연결 없이 숫자 셀을 두 개씩 묶으면 공백 셀, 통화 기호, colspan 때문에 현재값과 과거값 위치를 뒤집을 수 있습니다. 날짜 헤더가 어느 열 범위를 덮는지 먼저 계산한 뒤 해당 범위의 숫자와 연결해야 합니다.",
          "검증 순서는 공식 표 제목 확인, 두 기준일 읽기, 최신 날짜 선택, 같은 행의 잔액 두 개 재계산, 최신 날짜 셀의 배지 위치 확인입니다. 날짜를 연결할 수 없다면 등락률을 추정하지 않는 것이 안전합니다.",
        ],
      },
    ],
  },
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
      title: "AMD 손익계산서 기간별 재계산",
      description: "원문 단위는 백만 달러입니다. 변화율은 (2026년 값 - 2025년 값) / 2025년 값 × 100으로 계산하고 소수점 둘째 자리에서 반올림했습니다.",
      columns: ["검증 항목", "2026", "2025", "재계산"],
      rows: [
        ["3개월 매출", "11,536", "7,685", "(11,536 - 7,685) / 7,685 = +50.1%"],
        ["6개월 매출", "21,789", "15,123", "(21,789 - 15,123) / 15,123 = +44.1%"],
        ["3개월 매출원가", "5,073", "4,366", "(5,073 - 4,366) / 4,366 = +16.2%"],
        ["6개월 매출원가", "9,649", "7,817", "(9,649 - 7,817) / 7,817 = +23.4%"],
        ["3개월 매출총이익", "6,203", "3,059", "(6,203 - 3,059) / 3,059 = +102.8%"],
        ["6개월 매출총이익", "11,619", "6,795", "(11,619 - 6,795) / 6,795 = +71.0%"],
      ],
    },
    limitations: [
      "이 표는 기간 열 연결과 산술을 검증하는 예시이며 AMD 전체 실적의 투자 판단을 제공하지 않습니다.",
      "변화율은 원문 공시 수치로 직접 재계산한 값이므로 AMD가 다른 기준으로 제시하는 조정 지표와 다를 수 있습니다.",
      "SEC가 수정 보고서를 제출하면 accession과 원문 수치를 다시 확인해야 합니다.",
    ],
    corrections: [],
    sections: [
      {
        title: "문제는 숫자가 아니라 기간 그룹입니다",
        body: [
          "AMD의 2026년 2분기 10-Q 손익계산서는 Three Months Ended와 Six Months Ended를 같은 표 안에 배치합니다. 이 구조에서는 첫 번째 숫자쌍이 분기 실적 비교이고, 두 번째 숫자쌍이 6개월 누적 실적 비교입니다.",
          "Net revenue 행을 보면 3개월 값은 2026년 6월 27일 기준 11,536, 2025년 6월 28일 기준 7,685입니다. 6개월 누적 값은 2026년 6월 27일 기준 21,789, 2025년 6월 28일 기준 15,123입니다.",
          "원문의 실제 열 순서는 3개월 2026, 3개월 2025, 6개월 2026, 6개월 2025입니다. 연도만 읽고 인접하지 않은 열을 묶거나, 두 번째 기간 그룹의 시작 위치를 놓치면 서로 길이가 다른 기간을 비교하게 됩니다.",
        ],
      },
      {
        title: "원문에서 재현하는 순서",
        body: [
          "먼저 문서가 2026년 6월 27일 종료 분기의 Form 10-Q인지 accession 0000002488-26-000123으로 확인합니다. 다음으로 Part I, Item 1의 Condensed Consolidated Statements of Operations를 열고 표 단위가 주당 금액을 제외한 백만 달러인지 확인합니다.",
          "그다음 Three Months Ended 아래의 두 날짜와 Six Months Ended 아래의 두 날짜를 각각 하나의 그룹으로 표시합니다. Net revenue, Cost of sales, Gross profit 행을 읽을 때도 이 네 열의 위치를 그대로 유지해야 합니다.",
          "마지막으로 각 그룹에서 2026년 값을 현재값, 2025년 값을 비교값으로 사용합니다. 이 순서를 지키면 화면의 등락률이 어느 셀에 붙어야 하는지도 함께 검증할 수 있습니다.",
        ],
      },
      {
        title: "등락률은 최신 날짜 셀에 붙어야 합니다",
        body: [
          "자동 분석에서 흔한 오류는 네 개 숫자를 단순히 왼쪽부터 두 개씩 묶지 않고, 헤더 행의 날짜와 연결하지 못하는 것입니다. 6개월 누적 비교의 등락률은 2026년 6월 27일 값인 21,789 쪽에 표시되어야 합니다.",
          "만약 2025년 6월 28일 값에 등락률이 표시된다면 비교 기준이 뒤집힌 것입니다. 사용자는 표 제목, 기간 헤더, 행 이름을 함께 보고 같은 기간끼리 비교됐는지 확인해야 합니다.",
          "3개월 매출 변화율은 (11,536 - 7,685) / 7,685로 +50.1%이고, 6개월 매출 변화율은 (21,789 - 15,123) / 15,123으로 +44.1%입니다. 두 결과가 바뀌거나 2025년 셀 옆에 표시되면 기간 매핑 또는 표시 위치 오류입니다.",
        ],
      },
      {
        title: "잘못된 열 결합을 숫자로 식별하는 법",
        body: [
          "예를 들어 6개월 현재값 21,789를 3개월 전년값 7,685와 비교하면 +183.5%가 됩니다. 원문에 없는 이 비율은 서로 다른 기간 길이를 결합했다는 신호입니다. 반대로 (15,123 - 21,789) / 21,789처럼 기준을 뒤집으면 -30.6%가 되어 성장 방향까지 반대로 보입니다.",
          "따라서 검증은 숫자가 계산 가능한지만 보는 것으로 끝나지 않습니다. 분자와 분모가 같은 기간 길이인지, 현재값이 분자 쪽에 있는지, 결과가 현재 연도 셀에 표시되는지를 모두 통과해야 합니다.",
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
        label: "IonQ 2026 Q2 earnings Form 8-K",
        url: "https://www.sec.gov/Archives/edgar/data/1824920/000119312526335040/0001193125-26-335040-index.htm",
        documentType: "SEC Form 8-K filing index",
        publishedAt: "2026-08-05",
        accessionNumber: "0001193125-26-335040",
      },
      {
        label: "IonQ 2026 Q2 earnings release exhibit",
        url: "https://www.sec.gov/Archives/edgar/data/1824920/000119312526335040/ionq-ex99_1.htm",
        documentType: "SEC Form 8-K Exhibit 99.1",
        publishedAt: "2026-08-05",
        accessionNumber: "0001193125-26-335040",
      },
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
      description: "단위는 천 달러입니다. 괄호는 음수입니다. 문서, 표, 기간, 조정 범위가 모두 같을 때만 숫자를 직접 비교할 수 있습니다.",
      columns: ["문서·표", "기간", "표시값", "검증 결과"],
      rows: [
        ["8-K Exhibit 99.1 · 손익계산서", "2026년 2분기 3개월", "(1,649,115)", "워런트 부채 공정가치 변동 손실"],
        ["8-K Exhibit 99.1 · 손익계산서", "2026년 상반기 6개월", "(591,487)", "누적 워런트 부채 공정가치 변동 손실"],
        ["8-K Exhibit 99.1 · 현금흐름표", "2026년 상반기 6개월", "591,487", "비현금 손실을 순손실에 다시 더하는 조정"],
        ["8-K Exhibit 99.1 · Non-GAAP 조정표", "2026년 2분기 3개월", "1,576,198", "워런트 외 항목도 포함하는 공정가치 측정 조정"],
        ["8-K Exhibit 99.1 · Non-GAAP 조정표", "2026년 상반기 6개월", "523,635", "3개월 수치와 직접 비교할 수 없는 누적 조정"],
      ],
    },
    limitations: [
      "세 표는 기간과 조정 범위가 달라 숫자를 서로 같은 항목으로 직접 비교할 수 없습니다.",
      "Non-GAAP 공정가치 조정에는 워런트 이외 항목이 포함될 수 있으므로 조정표 정의를 함께 확인해야 합니다.",
      "8-K Exhibit 99.1은 회사가 제공한 실적 발표 자료이며, 이후 제출된 10-Q의 재무제표와 주석이 더 상세한 정식 분기 공시입니다.",
    ],
    corrections: [],
    sections: [
      {
        title: "8-K와 10-Q는 같은 목적의 문서가 아닙니다",
        body: [
          "실적 발표 자료는 빠른 요약을 위해 만들어지고, 8-K에 첨부되는 경우가 많습니다. 10-Q는 SEC에 제출되는 정식 분기 보고서로 재무제표와 주석의 범위가 더 넓습니다.",
          "IonQ처럼 워런트 부채 평가손익이 있는 기업은 발표 자료와 10-Q에서 항목 위치, 부호, 조정 방식이 다르게 보일 수 있습니다. 따라서 문서 유형을 먼저 구분해야 합니다.",
          "이 사례의 실적 발표 자료는 2026년 8월 5일 제출된 8-K accession 0001193125-26-335040의 Exhibit 99.1입니다. 8-K 본문은 Item 2.02와 Item 9.01에서 실적 발표와 첨부 문서를 가리키고, 실제 재무 표는 Exhibit 99.1에 있습니다.",
        ],
      },
      {
        title: "세 숫자는 같은 값의 오기가 아닙니다",
        body: [
          "손익계산서의 (1,649,115)는 2026년 2분기 3개월 동안 인식한 워런트 부채 공정가치 변동 손실입니다. 같은 행의 (591,487)는 2026년 상반기 6개월 누적 손실이므로 기간이 다릅니다. 괄호를 제거해 양수로 표시하면 손실이라는 의미가 사라집니다.",
          "현금흐름표의 591,487은 6개월 누적 순손실에서 비현금 워런트 평가손실을 되돌리는 조정입니다. 손익계산서의 (591,487)과 절댓값은 같지만 현금흐름 간접법에서는 다시 더하므로 양수입니다.",
          "Non-GAAP 조정표의 1,576,198은 3개월 수치이지만 워런트 부채만을 뜻하지 않습니다. 표의 명칭도 changes in fair value measurements이며 회사 정의에는 워런트 부채, 조건부 대가, 투자자산 등 반복 측정 항목이 포함됩니다.",
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
        title: "원문에서 재현하는 순서",
        body: [
          "먼저 8-K filing index에서 Item 2.02와 Exhibit 99.1을 확인합니다. 첨부 자료의 Condensed Consolidated Statements of Operations에서 Three Months Ended와 Six Months Ended 열을 나누고 괄호 표기를 유지합니다.",
          "다음으로 Condensed Consolidated Statements of Cash Flows가 Six Months Ended 표인지 확인합니다. 여기의 591,487은 현금 유출액이 아니라 net income (loss)를 net cash used in operating activities로 조정하는 비현금 가산 항목입니다.",
          "마지막으로 Net Loss to Adjusted EBITDA와 Net Loss per Share to Adjusted EPS 조정표의 기간을 확인합니다. 3개월 1,576,198과 6개월 523,635를 워런트 부채 단일 항목으로 치환하지 않아야 합니다.",
        ],
      },
      {
        title: "자동 추출 결과는 네 축으로 판정합니다",
        body: [
          "워런트 부채 행은 gain, loss, change in fair value 같은 단어가 섞여 있어 자동 파서가 부호를 잘못 해석하기 쉬운 항목입니다. 괄호 표기와 XBRL sign 속성을 같이 확인해야 합니다.",
          "숫자가 예상과 다르면 문서 유형, 표 이름, 기간 길이, 조정 범위를 차례로 확인합니다. 이 네 축 중 하나라도 다르면 숫자가 다르다는 사실만으로 파서 오류라고 판정할 수 없습니다.",
          "반대로 10-Q 손익계산서의 3개월 워런트 평가손익이 양수 1,649,115로 표시되거나, 현금흐름표의 591,487을 3개월 값으로 표시한다면 각각 부호 오류와 기간 오류입니다. 자동 분석 결과보다 SEC 원문을 우선합니다.",
        ],
      },
    ],
  },
  {
    slug: "sec-filing-dashboard-parser-limitations",
    title: "SEC 자동 파서가 틀릴 수 있는 상황과 확인 순서",
    description:
      "AMD 기간 매핑과 IonQ 부호 사례를 바탕으로 자동 재무제표 추출 결과를 진단하는 순서를 설명합니다.",
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
      {
        label: "AMD 2026 Q2 Form 10-Q",
        url: "https://www.sec.gov/Archives/edgar/data/2488/000000248826000123/amd-20260627.htm",
        documentType: "SEC Form 10-Q period-mapping example",
        publishedAt: "2026-08-05",
        accessionNumber: "0000002488-26-000123",
      },
      {
        label: "IonQ 2026 Q2 Form 10-Q",
        url: "https://www.sec.gov/Archives/edgar/data/1824920/000119312526341001/ionq-20260630.htm",
        documentType: "SEC Form 10-Q sign-handling example",
        publishedAt: "2026-08-10",
        accessionNumber: "0001193125-26-341001",
      },
    ],
    evidence: {
      title: "파서 단계별 판정표",
      description: "화면 증상을 수정하기 전에 어느 처리 단계에서 원문 의미가 달라졌는지 분리합니다.",
      columns: ["처리 단계", "사용 신호", "실패 증상", "판정 기준"],
      rows: [
        ["문서 선택", "form·accession·filing date", "다른 분기 또는 다른 8-K가 표시됨", "SEC filing index와 화면 메타데이터 일치"],
        ["표 선택", "표 제목·핵심 행·숫자 밀도·iXBRL 태그", "세그먼트·조정표·목차가 표시됨", "공식 재무제표 제목과 Item 1 위치 확인"],
        ["기간 매핑", "colspan·날짜·Months Ended", "등락률이 과거 열이나 누적 열에 표시됨", "같은 기간 길이의 최신·과거 날짜끼리 비교"],
        ["부호 복원", "괄호·마이너스·iXBRL sign", "손실이 양수로 표시됨", "화면 값과 XBRL sign을 함께 확인"],
        ["단위 해석", "in millions·in thousands·per share", "값이 1,000배 이상 차이남", "표 단위와 행별 주당 표시 확인"],
        ["배지 표시", "현재값·과거값·비용 행 여부", "정상 계산이 잘못된 색으로 표시됨", "수치 방향과 경제적 방향을 분리"],
      ],
    },
    limitations: [
      "진단표는 오류 유형을 분류하지만 개별 문서의 올바른 값을 자동으로 확정하지 않습니다.",
      "XBRL 태그 자체가 잘못되거나 수정 제출된 경우에는 최신 SEC 원문을 기준으로 다시 검증해야 합니다.",
      "표 구조가 손상되었거나 날짜 헤더와 숫자 열을 연결할 수 없으면 등락률을 추정하지 않는 것이 안전합니다.",
    ],
    corrections: [],
    sections: [
      {
        title: "1단계: 보고서와 표를 먼저 확정합니다",
        body: [
          "화면의 ticker와 form만 맞는지 보는 것으로는 부족합니다. SEC filing index에서 filing date, period of report, accession을 확인해야 같은 기업이 같은 날 제출한 여러 8-K 중 실적 보고서를 구분할 수 있습니다.",
          "현재 파서는 각 HTML 표에서 제목 키워드, 핵심 행 이름, 숫자 행 수, iXBRL 태그 수, 기간 문구를 점수화합니다. 목차나 보조 데이터 표에는 감점을 주고 기준 점수 이상인 후보 중 가장 높은 표를 손익계산서, 재무상태표, 현금흐름표로 선택합니다.",
          "점수화는 후보를 좁히는 방법이지 회계적 진위를 보장하지 않습니다. 사용자는 원문의 Part I, Item 1에서 Condensed Consolidated Statements of Operations, Balance Sheets, Cash Flows 같은 공식 제목을 다시 확인해야 합니다.",
        ],
      },
      {
        title: "2단계: 날짜를 숫자 열에 연결합니다",
        body: [
          "3개월, 6개월, 9개월, 연간 기간이 한 표에 함께 들어가면 연도 순서만으로 현재와 과거를 판단할 수 없습니다. 화면 처리기는 colspan을 포함한 열 좌표를 만들고 상단 날짜 범위를 각 숫자 셀에 연결한 뒤, 같은 기간 그룹 안에서 더 최근 날짜를 현재값으로 선택합니다.",
          "AMD 사례에서는 열 순서가 3개월 2026, 3개월 2025, 6개월 2026, 6개월 2025입니다. 매출 11,536과 7,685를 비교한 +50.1%, 21,789와 15,123을 비교한 +44.1%가 각각 2026년 셀에 표시되어야 합니다.",
          "날짜 범위를 연결하지 못하면 연도 순서를 사용하는 보조 경로가 작동하지만, 헤더가 비정형이거나 기간 그룹이 불완전하면 잘못 묶일 수 있습니다. 이 경우 배지를 표시하지 않고 원문 확인을 요구하는 편이 잘못된 수치를 보여주는 것보다 안전합니다.",
        ],
      },
      {
        title: "3단계: 부호를 표시 문자열과 XBRL에서 함께 읽습니다",
        body: [
          "음수는 괄호, 마이너스 기호, iXBRL sign 속성으로 표시될 수 있습니다. 서버는 sign이 음수인데 화면 문자열에 부호가 없으면 괄호를 복원하고, 화면은 괄호를 음수로 다시 파싱합니다.",
          "IonQ 10-Q의 워런트 부채 공정가치 변동 손실은 3개월 (1,649,115), 6개월 (591,487)입니다. 같은 591,487이 현금흐름표에서 양수인 이유는 비현금 손실을 순손실에 다시 더하는 조정이기 때문이며, 부호만 보고 둘 중 하나를 오류로 판정하면 안 됩니다.",
          "행 이름에 gain과 loss가 함께 있으면 텍스트 감성으로 부호를 결정할 수 없습니다. 원문 괄호, XBRL sign, 표의 역할을 함께 확인해야 합니다.",
        ],
      },
      {
        title: "4단계: 단위와 경제적 방향을 분리합니다",
        body: [
          "표 상단의 in millions, in thousands와 except per share amounts를 먼저 읽습니다. 단위가 다른 표의 숫자를 직접 비교하거나 주당 수치를 매출과 같은 규모로 취급하면 1,000배 이상의 오류가 생깁니다.",
          "등락률의 수학적 방향과 경제적 해석도 다를 수 있습니다. 매출 증가는 일반적으로 상승 방향이지만 매출원가나 영업비용 증가는 같은 양수 변화율이어도 비용 부담 증가로 표시해야 합니다.",
          "비교 기준값이 0이면 유한한 변화율을 계산할 수 없습니다. 이 경우 0%로 단정하지 말고 N/A 또는 비교 불가로 처리해야 합니다.",
        ],
      },
      {
        title: "사용자가 따라 할 최종 확인 순서",
        body: [
          "첫째 accession과 보고 기간을 맞춥니다. 둘째 공식 재무제표 제목을 찾습니다. 셋째 기간 그룹과 날짜를 숫자 열 위에 표시합니다. 넷째 괄호와 XBRL sign을 확인합니다. 다섯째 표 단위와 주당 항목을 구분합니다.",
          "그 후에만 (현재값 - 과거값) / |과거값|으로 등락률을 재계산합니다. 계산값, 배지 위치, 비용 행의 색상 중 하나라도 원문 의미와 다르면 화면 결과를 확정값으로 사용하지 않습니다.",
          "원문 구조가 불완전하거나 비교 열이 하나뿐이면 추정값을 만들지 않습니다. 해당 행의 배지를 생략하고 SEC 원문 링크를 제공하는 것이 올바른 실패 방식입니다.",
        ],
      },
    ],
  },
] satisfies CaseStudy[];

export function caseStudyPath(slug: string) {
  return `/case-studies/${slug}`;
}
