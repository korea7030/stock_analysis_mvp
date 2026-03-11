import difflib
import os
import re
import warnings
from datetime import datetime

from bs4 import BeautifulSoup, XMLParsedAsHTMLWarning
from sec_downloader import Downloader

from backend.clients import (
    marketbeat_get_weekly_earnings,
    sec_download_filing_url,
    sec_get_exhibit_urls,
    sec_get_filing_html,
    sec_get_filing_metadatas,
)
from backend.mongo import load_section_history, save_section_history

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
            "accession_number": None,
            "source_url": None,
        },
        "metrics": {},
        "sections": {},
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
    has_inline_xbrl = len(numeric_tags) >= 4
    if not has_inline_xbrl:
        numeric_like = 0
        for td in table.find_all("td"):
            if parse_number(td.get_text(" ", strip=True)) is not None:
                numeric_like += 1
                if numeric_like >= 6:
                    break
        if numeric_like < 6:
            return None

    if any(k in text for k in [
        "total assets",
        "statement of financial position",
        "balance sheet",
        "liabilities and equity",
        "liabilities and shareholders",
        "stockholders’ equity",
        "shareholders' equity",
    ]):
        return "balance_sheet"

    if any(k in text for k in [
        "statements of cash flows",
        "statement of cash flows",
        "cash flows",
        "net cash provided",
        "operating activities",
        "investing activities",
        "financing activities",
    ]):
        return "cash_flow"

    if any(k in text for k in [
        "statements of operations",
        "statement of operations",
        "income statement",
        "statements of income",
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

    lower_html = html.lower()
    unit = None
    if "(in millions" in lower_html:
        unit = "(in millions)"
    elif "(in thousands" in lower_html:
        unit = "(in thousands)"
    elif "(in billions" in lower_html:
        unit = "(in billions)"

    return {
        "company_name": company,
        "ticker": ticker,
        "report_type": form,
        "period_end": period_end,
        "filing_date": None,
        "unit": unit,
        "accession_number": None,
        "source_url": None,
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


def _row_numeric_values(row) -> list[float]:
    values: list[float] = []
    for cell in row.find_all("td"):
        txt = cell.get_text(" ", strip=True)
        val = parse_number(txt)
        if val is not None:
            values.append(val)
    return values


def _find_row_values(table_html: str | None, keywords: list[str]) -> list[float]:
    if not table_html:
        return []
    soup = BeautifulSoup(table_html, "lxml")
    for row in soup.find_all("tr"):
        text = row.get_text(" ", strip=True).lower()
        if not text:
            continue
        if any(k in text for k in keywords):
            values = _row_numeric_values(row)
            if values:
                return values
    return []


def _metric_payload(values: list[float]) -> dict[str, float | None]:
    current = values[0] if len(values) > 0 else None
    previous = values[1] if len(values) > 1 else None
    change = None
    if current is not None and previous is not None:
        change = pct_change(current, previous)
    return {
        "current": current,
        "previous": previous,
        "change_pct": change,
    }


def extract_metrics(income_html: str | None, balance_html: str | None, cashflow_html: str | None) -> dict:
    revenue_vals = _find_row_values(
        income_html,
        [
            "total revenue",
            "revenue",
            "net sales",
            "total net sales",
            "sales",
            "turnover",
        ],
    )
    gross_profit_vals = _find_row_values(income_html, ["gross profit", "gross margin"])
    operating_income_vals = _find_row_values(
        income_html,
        [
            "operating income",
            "income from operations",
            "operating profit",
        ],
    )
    net_income_vals = _find_row_values(
        income_html,
        [
            "net income",
            "net earnings",
            "net loss",
            "profit for the period",
            "loss for the period",
            "profit attributable",
            "loss attributable",
        ],
    )
    eps_vals = _find_row_values(income_html, ["earnings per share", "basic earnings per share", "eps"])

    cash_vals = _find_row_values(balance_html, ["cash and cash equivalents", "cash equivalents", "cash"])
    assets_vals = _find_row_values(balance_html, ["total assets"])
    liabilities_vals = _find_row_values(balance_html, ["total liabilities"])
    equity_vals = _find_row_values(balance_html, ["total shareholders' equity", "stockholders' equity", "total equity"])
    debt_vals = _find_row_values(
        balance_html,
        [
            "long-term debt",
            "long term debt",
            "longterm debt",
            "borrowings",
        ],
    )

    cfo_vals = _find_row_values(cashflow_html, [
        "net cash provided by operating activities",
        "net cash from operating activities",
        "net cash used in operating activities",
        "operating activities",
    ])
    capex_vals = _find_row_values(cashflow_html, [
        "capital expenditures",
        "purchase of property",
        "purchases of property",
        "additions to property",
        "capex",
    ])

    metrics = {
        "revenue": _metric_payload(revenue_vals),
        "gross_profit": _metric_payload(gross_profit_vals),
        "operating_income": _metric_payload(operating_income_vals),
        "net_income": _metric_payload(net_income_vals),
        "eps_basic": _metric_payload(eps_vals),
        "cash_and_equivalents": _metric_payload(cash_vals),
        "total_assets": _metric_payload(assets_vals),
        "total_liabilities": _metric_payload(liabilities_vals),
        "total_equity": _metric_payload(equity_vals),
        "long_term_debt": _metric_payload(debt_vals),
        "operating_cash_flow": _metric_payload(cfo_vals),
        "capex": _metric_payload(capex_vals),
    }

    if cfo_vals and capex_vals:
        fcf_current = cfo_vals[0] + capex_vals[0] if len(cfo_vals) > 0 and len(capex_vals) > 0 else None
        fcf_previous = cfo_vals[1] + capex_vals[1] if len(cfo_vals) > 1 and len(capex_vals) > 1 else None
        change = None
        if fcf_current is not None and fcf_previous is not None:
            change = pct_change(fcf_current, fcf_previous)
        metrics["free_cash_flow"] = {
            "current": fcf_current,
            "previous": fcf_previous,
            "change_pct": change,
        }

    return metrics


_SECTION_HISTORY: dict[str, dict[str, str]] = {}


def _normalize_text_block(text: str) -> str:
    cleaned = text.replace("\r", "")
    cleaned = re.sub(r"[\t ]+", " ", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def _extract_section(text: str, patterns: list[str]) -> str | None:
    lower = text.lower()
    start = -1
    for pat in patterns:
        idx = lower.find(pat)
        if idx != -1 and (start == -1 or idx < start):
            start = idx
    if start == -1:
        return None
    item_re = re.compile(r"\bitem\s+\d+[a-z]?\b", re.IGNORECASE)
    next_match = item_re.search(lower, start + 5)
    end = next_match.start() if next_match else len(text)
    section = text[start:end].strip()
    return section[:8000]


def _diff_text(prev: str | None, curr: str | None) -> str | None:
    if not prev or not curr:
        return None
    prev_lines = prev.splitlines()
    curr_lines = curr.splitlines()
    diff_lines = list(difflib.unified_diff(prev_lines, curr_lines, lineterm=""))
    if not diff_lines:
        return None
    return "\n".join(diff_lines[:200])


def extract_sections(
    html: str,
    form: str,
    ticker: str,
    meta: dict | None = None,
) -> dict[str, str | None]:
    soup = BeautifulSoup(html, "lxml")
    text = soup.get_text("\n")
    text = _normalize_text_block(text)

    mdna_patterns = ["management's discussion and analysis", "item 7", "item 2"]
    risk_patterns = ["risk factors", "item 1a"]

    mdna = _extract_section(text, mdna_patterns)
    risk = _extract_section(text, risk_patterns)

    key = f"{form}:{ticker}"
    prev = load_section_history(ticker=ticker, form=form) or _SECTION_HISTORY.get(key, {})
    mdna_diff = _diff_text(prev.get("mdna"), mdna)
    risk_diff = _diff_text(prev.get("risk_factors"), risk)
    _SECTION_HISTORY[key] = {
        "mdna": mdna or "",
        "risk_factors": risk or "",
    }
    if mdna or risk:
        accession_number = None
        filing_date = None
        period_end = None
        source_url = None
        if isinstance(meta, dict):
            accession_number = meta.get("accession_number")
            filing_date = meta.get("filing_date")
            period_end = meta.get("period_end")
            source_url = meta.get("source_url")
        save_section_history(
            ticker=ticker,
            form=form,
            mdna=mdna or "",
            risk_factors=risk or "",
            accession_number=accession_number,
            filing_date=filing_date,
            period_end=period_end,
            source_url=source_url,
        )

    return {
        "mdna": mdna,
        "risk_factors": risk,
        "mdna_diff": mdna_diff,
        "risk_factors_diff": risk_diff,
    }


# ----------------------------
# 메인 분석
# ----------------------------

def run_analysis(ticker: str, form: str = "10-Q"):
    dl = Downloader(
        company_name="Stock Analysis MVP",
        email_address="korea7030.jhl@gmail.com"
    )
    
    html, filing_meta, source_url = _get_best_filing_html(dl, ticker=ticker, form=form)
        
    # with open('test.html', 'w') as f:
    #     f.write(html)

    income_html, balance_html, cashflow_html = extract_raw_tables(html)

    if income_html:
        income_html = annotate_income_html(income_html)

    schema = init_schema()
    schema["meta"] = extract_meta(html, ticker, form)
    if filing_meta is not None:
        schema["meta"]["filing_date"] = getattr(filing_meta, "filing_date", None)
        schema["meta"]["accession_number"] = getattr(filing_meta, "accession_number", None)
    if source_url:
        schema["meta"]["source_url"] = source_url
    schema["metrics"] = extract_metrics(income_html, balance_html, cashflow_html)
    schema["sections"] = extract_sections(html, form, ticker, schema.get("meta"))
    schema["tables"] = {
        "income_statement": income_html,
        "balance_sheet": balance_html,
        "cash_flow": cashflow_html,
    }

    return schema


def _get_best_filing_html(
    dl: object,
    *,
    ticker: str,
    form: str,
) -> tuple[str, object | None, str | None]:
    # For 6-K/8-K, the latest filing is often non-financial. Try multiple recent filings and exhibits.
    if form not in {"6-K", "8-K"}:
        return sec_get_filing_html(dl, ticker=ticker, form=form), None, None

    max_filings = int(os.getenv("SEC_MAX_FILINGS", "5"))
    metadatas = sec_get_filing_metadatas(dl, ticker=ticker, form=form, limit=max_filings)
    for meta in metadatas:
        cik = str(getattr(meta, "cik", "") or "")
        accession = str(getattr(meta, "accession_number", "") or "")
        primary = str(getattr(meta, "primary_doc_url", "") or "")

        urls: list[str] = []
        if cik and accession:
            urls.extend(sec_get_exhibit_urls(cik=cik, accession_number=accession))
        if primary:
            urls.append(primary)

        # De-dupe while preserving order
        urls = list(dict.fromkeys(urls))

        for url in urls:
            try:
                html = sec_download_filing_url(dl, url=url)
            except Exception:
                continue

            income_html, balance_html, cashflow_html = extract_raw_tables(html)
            if income_html or balance_html or cashflow_html:
                return html, meta, url

    # Fall back to latest single filing; API layer will handle "no_financial_data" if needed.
    return (
        sec_get_filing_html(dl, ticker=ticker, form=form),
        metadatas[0] if metadatas else None,
        None,
    )


def get_marketbeat_earnings():
    return marketbeat_get_weekly_earnings()
