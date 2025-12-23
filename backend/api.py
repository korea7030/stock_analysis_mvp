import os
from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from backend.analyzer import run_analysis   # 수정된 analyzer (원본 표 HTML 포함)
from backend.mongo import save_to_mongo     # 기존 MongoDB 저장 함수


app = FastAPI(
    title="SEC 10-Q / 6-K Analyzer API",
    version="1.0.0"
)

raw_origins = os.getenv("ALLOWED_ORIGINS", "")
origins = [o.strip() for o in raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/analyze")
async def analyze(
    ticker: str = Query(...),
    form: str = Query("10-Q"),
):
    """
    예시 요청:
    GET /analyze?ticker=AAPL&form=10-Q
    """
    try:
        schema = run_analysis(ticker, form)

        # DB 저장은 실패해도 API 실패로 처리하지 않음
        try:
            save_to_mongo(schema)
        except Exception as db_err:
            print("[Mongo Error]", db_err)

        return JSONResponse(content=schema)

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.get("/")
async def root():
    return {"message": "SEC Analyzer API is running"}


if __name__ == "__main__":
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)