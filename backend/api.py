import os
import re
from datetime import datetime
from typing import Any, Optional

from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from backend.analyzer import run_analysis   # 수정된 analyzer (원본 표 HTML 포함)
from backend.mongo import save_to_mongo     # 기존 MongoDB 저장 함수
from backend.cache import TTLCache
from backend.models import (
    AnalyzeMeta,
    AnalyzeMetrics,
    AnalyzeResponse,
    AnalyzeSections,
    AnalyzeTables,
    ApiError,
    EarningsItem,
)

try:
    from backend.analyzer import get_marketbeat_earnings
except ImportError:
    get_marketbeat_earnings = None


app = FastAPI(
    title="SEC Filing Analyzer API",
    version="1.0.0"
)


EARNINGS_CACHE_TTL_S = int(os.getenv("EARNINGS_CACHE_TTL_S", "21600"))
ANALYZE_CACHE_TTL_S = int(os.getenv("ANALYZE_CACHE_TTL_S", "43200"))

_earnings_cache: TTLCache[list[dict[str, Any]]] = TTLCache()
_earnings_last_success: list[dict[str, Any]] | None = None
_analyze_cache: TTLCache[dict[str, Any]] = TTLCache()

raw_origins = os.getenv("ALLOWED_ORIGINS", "")
origins = [o.strip() for o in raw_origins.split(",") if o.strip()]
if not origins:
    origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    print("[CORS] ALLOWED_ORIGINS not set; defaulting to localhost dev origins")

print(f"[CORS] allow_origins={origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get(
    "/analyze",
    response_model=AnalyzeResponse,
    response_model_exclude_none=True,
    responses={422: {"model": ApiError}, 500: {"model": ApiError}},
)
async def analyze(
    ticker: str = Query(...),
    form: str = Query("10-Q"),
):
    """
    예시 요청:
    GET /analyze?ticker=AAPL&form=10-Q
    """
    try:
        normalized_ticker = _normalize_ticker(ticker)
        normalized_form = _normalize_form(form)
    except ValueError as validation_error:
        return _error_response(
            status_code=422,
            code="validation_error",
            message=str(validation_error),
        )

    cache_key = f"analyze:{normalized_ticker}:{normalized_form}"
    cached_payload = _analyze_cache.get(cache_key)
    if cached_payload is not None:
        cached_last_updated = _last_updated_if_today(cached_payload.get("last_updated"))
        if cached_last_updated is None:
            cached_payload = dict(cached_payload)
            cached_payload.pop("last_updated", None)
        print(f"[cache] kind=analyze cache_hit=true key={cache_key}")
        return cached_payload

    print(f"[cache] kind=analyze cache_hit=false key={cache_key}")

    try:
        schema = run_analysis(normalized_ticker, normalized_form)

        # DB 저장은 실패해도 API 실패로 처리하지 않음
        try:
            save_to_mongo(schema)
        except Exception as db_err:
            print("[Mongo Error]", db_err)

        response_model = _build_analyze_response_model(schema, normalized_ticker, normalized_form)
        response_payload = _model_to_dict(response_model)
        _analyze_cache.set(cache_key, response_payload, ANALYZE_CACHE_TTL_S)
        return response_payload

    except ValueError as e:
        message = str(e)
        if "Could not find any filings" in message or "Could not find filing for" in message:
            return _error_response(
                status_code=404,
                code="not_found",
                message="해당 보고서를 찾을 수 없습니다",
                details=message,
            )
        return _error_response(
            status_code=500,
            code="internal_error",
            message="Analysis failed",
            details=message,
        )
    except Exception as e:
        return _error_response(
            status_code=500,
            code="internal_error",
            message="Analysis failed",
            details=str(e),
        )


@app.get("/")
async def root():
    return {"message": "SEC Analyzer API is running"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get(
    "/earnings",
    response_model=list[EarningsItem],
    response_model_exclude_none=True,
    responses={500: {"model": ApiError}},
)
async def earnings():
    global _earnings_last_success
    cache_key = "earnings"
    cached_payload = _earnings_cache.get(cache_key)
    if cached_payload is not None:
        print(f"[cache] kind=earnings cache_hit=true key={cache_key}")
        return cached_payload

    print(f"[cache] kind=earnings cache_hit=false key={cache_key}")

    try:
        if get_marketbeat_earnings is None:
            payload: list[dict[str, Any]] = []
        else:
            payload = get_marketbeat_earnings() or []
        _earnings_cache.set(cache_key, payload, EARNINGS_CACHE_TTL_S)
        _earnings_last_success = payload
        return payload
    except Exception as e:
        print(f"[earnings] fetch_failed error={type(e).__name__}: {e}")
        error_ttl_s = int(os.getenv("EARNINGS_ERROR_TTL_S", "300"))
        if _earnings_last_success is not None:
            _earnings_cache.set(cache_key, _earnings_last_success, error_ttl_s)
            print(f"[cache] kind=earnings cache_set=last_success ttl_s={error_ttl_s} key={cache_key}")
            return _earnings_last_success
        payload: list[dict[str, Any]] = []
        _earnings_cache.set(cache_key, payload, error_ttl_s)
        print(f"[cache] kind=earnings cache_set=error ttl_s={error_ttl_s} key={cache_key}")
        return payload


if __name__ == "__main__":
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)


def _error_response(status_code: int, code: str, message: str, details: Optional[Any] = None) -> JSONResponse:
    payload: dict[str, Any] = {
        "code": code,
        "message": message,
    }
    if details is not None:
        payload["details"] = details
    return JSONResponse(status_code=status_code, content=payload)


def _normalize_ticker(ticker: str) -> str:
    normalized = ticker.strip().upper()
    if not re.fullmatch(r"[A-Z]{1,10}", normalized):
        raise ValueError("Ticker must be 1-10 uppercase letters")
    return normalized


def _normalize_form(form: str) -> str:
    normalized = form.strip()
    if normalized not in {"10-Q", "10-K", "6-K", "8-K", "20-F"}:
        raise ValueError("Form must be 10-Q, 10-K, 6-K, 8-K, or 20-F")
    return normalized


def _build_analyze_response_model(schema: dict[str, Any], ticker: str, form: str) -> AnalyzeResponse:
    meta = schema.get("meta") or {}
    tables = schema.get("tables") or {}
    metrics = schema.get("metrics") or {}
    sections = schema.get("sections") or {}

    response_meta = AnalyzeMeta(
        company_name=meta.get("company_name"),
        ticker=meta.get("ticker") or ticker,
        report_type=meta.get("report_type") or form,
        period_end=meta.get("period_end"),
        filing_date=meta.get("filing_date"),
        unit=meta.get("unit"),
    )
    response_tables = AnalyzeTables(
        income_statement=tables.get("income_statement"),
        balance_sheet=tables.get("balance_sheet"),
        cash_flow=tables.get("cash_flow"),
    )
    response_metrics = AnalyzeMetrics(**metrics) if metrics else None
    response_sections = AnalyzeSections(**sections) if sections else None

    response = AnalyzeResponse(
        meta=response_meta,
        metrics=response_metrics,
        sections=response_sections,
        tables=response_tables,
    )
    last_updated = _last_updated_if_today(schema.get("last_updated"))
    if last_updated:
        response.last_updated = last_updated
    return response


def _model_to_dict(model: Any) -> dict[str, Any]:
    try:
        return model.model_dump(exclude_none=True)
    except AttributeError:
        return model.dict(exclude_none=True)


def _last_updated_if_today(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError:
        return None
    if parsed.date() != datetime.now().date():
        return None
    return value
