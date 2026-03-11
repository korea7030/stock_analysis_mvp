import os
import json
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI")
MONGO_DB = os.getenv("MONGODB_DB")
MONGO_COL = os.getenv("MONGODB_COLLECTION")

client = None
col = None

# MongoDB 연결을 시도하지만 실패해도 그냥 넘어감
try:
    if MONGO_URI and MONGO_DB and MONGO_COL:
        client = MongoClient(
            MONGO_URI,
            serverSelectionTimeoutMS=2000,
            connectTimeoutMS=2000,
            socketTimeoutMS=2000,
        )
        # Force a quick connectivity check
        client.admin.command("ping")
        col = client[MONGO_DB][MONGO_COL]
        print("[Mongo] Connected")
    else:
        print("[Mongo] Environment variables missing → MongoDB disabled")
except Exception as e:
    print("[Mongo] Connection failed → MongoDB disabled:", e)
    client = None
    col = None


def save_to_mongo(schema: dict):
    """MongoDB 저장은 옵션 기능 — 실패해도 서버 영향 없도록"""
    if col is None:
        print("[Mongo] Skipped (MongoDB disabled)")
        return

    try:
        col.update_one(
            {"meta.ticker": schema["meta"]["ticker"], "meta.period_end": schema["meta"]["period_end"]},
            {"$set": json.loads(json.dumps(schema))},
            upsert=True
        )
        print("[Mongo] Saved")
    except Exception as e:
        print("[Mongo ERROR]", e)


def load_section_history(*, ticker: str, form: str) -> dict | None:
    if col is None:
        return None
    try:
        doc = col.find_one({"kind": "sections", "ticker": ticker, "form": form})
        if not doc:
            return None
        return {
            "mdna": doc.get("mdna") or "",
            "risk_factors": doc.get("risk_factors") or "",
            "accession_number": doc.get("accession_number"),
            "filing_date": doc.get("filing_date"),
            "period_end": doc.get("period_end"),
            "source_url": doc.get("source_url"),
        }
    except Exception as e:
        print("[Mongo ERROR]", e)
        return None


def save_section_history(
    *,
    ticker: str,
    form: str,
    mdna: str,
    risk_factors: str,
    accession_number: str | None = None,
    filing_date: str | None = None,
    period_end: str | None = None,
    source_url: str | None = None,
) -> None:
    if col is None:
        return
    try:
        col.update_one(
            {"kind": "sections", "ticker": ticker, "form": form},
            {
                "$set": {
                    "mdna": mdna,
                    "risk_factors": risk_factors,
                    "accession_number": accession_number,
                    "filing_date": filing_date,
                    "period_end": period_end,
                    "source_url": source_url,
                }
            },
            upsert=True,
        )
    except Exception as e:
        print("[Mongo ERROR]", e)
