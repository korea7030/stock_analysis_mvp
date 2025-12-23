import re
import warnings
from datetime import datetime

from bs4 import BeautifulSoup, XMLParsedAsHTMLWarning
from sec_downloader import Downloader

warnings.filterwarnings("ignore", category=XMLParsedAsHTMLWarning)


# ----------------------------
# 기본 스키마
# ----------------------------

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
# 숫자 파싱
# ----------------------------

_number_re = re.compile(r"-?\d[\d,]*\.?\d*")


def parse_number(text: str) -> float | None:
    text = text.strip()
    if not text:
        return None
    if text in {"—", "-", "–", "— —"}:
        return None

    neg = "(" in text and ")" in text
    m = _number_re.search(text.replace(" ", ""))
    if not m:
        return None

    try:
        val = float(m.group(0).replace(",", ""))
    except ValueError:
        return None

    return -val if neg else val


def pct_change(curr: float, prev: float) -> float | None:
    if prev is None or abs(prev) < 1e-9:
        return None
    return (curr - prev) / abs(prev) * 100.0


# ----------------------------
# Income Statement Badge
# ----------------------------

def annotate_income_html(income_html: str) -> str:
    if not income_html:
        return income_html

    soup = BeautifulSoup(income_html, "lxml")

    for tr in soup.find_all("tr"):
        tds = tr.find_all("td")
        if not tds:
            continue

        numeric_cells = []
        for td in tds:
            txt = td.get_text(" ", strip=True)
            val = parse_number(txt)
            if val is not None:
                numeric_cells.append((td, val))

        # 반드시 4개 (3M curr / prev, 9M curr / prev)
        if len(numeric_cells) < 4:
            continue

        (td_3m_curr, v3c) = numeric_cells[0]
        (_, v3p) = numeric_cells[1]
        (td_9m_curr, v9c) = numeric_cells[2]
        (_, v9p) = numeric_cells[3]

        def make_badge(pct):
            span = soup.new_tag("span")
            span["class"] = ["delta-badge"]
            if pct is None:
                span["class"].append("delta-na")
                span.string = "N/A"
                return span
            arrow = "▲" if pct > 0 else "▼" if pct < 0 else "•"
            span["class"].append("delta-up" if pct > 0 else "delta-down" if pct < 0 else "delta-flat")
            span.string = f"{arrow} {pct:+.1f}%"
            return span

        pc3 = pct_change(v3c, v3p)
        pc9 = pct_change(v9c, v9p)

        td_3m_curr.append(" ")
        td_3m_curr.append(make_badge(pc3))

        td_9m_curr.append(" ")
        td_9m_curr.append(make_badge(pc9))

    return str(soup)


# ----------------------------
# 테이블 분류 (🔥 핵심 수정)
# ----------------------------

def classify_table(table) -> str | None:
    text = table.get_text(" ", strip=True).lower()

    # 🔥 숫자 없는 테이블 제거 (TOC 방지)
    numeric_tags = table.find_all("ix:nonfraction")
    if len(numeric_tags) < 4:
        return None

    if any(k in text for k in [
        "total assets",
        "liabilities and equity",
        "liabilities and shareholders",
        "stockholders’ equity",
        "shareholders' equity",
    ]):
        return "balance_sheet"

    if any(k in text for k in [
        "net cash provided",
        "operating activities",
        "investing activities",
        "financing activities",
    ]):
        return "cash_flow"

    if any(k in text for k in [
        "net sales",
        "revenue",
        "gross margin",
        "operating income",
        "net income",
        "earnings per share",
    ]):
        return "income_statement"

    return None


# ----------------------------
# META 추출
# ----------------------------

def extract_meta(html, ticker, form):
    soup = BeautifulSoup(html, "lxml-xml")
    company = None
    period_end = None

    for tag in soup.find_all(True):
        nm = tag.attrs.get("name", "").lower()
        if "entityregistrantname" in nm:
            company = tag.get_text(strip=True)
        elif "documentperiodenddate" in nm:
            period_end = tag.get_text(strip=True)

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
# 테이블 추출
# ----------------------------

def extract_raw_tables(html):
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
# 메인 분석
# ----------------------------

def run_analysis(ticker: str, form: str = "10-Q"):
    dl = Downloader(
        company_name="Stock Analysis MVP",
        email_address="korea7030.jhl@gmail.com"
    )

    html = dl.get_filing_html(ticker=ticker, form=form)
    if isinstance(html, bytes):
        html = html.decode("utf-8", errors="ignore")
        
    # with open('test.html', 'w') as f:
    #     f.write(html)

    income_html, balance_html, cashflow_html = extract_raw_tables(html)

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