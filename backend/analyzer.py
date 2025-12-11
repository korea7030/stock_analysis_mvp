import re
import warnings
from datetime import datetime

from bs4 import BeautifulSoup, XMLParsedAsHTMLWarning
from sec_downloader import Downloader

warnings.filterwarnings("ignore", category=XMLParsedAsHTMLWarning)


def init_schema():
    return {
        "meta": {
            "company_name": None,
            "ticker": None,
            "report_type": None,
            "period_end": None,
            "filing_date": None,
            "unit": None,
        },
        "tables": {
            "income_statement": None,
            "balance_sheet": None,
            "cash_flow": None,
        },
        "last_updated": datetime.now().isoformat(),
    }


# ----------------------------
# 테이블 분류
# ----------------------------

def classify_table(table) -> str | None:
    """테이블 텍스트 기반으로 재무제표 종류 판별"""
    txt = table.get_text(" ", strip=True).lower()

    # Balance Sheet 우선
    if any(k in txt for k in [
        "total assets", "liabilities and shareholders",
        "liabilities and stockholders",
        "shareholders' equity", "shareholders’ equity",
    ]):
        return "balance_sheet"

    # Cash Flow
    if any(k in txt for k in [
        "operating activities", "investing activities",
        "financing activities", "net cash provided",
        "net cash used",
    ]):
        return "cash_flow"

    # Income Statement
    if any(k in txt for k in [
        "net sales", "revenue", "gross margin",
        "operating income", "net income", "earnings per share",
    ]):
        return "income_statement"

    return None


# ----------------------------
# META 정보 추출
# ----------------------------

def extract_meta(html, ticker, form):
    soup = BeautifulSoup(html, "lxml-xml")
    company = None
    period_end = None

    for tag in soup.find_all(True):
        nm = tag.attrs.get("name", "").lower()
        txt = tag.get_text(strip=True)
        if "entityregistrantname" in nm:
            company = txt
        elif "documentperiodenddate" in nm:
            period_end = txt

    unit = "(in millions)" if "(in millions" in html.lower() else None

    return {
        "company_name": company,
        "ticker": ticker,
        "report_type": form,
        "period_end": period_end,
        "filing_date": None,
        "unit": unit,
    }


# ----------------------------
# 숫자 파싱 / 증감 계산
# ----------------------------

_number_re = re.compile(r"-?\d[\d,]*\.?\d*")


def parse_number(text: str) -> float | None:
    """
    '66,613', '(1,234)', '—', '-' 이런 문자열을 float 로 변환.
    숫자가 없으면 None.
    """
    text = text.strip()
    if not text:
        return None
    # 대쉬류는 0 또는 없음 취급
    if text in {"—", "-", "–", "— —"}:
        return None

    neg = False
    if "(" in text and ")" in text:
        neg = True

    m = _number_re.search(text.replace(" ", ""))
    if not m:
        return None

    num = m.group(0).replace(",", "")
    try:
        val = float(num)
    except ValueError:
        return None

    return -val if neg else val


def pct_change(curr: float, prev: float) -> float | None:
    """
    전년 대비 증감률. prev 가 0 이거나 None 이면 None.
    """
    if prev is None or abs(prev) < 1e-9:
        return None
    return (curr - prev) / abs(prev) * 100.0


def annotate_income_html(income_html: str) -> str:
    """
    Income Statement 원본 HTML 안에
    3M / 9M YoY 증감 뱃지(span)를 주입한다.

    가정: 각 행에서 숫자 셀 4개 순서가
          [3M 25, 3M 24, 9M 25, 9M 24]
    """
    if not income_html:
        return income_html

    soup = BeautifulSoup(income_html, "lxml")

    for tr in soup.find_all("tr"):
        tds = tr.find_all("td")
        if not tds:
            continue

        numeric_cells: list[tuple[any, float]] = []

        for td in tds:
            txt = td.get_text(" ", strip=True)
            # $ 같은 셀은 스킵
            if not txt or txt == "$":
                continue
            val = parse_number(txt)
            if val is None:
                continue
            numeric_cells.append((td, val))

        # 숫자 4개(3M25, 3M24, 9M25, 9M24)가 안 되는 행은 스킵
        if len(numeric_cells) < 4:
            continue

        (td_3m_curr, v_3m_curr) = numeric_cells[0]
        (_, v_3m_prev) = numeric_cells[1]
        (td_9m_curr, v_9m_curr) = numeric_cells[2]
        (_, v_9m_prev) = numeric_cells[3]

        pc_3m = pct_change(v_3m_curr, v_3m_prev)
        pc_9m = pct_change(v_9m_curr, v_9m_prev)

        def make_badge(pct: float | None):
            span = soup.new_tag("span")
            if pct is None:
                span["class"] = ["delta-badge", "delta-na"]
                span.string = "N/A"
                return span

            arrow = "▲" if pct > 0 else ("▼" if pct < 0 else "■")
            if abs(pct) < 0.1:
                css = ["delta-badge", "delta-flat"]
            elif pct > 0:
                css = ["delta-badge", "delta-up"]
            else:
                css = ["delta-badge", "delta-down"]

            span["class"] = css
            span.string = f"{arrow} {pct:+.1f}%"
            return span

        # 3M 현재 값 셀에 뱃지 추가
        td_3m_curr.append(" ")
        td_3m_curr.append(make_badge(pc_3m))

        # 9M 현재 값 셀에 뱃지 추가
        td_9m_curr.append(" ")
        td_9m_curr.append(make_badge(pc_9m))

    return str(soup)


# ----------------------------
# 테이블 HTML 추출
# ----------------------------

def extract_raw_tables(html):
    """HTML 전체에서 재무제표 3개를 원본 HTML로 추출"""
    soup = BeautifulSoup(html, "lxml")

    income_html = None
    balance_html = None
    cashflow_html = None

    for table in soup.find_all("table"):
        section = classify_table(table)
        if not section:
            continue

        table_html = str(table)

        if section == "income_statement" and income_html is None:
            income_html = table_html
        elif section == "balance_sheet" and balance_html is None:
            balance_html = table_html
        elif section == "cash_flow" and cashflow_html is None:
            cashflow_html = table_html

    return income_html, balance_html, cashflow_html


# ----------------------------
# 메인
# ----------------------------

def run_analysis(ticker: str, form: str = "10-Q"):
    # SEC 정책상 company_name + email 필수
    dl = Downloader(company_name="Stock Analysis MVP",
                    email_address="korea7030.jhl@gmail.com")
    html = dl.get_filing_html(ticker=ticker, form=form)

    if isinstance(html, bytes):
        html = html.decode("utf-8", errors="ignore")

    income_html, balance_html, cashflow_html = extract_raw_tables(html)

    # 🔥 Income Statement 에만 우선 증감 뱃지 삽입
    if income_html:
        income_html = annotate_income_html(income_html)

    schema = init_schema()
    schema["meta"] = extract_meta(html, ticker, form)
    schema["tables"] = {
        "income_statement": income_html,
        "balance_sheet": balance_html,
        "cash_flow": cashflow_html,
    }

    return schema