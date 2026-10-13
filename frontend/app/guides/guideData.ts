import { editorialAuthor } from "../editorialData";
import type { EditorialArticleData } from "../editorialData";

export type GuideArticle = EditorialArticleData & {
  slug: string;
  title: string;
  description: string;
  updatedAt: string;
  readingTime: string;
  sections: {
    title: string;
    body: string[];
  }[];
};

export const guideArticles = [
  {
    slug: "10q-10k-8k-difference",
    title: "10-Q, 10-K, 8-K와 실적 발표 자료를 읽는 순서",
    description:
      "미국 상장사의 연간·분기·수시 공시와 실적 보도자료가 담당하는 역할, 제출 시점, 숫자가 다르게 보이는 이유를 한 흐름으로 설명합니다.",
    publishedAt: "2026-08-07",
    updatedAt: "2026-10-13",
    readingTime: "10 min read",
    author: editorialAuthor,
    sources: [
      {
        label: "SEC EDGAR Search Filings",
        url: "https://www.sec.gov/search-filings",
        documentType: "SEC filing search and form index",
      },
      {
        label: "Investor Bulletin: How to Read an 8-K",
        url: "https://www.investor.gov/sites/default/files/readan8k.pdf",
        documentType: "SEC Office of Investor Education bulletin",
      },
      {
        label: "SEC Form 10-Q",
        url: "https://www.sec.gov/files/form10-q.pdf",
        documentType: "Official form instructions",
      },
    ],
    evidence: {
      title: "문서 역할 비교표",
      description: "실적 발표 전후에 각 문서가 제공하는 정보 범위와 확인 순서를 비교한 표입니다.",
      columns: ["문서", "주요 목적", "실적 발표 시점의 역할", "후속 확인"],
      rows: [
        ["8-K와 첨부자료", "중요 사건의 신속한 공시", "핵심 실적과 가이던스 확인", "정식 분기·연간 보고서와 대조"],
        ["10-Q", "분기 재무정보와 주석", "분기 세부 검증", "다음 10-Q 또는 10-K에서 추세 확인"],
        ["10-K", "연간 사업·위험·감사 재무제표", "연간 기준선 확인", "최근 10-Q로 이후 변화 확인"],
      ],
    },
    limitations: [
      "제출 시점과 첨부 문서 구성은 기업과 사건에 따라 달라질 수 있습니다.",
      "보고서 유형만으로 특정 숫자의 회계적 의미를 확정할 수 없으며 주석 확인이 필요합니다.",
    ],
    corrections: [],
    sections: [
      {
        title: "10-K, 10-Q, 8-K는 목적과 정보 범위가 다릅니다",
        body: [
          "10-K는 회계연도 전체를 다루는 연간 보고서입니다. 사업 설명, 리스크 요인, 감사받은 재무제표, 경영진 논의와 분석, 회계정책과 주석을 포함하므로 기업을 처음 검토할 때 가장 넓은 문맥을 제공합니다.",
          "10-Q는 분기 보고서입니다. 최근 분기의 매출과 비용, 누적 현금흐름, 분기말 재무상태, 주요 주석 변화를 확인하는 기준 문서입니다. 8-K는 실적 발표, 인수, 임원 변경, 자금 조달처럼 투자자가 즉시 알아야 할 사건을 빠르게 알리는 수시 보고서입니다.",
        ],
      },
      {
        title: "실적 보도자료는 8-K의 첨부 문서일 수 있습니다",
        body: [
          "회사가 분기 실적을 발표하면 보도자료와 프레젠테이션을 8-K의 exhibit로 제출하는 경우가 많습니다. 여기에는 매출, EPS, 사업부 실적, 가이던스와 경영진 코멘트가 빠르게 담기지만 모든 회계 주석이 포함되지는 않습니다.",
          "따라서 회사 투자자관계 페이지의 실적 자료와 8-K 본문을 별개 보고서처럼 세지 말고, 8-K의 첨부 문서인지 먼저 확인해야 합니다. 발표 자료에 나온 조정 EPS나 조정 EBITDA를 10-Q의 GAAP 순이익과 바로 비교해서도 안 됩니다.",
        ],
      },
      {
        title: "실적 발표일과 10-Q 제출일 사이에는 시간차가 있습니다",
        body: [
          "실적 발표 당일에는 8-K와 첨부 보도자료만 확인되고 정식 10-Q는 며칠 뒤 제출될 수 있습니다. 이 기간에 10-Q만 검색하면 최신 실적이 누락된 것처럼 보일 수 있습니다.",
          "발표 당일에는 8-K로 핵심 수치와 가이던스를 확인하고, 10-Q가 제출되면 재무제표 전체와 주석, 경영진 논의, 리스크 업데이트를 다시 대조하는 순서가 안전합니다. 연간 실적이라면 같은 역할을 10-K가 담당합니다.",
        ],
      },
      {
        title: "숫자가 다르면 기간, 단위, 기준, 부호를 확인합니다",
        body: [
          "첫째, 3개월과 6개월 또는 9개월 누적 값이 섞이지 않았는지 확인합니다. 둘째, 달러, 천 달러, 백만 달러, 주당 금액처럼 표시 단위가 같은지 봅니다.",
          "셋째, GAAP와 Non-GAAP 중 어느 기준인지 확인합니다. 넷째, 괄호와 마이너스 기호, gain 또는 loss 표현 때문에 부호가 반대로 해석되지 않았는지 원문 표를 확인합니다. 이 네 항목이 맞아야 두 문서의 숫자를 비교할 수 있습니다.",
        ],
      },
      {
        title: "문서 확인 순서",
        body: [
          "처음 보는 기업은 10-K로 사업 구조와 위험을 파악하고 최근 10-Q로 현재 변화를 확인합니다. 실적 발표 직후에는 최신 8-K와 첨부 자료를 확인한 다음, 뒤이어 제출된 10-Q 또는 10-K에서 같은 기간과 같은 회계 기준의 숫자를 찾습니다.",
          "워런트 부채 평가손익, 인수 관련 비용, 구조조정, 주식보상처럼 순이익을 크게 흔드는 항목은 발표 자료의 요약보다 정식 보고서의 주석을 우선합니다. 자동 추출 결과는 문서 위치를 찾는 보조 수단이며 최종 근거는 SEC 원문입니다.",
        ],
      },
    ],
  },
  {
    slug: "sec-financial-statements-checklist",
    title: "SEC 재무제표 통합 검증 체크리스트",
    description:
      "손익계산서의 기간, 재무상태표의 기준일, 현금흐름표의 누적 범위를 연결해 성장의 질과 재무 안정성을 검증하는 절차입니다.",
    publishedAt: "2026-08-07",
    updatedAt: "2026-10-13",
    readingTime: "12 min read",
    author: editorialAuthor,
    sources: [
      {
        label: "SEC Inline XBRL",
        url: "https://www.sec.gov/data-research/structured-data/inline-xbrl",
        documentType: "SEC structured-data guidance",
      },
      {
        label: "Using EDGAR to Research Investments",
        url: "https://www.sec.gov/search-filings/edgar-search-assistance/using-edgar-research-investments",
        documentType: "SEC investor research guide",
      },
    ],
    evidence: {
      title: "재무제표 교차 검증표",
      description: "각 재무제표에서 먼저 확인할 기준과 다른 표에서 이어서 검증할 항목을 정리했습니다.",
      columns: ["재무제표", "비교 기준", "핵심 확인", "교차 검증"],
      rows: [
        ["손익계산서", "같은 길이의 기간", "매출·마진·비용", "순이익과 영업현금흐름"],
        ["재무상태표", "두 기준일의 잔액", "현금·재고·매출채권·부채", "현금 사용처와 운전자본"],
        ["현금흐름표", "같은 누적 기간", "영업현금·투자·조달", "순이익 조정과 설비투자"],
      ],
    },
    limitations: [
      "이 체크리스트는 업종별 회계 특성과 기업 고유 주석을 모두 포함하지 않습니다.",
      "단순 변화율은 기저가 0이거나 부호가 바뀌는 항목에 적합하지 않습니다.",
    ],
    corrections: [],
    sections: [
      {
        title: "세 재무제표는 서로 다른 질문에 답합니다",
        body: [
          "손익계산서는 일정 기간의 매출과 비용을, 재무상태표는 특정 날짜의 자산·부채·자본 잔액을, 현금흐름표는 일정 기간 현금이 움직인 이유를 보여줍니다. 한 표만으로 기업 상태를 결론 내리면 회계상 이익과 실제 현금 흐름을 혼동할 수 있습니다.",
          "검증은 손익계산서에서 성장과 마진을 확인하고, 재무상태표에서 그 성장을 뒷받침한 자금과 운전자본을 찾은 뒤, 현금흐름표에서 이익이 현금으로 전환됐는지 확인하는 순서로 진행합니다.",
        ],
      },
      {
        title: "손익계산서는 같은 길이의 기간끼리 비교합니다",
        body: [
          "분기 보고서는 Three Months Ended와 Six 또는 Nine Months Ended를 한 표에 함께 표시할 수 있습니다. 현재 3개월은 전년 동기 3개월과, 현재 6개월 누적은 전년 동기 6개월 누적과 비교해야 합니다.",
          "매출 증가율은 (현재 매출 - 비교 매출) / 비교 매출로 계산합니다. 비용 행에도 같은 계산을 적용할 수 있지만 비용 증가는 부담 확대일 수 있으므로 매출 증가와 같은 의미의 긍정 신호로 표시하면 안 됩니다. 총이익과 영업이익까지 이어서 마진 방향을 확인해야 합니다.",
        ],
      },
      {
        title: "재무상태표는 현재 분기말과 비교 기준일을 확인합니다",
        body: [
          "재무상태표는 하루의 잔액입니다. 많은 10-Q는 현재 분기말과 직전 회계연도말을 나란히 표시하므로 전년 동기 비교라고 단정하면 안 됩니다. 각 열의 날짜를 먼저 읽고 최신 날짜 값에 변화율을 연결해야 합니다.",
          "현금, 재고, 매출채권, 차입금을 함께 봅니다. 매출보다 매출채권이나 재고가 빠르게 증가하면 회수 지연이나 수요 둔화 가능성을 검토하고, 현금 감소는 설비투자·인수·부채 상환 같은 사용처를 현금흐름표에서 찾습니다.",
        ],
      },
      {
        title: "현금흐름표는 누적 기간과 운전자본을 봅니다",
        body: [
          "현금흐름표는 10-Q에서 6개월 또는 9개월 누적으로 제시되는 경우가 많습니다. 단일 분기 손익과 누적 현금흐름을 직접 비교하지 말고 양쪽 기간을 먼저 맞춰야 합니다.",
          "순이익이 증가했지만 영업활동 현금흐름이 악화됐다면 매출채권, 재고, 매입채무, 비현금 평가손익을 확인합니다. 영업활동 현금흐름에서 설비투자를 뺀 값은 단순 잉여현금흐름 점검에 쓸 수 있지만, 기업이 정의한 조정 지표와 동일하다고 가정해서는 안 됩니다.",
        ],
      },
      {
        title: "교차 검증할 항목",
        body: [
          "매출 성장률과 매출채권 증가율, 총마진과 재고 증가, 순이익과 영업활동 현금흐름, 자사주 매입과 희석주식 수를 서로 연결해 봅니다. 숫자의 방향이 엇갈리면 주석과 경영진 논의에서 이유를 찾습니다.",
          "일회성 투자이익, 워런트 부채 평가손익, 구조조정 비용, 세금 효과는 순이익을 크게 바꿀 수 있습니다. 영업이익과 현금흐름이 같은 방향인지 확인해야 본업과 회계 조정 효과를 구분할 수 있습니다.",
        ],
      },
      {
        title: "자동 표에서는 헤더와 단위를 다시 확인합니다",
        body: [
          "자동 파서는 행 이름만 아니라 다단 헤더의 기간 그룹을 정확히 연결해야 합니다. 현재 연도가 항상 왼쪽에 있다는 가정, 숫자를 단순히 두 개씩 묶는 방식, XBRL 부호만 사용하는 방식은 기업별 표 구조에서 실패할 수 있습니다.",
          "결과가 어색하면 표 제목, 기간 그룹, 날짜, 단위, 괄호 표기 순서로 원문을 대조합니다. 같은 행의 숫자라도 기간 길이나 단위가 다르면 변화율을 계산하지 않는 것이 맞습니다.",
        ],
      },
    ],
  },
  {
    slug: "gaap-vs-non-gaap-earnings",
    title: "GAAP와 Non-GAAP 실적 조정표를 검증하는 법",
    description:
      "조정 EPS와 EBITDA가 GAAP 실적과 달라지는 이유를 확인하고 반복 비용과 워런트 부채 평가손익을 구분하는 방법입니다.",
    publishedAt: "2026-08-24",
    updatedAt: "2026-10-13",
    readingTime: "9 min read",
    author: editorialAuthor,
    sources: [
      {
        label: "SEC Non-GAAP Financial Measures C&DIs",
        url: "https://www.sec.gov/rules-regulations/staff-guidance/corporation-finance-interpretations/non-gaap-financial-measures",
        documentType: "SEC Division of Corporation Finance interpretations",
        publishedAt: "2022-12-13",
      },
      {
        label: "Conditions for Use of Non-GAAP Financial Measures",
        url: "https://www.sec.gov/rules-regulations/2003/03/conditions-use-non-gaap-financial-measures",
        documentType: "SEC Regulation G adopting release",
        publishedAt: "2003-03-28",
      },
    ],
    evidence: {
      title: "Non-GAAP 조정 검토표",
      description: "조정 항목이 실적 비교를 돕는지, 반복 비용을 가리는지 판단하기 위한 확인 순서입니다.",
      columns: ["확인 항목", "검증 질문", "위험 신호"],
      rows: [
        ["GAAP 기준점", "가장 직접 비교 가능한 GAAP 수치에서 시작하는가", "GAAP 기준 수치가 생략됨"],
        ["조정의 반복성", "과거 기간에도 같은 비용이 발생했는가", "반복 비용을 계속 일회성으로 설명"],
        ["일관성", "이익과 손실을 같은 원칙으로 조정하는가", "손실만 제외하고 유사한 이익은 유지"],
        ["세금·주식 수", "세금 효과와 EPS 분모가 설명되는가", "조정 과정과 분모가 불명확"],
      ],
    },
    limitations: [
      "Non-GAAP 지표의 유용성은 기업의 사업 모델과 조정 목적에 따라 달라집니다.",
      "이 글은 특정 조정이 회계 규정을 위반한다고 판정하는 법률 또는 회계 의견이 아닙니다.",
    ],
    corrections: [],
    sections: [
      {
        title: "GAAP 수치와 회사의 조정 지표는 목적이 다릅니다",
        body: [
          "SEC 보고서의 재무제표는 GAAP 기준으로 작성됩니다. 실적 발표 자료는 조정 EPS, 조정 EBITDA, 조정 영업이익 같은 Non-GAAP 지표를 함께 제시할 수 있습니다.",
          "조정 지표는 비현금 또는 비반복 항목을 제외해 사업 흐름을 설명하려는 목적이 있지만, 어떤 항목을 제외할지는 회사 판단이 개입됩니다. GAAP 수치보다 우월한 대체재가 아니라 별도 관점입니다.",
        ],
      },
      {
        title: "조정표를 위에서 아래로 재계산합니다",
        body: [
          "회사가 Non-GAAP 지표를 제시하면 일반적으로 GAAP 수치와의 reconciliation을 제공합니다. GAAP 순이익에서 시작해 각 조정 항목의 세전·세후 처리와 주당 효과를 따라가며 최종 조정 수치가 맞는지 확인합니다.",
          "같은 비용이 여러 조정 항목에 중복 포함되지 않았는지, 조정 EPS 계산에 사용한 희석주식 수가 GAAP EPS와 다른지, 세금 효과의 계산 기준이 설명됐는지 확인해야 합니다.",
        ],
      },
      {
        title: "반복되는 조정은 일회성으로 취급하지 않습니다",
        body: [
          "구조조정, 인수 관련 비용, 주식보상, 무형자산 상각은 조정 항목으로 자주 등장하지만 여러 분기에 반복될 수 있습니다. 매년 발생하는 비용을 계속 제외하면 실제 주주에게 귀속되는 경제적 비용이 작아 보일 수 있습니다.",
          "최근 여러 분기의 reconciliation을 나란히 놓고 동일한 조정이 반복되는지 확인합니다. 반복 빈도와 매출 대비 규모를 기록하면 회사가 말하는 일회성과 실제 비용 구조를 구분하기 쉽습니다.",
        ],
      },
      {
        title: "워런트 부채 평가손익은 영업 성과와 분리합니다",
        body: [
          "일부 기업은 워런트를 부채로 회계 처리합니다. 주가, 변동성, 만기와 행사 조건이 바뀌면 공정가치 변동이 손익계산서에 gain 또는 loss로 반영될 수 있습니다.",
          "주가 상승으로 워런트 부채 가치가 커지면 회계상 손실이 발생하고, 주가 하락 시 평가이익이 생길 수도 있습니다. 현금이 바로 움직이는 항목이 아닐 수 있으므로 매출, 영업손실, 영업활동 현금흐름과 분리해 봅니다.",
        ],
      },
      {
        title: "비교할 때 지켜야 할 기준",
        body: [
          "GAAP EPS는 GAAP EPS끼리, 조정 EPS는 같은 회사가 같은 정의로 계산한 조정 EPS끼리 비교합니다. 회사 발표 자료의 조정 수치를 자동 추출된 GAAP 재무제표 값과 직접 비교하면 기준이 달라집니다.",
          "항목명, 부호, 세금 효과, 주식 수, 반복 여부를 기록하고 최종 판단에는 8-K 첨부 자료와 10-Q 또는 10-K 주석을 함께 사용합니다.",
        ],
      },
    ],
  },
  {
    slug: "verify-automated-sec-extraction",
    title: "자동 SEC 추출 결과를 원문과 검증하는 절차",
    description:
      "자동 분석 결과가 이상할 때 보고서 선택부터 표·기간·단위·부호까지 재현 가능한 순서로 확인하는 검증 절차입니다.",
    publishedAt: "2026-08-24",
    updatedAt: "2026-10-13",
    readingTime: "9 min read",
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
      title: "재현 가능한 오류 기록 양식",
      description: "파서 문제를 보고하거나 재검증할 때 남겨야 할 최소 정보를 예시로 정리했습니다.",
      columns: ["필드", "기록 예시", "확인 목적"],
      rows: [
        ["문서", "10-Q · accession · 제출일", "다른 보고서 선택 방지"],
        ["표와 행", "표 제목 · 행 이름", "공식 재무제표 여부 확인"],
        ["기간", "Three Months Ended · 두 날짜", "동일 기간 비교 확인"],
        ["값", "단위 · 원문 값 · 추출 값", "단위와 부호 오류 분리"],
      ],
    },
    limitations: [
      "기업별 확장 XBRL 태그와 비표준 HTML 구조는 자동 규칙만으로 완전히 일반화할 수 없습니다.",
      "수정 제출된 보고서는 이전 accession과 값이 달라질 수 있으므로 최신 문서를 다시 확인해야 합니다.",
    ],
    corrections: [],
    sections: [
      {
        title: "보고서 유형과 제출 시점을 먼저 확인합니다",
        body: [
          "결과 화면에서 티커, 보고서 유형, 제출일, period end, SEC 원문 링크를 먼저 기록합니다. 최신 실적이 발표됐더라도 10-Q가 아직 제출되지 않았다면 8-K 첨부 자료만 존재할 수 있습니다.",
          "같은 기업의 8-K, 10-Q, 10-K를 하나의 최신 문서처럼 취급하지 않습니다. 기대한 수치가 없다면 파서 오류를 결론 내리기 전에 어느 문서에 그 수치가 실제로 포함되는지 확인합니다.",
        ],
      },
      {
        title: "공식 재무제표를 선택했는지 확인합니다",
        body: [
          "SEC 문서에는 공식 재무제표 외에도 세그먼트 표, 비GAAP 조정표, 주석 표가 포함됩니다. Condensed Consolidated Statements of Operations, Balance Sheets, Cash Flows처럼 표 제목과 문서 위치를 확인합니다.",
          "자동 결과의 행 이름이 맞더라도 선택된 표가 세그먼트 또는 조정표라면 값의 의미가 달라집니다. 원문에서 표 제목과 주변 섹션 제목을 함께 대조해야 합니다.",
        ],
      },
      {
        title: "다단 헤더를 기간 그룹별로 다시 묶습니다",
        body: [
          "Three Months Ended와 Six 또는 Nine Months Ended가 한 표에 있으면 먼저 기간 그룹을 나누고 각 그룹 안에서 현재와 과거 날짜를 연결합니다. 열의 물리적 순서만으로 현재 값을 정하지 않습니다.",
          "등락률은 같은 길이의 기간 두 개가 모두 있을 때만 계산하고 최신 날짜 값에 연결합니다. 재무상태표는 기간 길이가 아니라 두 기준일의 잔액 비교라는 점도 별도로 처리합니다.",
        ],
      },
      {
        title: "단위와 부호를 화면 값과 대조합니다",
        body: [
          "표의 in thousands, in millions, except per share amounts 문구를 확인합니다. 주당 금액과 총액을 같은 단위로 취급하거나 문서 간 단위를 맞추지 않으면 숫자가 크게 달라집니다.",
          "음수는 괄호, 마이너스 기호, XBRL sign 속성, gain 또는 loss 항목명으로 표현될 수 있습니다. 한 신호만으로 부호를 정하지 말고 화면 텍스트와 XBRL 정보를 함께 봅니다.",
        ],
      },
      {
        title: "검증 결과를 재현 가능하게 기록합니다",
        body: [
          "문제가 있는 값마다 원문 URL, 보고서 유형, 제출일, 표 제목, 행 이름, 기간 헤더, 표시 단위, 원문 값, 추출 값을 기록합니다. 가능하면 같은 표의 정상 행도 대조군으로 남깁니다.",
          "이 기록이 있으면 보고서 선택 오류, 기간 매핑 오류, 부호 오류, 단위 오류를 구분할 수 있습니다. 단순히 숫자가 다르다는 제보보다 수정과 회귀 테스트에 직접 사용할 수 있습니다.",
        ],
      },
      {
        title: "자동 분석의 한계",
        body: [
          "기업마다 표 제목, 행 이름, 헤더 병합, XBRL 태그 사용 방식이 달라 모든 문서를 동일한 규칙으로 완벽하게 해석할 수는 없습니다. 자동 결과는 검토 우선순위를 정하는 보조 정보입니다.",
          "중요한 투자 또는 회계 판단에서는 SEC 원문과 회사 IR 자료, 주석을 우선합니다. 원문 자체가 수정 제출된 경우에는 최신 accession과 amendment 여부도 확인해야 합니다.",
        ],
      },
    ],
  },
] satisfies GuideArticle[];

export function guidePath(slug: string) {
  return `/guides/${slug}`;
}
