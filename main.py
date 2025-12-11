import os
import re
import json
import argparse
from datetime import datetime

from bs4 import BeautifulSoup, XMLParsedAsHTMLWarning
import warnings
from sec_downloader import Downloader
from pymongo import MongoClient

# .env
try:
    from dotenv import load_dotenv
    load_dotenv()
except:
    pass

warnings.filterwarnings("ignore", category=XMLParsedAsHTMLWarning)

# MongoDB (.env)
MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGO_DB = os.getenv("MONGODB_DB", "financials")
MONGO_COL = os.getenv("MONGODB_COLLECTION", "reports")


def extract_original_tables(html: str):
    """
    SEC HTML 내부에서 재무제표 테이블(Income, Balance, Cashflow)을 원본 HTML 그대로 추출해 반환.
    """
    soup = BeautifulSoup(html, "lxml")

    tables = soup.find_all("table")
    income_html = None
    balance_html = None
    cashflow_html = None

    for table in tables:
        # 테이블 직전 문자열 기반으로 유형 판단
        heading_tag = table.find_previous(string=True)
        heading = heading_tag.lower() if heading_tag else ""

        if not income_html and ("income" in heading or "operations" in heading or "earnings" in heading):
            income_html = str(table)

        if not balance_html and ("balance sheet" in heading or "financial position" in heading):
            balance_html = str(table)

        if not cashflow_html and ("cash flows" in heading or "operating activities" in heading):
            cashflow_html = str(table)

        # 다 찾으면 종료
        if income_html and balance_html and cashflow_html:
            break

    return {
        "income_statement_html": income_html,
        "balance_sheet_html": balance_html,
        "cash_flow_html": cashflow_html
    }


def extract_meta(html: str, ticker: str, form: str):
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, "lxml-xml")
    company = None
    period_end = None

    for tag in soup.find_all(True):
        name = tag.attrs.get("name", "").lower()
        txt = tag.get_text(strip=True)

        if "entityregistrantname" in name:
            company = txt
        elif "documentperiodenddate" in name:
            period_end = txt

    return {
        "company_name": company,
        "ticker": ticker,
        "report_type": form,
        "period_end": period_end,
        "filing_date": None,
        "unit": "(in millions)" if "(in millions" in html.lower() else None,
    }


# ----------------------------
# MongoDB SAVE
# ----------------------------
def save(schema):
    client = MongoClient(MONGO_URI)
    col = client[MONGO_DB][MONGO_COL]
    payload = json.loads(json.dumps(schema, default=str))
    col.update_one(
        {"meta.ticker": schema["meta"]["ticker"], "meta.period_end": schema["meta"]["period_end"]},
        {"$set": payload},
        upsert=True
    )
    print("[MongoDB] Saved!")


# ----------------------------
# MAIN
# ----------------------------
def main(ticker, form="10-Q"):
    dl = Downloader("PersonalProject", "korea7030.jhl@gmail.com")
    html = dl.get_filing_html(ticker=ticker, form=form)
    if isinstance(html, bytes):
        html = html.decode("utf-8", errors="ignore")

    meta = extract_meta(html, ticker, form)
    tables = extract_original_tables(html)
    print(tables)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--ticker", required=True)
    parser.add_argument("--form", default="10-Q")
    args = parser.parse_args()
    main(args.ticker, args.form)