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
        client = MongoClient(MONGO_URI)
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