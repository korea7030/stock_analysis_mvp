import os
import re
import warnings
from datetime import datetime
from typing import Any

from bs4 import BeautifulSoup, XMLParsedAsHTMLWarning
from sec_downloader import Downloader

from .clients import (
    get_weekly_earnings,
    sec_download_filing_url,
    sec_get_exhibit_urls,
    sec_get_filing_html,
    sec_get_filing_metadatas,
)

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
    if abs(prev) < 1e-9:
        return None
    return (curr - prev) / abs(prev) * 100.0


def _iter_row_numeric_cells(row):
    # iXBRL 공시는 모든 실제 재무 숫자를 <ix:nonfraction>으로 태깅하므로,
    # 라벨 셀의 각주 번호 "(1)"이 음수로 잘못 잡히지 않도록 그 시그널을 우선 신뢰한다.
    has_ix = bool(row.find("ix:nonfraction"))
    for td in row.find_all("td"):
        if has_ix and not td.find("ix:nonfraction"):
            continue
        txt = td.get_text(" ", strip=True)
        val = parse_number(txt)
        if val is None:
            continue
        yield td, val


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

        numeric_cells = list(_iter_row_numeric_cells(tr))

        # 반드시 4개 (3M curr / prev, 9M curr / prev)
        if len(numeric_cells) < 4:
            continue

        (td_3m_curr, v3c) = numeric_cells[0]
        (_, v3p) = numeric_cells[1]
        (td_9m_curr, v9c) = numeric_cells[2]
        (_, v9p) = numeric_cells[3]

        def make_badge(pct):
            span = soup.new_tag("span")

            existing = span.get("class")
            if isinstance(existing, list):
                class_str = " ".join(str(c) for c in existing)
            elif isinstance(existing, str):
                class_str = existing
            else:
                class_str = ""

            def add_class(class_name: str) -> None:
                nonlocal class_str
                classes = [c for c in class_str.split(" ") if c]
                if class_name not in classes:
                    classes.append(class_name)
                class_str = " ".join(classes)

            add_class("delta-badge")
            if pct is None:
                add_class("delta-na")
                span["class"] = class_str
                span.string = "N/A"
                return span
            arrow = "▲" if pct > 0 else "▼" if pct < 0 else "•"
            add_class("delta-up" if pct > 0 else "delta-down" if pct < 0 else "delta-flat")
            span["class"] = class_str
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
# META 추출
# ----------------------------

MetaDict = dict[str, str | None]


def extract_meta(html: str, ticker: str, form: str) -> MetaDict:
    soup = BeautifulSoup(html, "lxml-xml")
    company = None
    period_end = None

    for tag in soup.find_all(True):
        nm = str(tag.attrs.get("name") or "").lower()
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


INCOME_MIN_SCORE = 5
BALANCE_MIN_SCORE = 4
CASHFLOW_MIN_SCORE = 4


def _table_text_with_context(table) -> str:
    table_text = table.get_text(" ", strip=True).lower()
    prev = table.find_previous(
        [
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
            "p",
            "div",
            "center",
            "b",
            "strong",
        ]
    )
    prev_text = prev.get_text(" ", strip=True).lower() if prev else ""
    if len(prev_text) > 200:
        prev_text = ""
    return f"{prev_text} {table_text}".strip()


def _table_features(table) -> dict[str, float | int | bool | str]:
    text = _table_text_with_context(table)
    link_count = len(table.find_all("a"))
    ix_count = len(table.find_all("ix:nonfraction"))

    numeric_cells_total = 0
    numeric_rows_with_2 = 0
    nonempty_cells = 0
    for tr in table.find_all("tr"):
        row_numeric = 0
        for td in tr.find_all("td"):
            cell_text = td.get_text(" ", strip=True)
            if cell_text:
                nonempty_cells += 1
            if parse_number(cell_text) is not None:
                numeric_cells_total += 1
                row_numeric += 1
        if row_numeric >= 2:
            numeric_rows_with_2 += 1

    numeric_ratio = (numeric_cells_total / nonempty_cells) if nonempty_cells else 0.0
    toc_flag = (
        ("table of contents" in text)
        or ("contents" in text and "table" in text)
        or (re.search(r"\bpart\s+[ivx]+\b", text) is not None)
        or ((re.search(r"\bitem\s+\d+[a-z]?\b", text) is not None) and (text.count("item ") >= 3))
    )
    period_cue = any(
        substr in text
        for substr in [
            "three months ended",
            "six months ended",
            "nine months ended",
            "year ended",
            "years ended",
            "as of",
            "unaudited",
        ]
    )
    non_primary_flag = any(
        substr in text
        for substr in [
            "selected financial data",
            "quarterly data",
            "supplementary",
            # Avoid matching unrelated strings like "S&P 500 Index".
            "index to financial",
        ]
    )

    return {
        "text": text,
        "link_count": link_count,
        "ix_count": ix_count,
        "numeric_cells_total": numeric_cells_total,
        "numeric_rows_with_2": numeric_rows_with_2,
        "nonempty_cells": nonempty_cells,
        "numeric_ratio": numeric_ratio,
        "toc_flag": toc_flag,
        "period_cue": period_cue,
        "non_primary_flag": non_primary_flag,
    }


def _score_base(f: dict[str, float | int | bool | str]) -> int:
    """Base score shared across all statement kinds."""
    score = 0
    if bool(f["toc_flag"]):
        score -= 6
    if bool(f["non_primary_flag"]):
        score -= 2
    if int(f["link_count"]) >= 10 and float(f["numeric_ratio"]) < 0.20:
        score -= 3

    numeric_cells_total = int(f["numeric_cells_total"])
    numeric_rows_with_2 = int(f["numeric_rows_with_2"])
    ix_count = int(f["ix_count"])

    if numeric_cells_total >= 10:
        score += 2
    elif numeric_cells_total >= 6:
        score += 1
    if numeric_rows_with_2 >= 3:
        score += 2
    elif numeric_rows_with_2 >= 2:
        score += 1
    if ix_count >= 8:
        score += 2
    elif ix_count >= 4:
        score += 1

    return score


def _score_income(f: dict[str, float | int | bool | str]) -> int:
    text = str(f["text"])
    score = _score_base(f)

    if any(
        k in text
        for k in [
            "statements of operations",
            "statement of operations",
            "income statement",
            "statements of income",
            "statements of earnings",
        ]
    ):
        score += 3

    line_score = 0
    if "revenue" in text or "net sales" in text:
        line_score += 1
    if "net income" in text or "net loss" in text:
        line_score += 1
    if "gross profit" in text:
        line_score += 1
    if "operating income" in text:
        line_score += 1
    if "earnings per share" in text:
        line_score += 1
    if "cost of revenue" in text or "cost of sales" in text:
        line_score += 1
    score += min(line_score, 4)

    if bool(f["period_cue"]):
        score += 1
    return score


def _score_balance(f: dict[str, float | int | bool | str]) -> int:
    text = str(f["text"])
    score = _score_base(f)

    if any(k in text for k in ["balance sheet", "statement of financial position"]):
        score += 3

    line_score = 0
    if "total assets" in text:
        line_score += 1
    if "total liabilities" in text:
        line_score += 1
    if (
        "total equity" in text
        or "stockholders" in text
        # U+0027 (straight apostrophe) vs U+2019 (curly quote)
        or "shareholders' equity" in text
        or "shareholders’ equity" in text
    ):
        line_score += 1
    if "cash and cash equivalents" in text:
        line_score += 1
    score += min(line_score, 4)

    if "as of" in text:
        score += 1
    return score


def _score_cashflow(f: dict[str, float | int | bool | str]) -> int:
    text = str(f["text"])
    score = _score_base(f)

    if any(k in text for k in ["statement of cash flows", "statements of cash flows", "cash flows"]):
        score += 3

    line_score = 0
    if "operating activities" in text:
        line_score += 1
    if "investing activities" in text:
        line_score += 1
    if "financing activities" in text:
        line_score += 1
    if "net cash" in text or "net cash provided" in text:
        line_score += 1
    score += min(line_score, 4)

    if bool(f["period_cue"]):
        score += 1
    return score

def extract_raw_tables(html):
    soup = BeautifulSoup(html, "lxml")

    best_income: tuple[int, str | None] = (-999, None)
    best_balance: tuple[int, str | None] = (-999, None)
    best_cashflow: tuple[int, str | None] = (-999, None)

    for table in soup.find_all("table"):
        f = _table_features(table)
        income_score = _score_income(f)
        balance_score = _score_balance(f)
        cashflow_score = _score_cashflow(f)

        if income_score > best_income[0]:
            best_income = (income_score, str(table))
        if balance_score > best_balance[0]:
            best_balance = (balance_score, str(table))
        if cashflow_score > best_cashflow[0]:
            best_cashflow = (cashflow_score, str(table))

    income_html = best_income[1] if best_income[0] >= INCOME_MIN_SCORE else None
    balance_html = best_balance[1] if best_balance[0] >= BALANCE_MIN_SCORE else None
    cashflow_html = best_cashflow[1] if best_cashflow[0] >= CASHFLOW_MIN_SCORE else None

    return income_html, balance_html, cashflow_html


def _row_numeric_values(row) -> list[float]:
    return [val for _td, val in _iter_row_numeric_cells(row)]


_year_re = re.compile(r"\b(19|20)\d{2}\b")


def _infer_year_order(table_soup: BeautifulSoup) -> list[int]:
    rows = table_soup.find_all("tr")
    for row in rows[:10]:
        years: list[int] = []
        for cell in row.find_all(["th", "td"]):
            txt = cell.get_text(" ", strip=True)
            for m in _year_re.finditer(txt):
                try:
                    years.append(int(m.group(0)))
                except ValueError:
                    continue
        distinct: list[int] = []
        for y in years:
            if y not in distinct:
                distinct.append(y)
        if len(distinct) >= 2:
            return distinct
    return []


def _maybe_reverse_by_year_order(values: list[float], year_order: list[int]) -> list[float]:
    if len(values) < 2:
        return values
    if len(year_order) < 2:
        return values
    if year_order[0] < year_order[1]:
        return list(reversed(values))
    return values


def _find_row_values(table_html: str | None, keywords: list[str]) -> list[float]:
    if not table_html:
        return []
    soup = BeautifulSoup(table_html, "lxml")
    year_order = _infer_year_order(soup)
    for row in soup.find_all("tr"):
        text = row.get_text(" ", strip=True).lower()
        if not text:
            continue
        if any(k in text for k in keywords):
            values = _row_numeric_values(row)
            if values:
                return _maybe_reverse_by_year_order(values, year_order)
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


MetricPayload = dict[str, float | None]
MetricsDict = dict[str, MetricPayload]


def extract_metrics(
    income_html: str | None,
    balance_html: str | None,
    cashflow_html: str | None,
) -> MetricsDict:
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


def extract_sections(
    _html: str,
    _form: str,
    _ticker: str,
    _meta: MetaDict | None = None,
) -> dict[str, str | None]:
    return {
        "mdna": None,
        "risk_factors": None,
        "mdna_diff": None,
        "risk_factors_diff": None,
    }


# ----------------------------
# 메인 분석
# ----------------------------

def run_analysis(ticker: str, form: str = "10-Q") -> dict[str, Any]:
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

    schema: dict[str, Any] = init_schema()
    meta = extract_meta(html, ticker, form)
    schema["meta"] = meta
    if filing_meta is not None:
        meta["filing_date"] = getattr(filing_meta, "filing_date", None)
        meta["accession_number"] = getattr(filing_meta, "accession_number", None)
    if source_url:
        meta["source_url"] = source_url
    schema["metrics"] = extract_metrics(income_html, balance_html, cashflow_html)
    schema["sections"] = extract_sections(html, form, ticker, meta)
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
    return get_weekly_earnings()
