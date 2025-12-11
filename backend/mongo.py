import os
import json
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI")
MONGO_DB = os.getenv("MONGODB_DB")
MONGO_COL = os.getenv("MONGODB_COLLECTION")

client = MongoClient(MONGO_URI)
col = client[MONGO_DB][MONGO_COL]

def save_to_mongo(schema: dict):
    col.update_one(
        {"meta.ticker": schema["meta"]["ticker"], "meta.period_end": schema["meta"]["period_end"]},
        {"$set": json.loads(json.dumps(schema))},
        upsert=True
    )
    print("[MongoDB] Saved")