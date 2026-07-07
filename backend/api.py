import os
import re
import json
import queue
import threading
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, Query, Request
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from backend.analyzer import run_analysis
from backend.clients import get_logical_today
from backend.cache import TTLCache
from backend.rate_limiter import SlidingWindowRateLimiter
from backend.models import (
    AnalyzeMeta,
    AnalyzeMetrics,
    AnalyzeResponse,
    AnalyzeSections,
    AnalyzeTables,
    AiSummaryResponse,
    ApiError,
    EarningsItem,
    MetricHistoryEntry,
    MetricHistoryResponse,
)
from backend.postgres_store import (
    load_metric_history,
    load_response_cache,
    save_metric_history,
    save_response_cache,
)

try:
    from backend.analyzer import get_marketbeat_earnings
except ImportError:
    get_marketbeat_earnings = None


load_dotenv(Path(__file__).resolve().parents[1] / ".env")

app = FastAPI(
    title="SEC Filing Analyzer API",
    version="1.0.0"
)


EARNINGS_CACHE_TTL_S = int(os.getenv("EARNINGS_CACHE_TTL_S", "21600"))
ANALYZE_CACHE_TTL_S = int(os.getenv("ANALYZE_CACHE_TTL_S", "43200"))

_earnings_cache: TTLCache[list[dict[str, Any]]] = TTLCache()
_earnings_last_success: list[dict[str, Any]] | None = None
_calendar_cache: TTLCache[list[dict[str, Any]]] = TTLCache()
_analyze_cache: TTLCache[dict[str, Any]] = TTLCache()
_rate_limiter = SlidingWindowRateLimiter()

RATE_LIMIT_ENABLED = os.getenv("RATE_LIMIT_ENABLED", "true").lower() not in {"0", "false", "no"}
ANALYZE_IP_LIMIT = int(os.getenv("ANALYZE_IP_LIMIT", "20"))
ANALYZE_IP_WINDOW_S = int(os.getenv("ANALYZE_IP_WINDOW_S", "3600"))
ANALYZE_TICKER_LIMIT = int(os.getenv("ANALYZE_TICKER_LIMIT", "8"))
ANALYZE_TICKER_WINDOW_S = int(os.getenv("ANALYZE_TICKER_WINDOW_S", "900"))
SUMMARY_IP_LIMIT = int(os.getenv("SUMMARY_IP_LIMIT", "10"))
SUMMARY_IP_WINDOW_S = int(os.getenv("SUMMARY_IP_WINDOW_S", "86400"))
SUMMARY_TICKER_LIMIT = int(os.getenv("SUMMARY_TICKER_LIMIT", "3"))
SUMMARY_TICKER_WINDOW_S = int(os.getenv("SUMMARY_TICKER_WINDOW_S", "86400"))
CALENDAR_IP_LIMIT = int(os.getenv("CALENDAR_IP_LIMIT", "120"))
CALENDAR_IP_WINDOW_S = int(os.getenv("CALENDAR_IP_WINDOW_S", "600"))

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
    responses={404: {"model": ApiError}, 422: {"model": ApiError}, 500: {"model": ApiError}},
)
async def analyze(
    request: Request,
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

    rate_limit_response = _check_analyze_rate_limit(
        request,
        ticker=normalized_ticker,
        form=normalized_form,
    )
    if rate_limit_response is not None:
        return rate_limit_response

    cache_key = f"analyze:{normalized_ticker}:{normalized_form}"
    cached_payload = _load_analyze_cache(cache_key)
    if cached_payload is not None:
        cached_last_updated = _last_updated_if_today(cached_payload.get("last_updated"))
        if cached_last_updated is None:
            cached_payload = dict(cached_payload)
            cached_payload.pop("last_updated", None)
        if not _has_financial_data(cached_payload):
            return _error_response(
                status_code=422,
                code="no_financial_data",
                message="해당 보고서에는 재무제표/지표 데이터가 없습니다. 다른 보고서를 선택해 주세요.",
            )
        print(f"[cache] kind=analyze cache_hit=true key={cache_key}")
        return cached_payload

    print(f"[cache] kind=analyze cache_hit=false key={cache_key}")

    try:
        schema = run_analysis(normalized_ticker, normalized_form)

        response_model = _build_analyze_response_model(schema, normalized_ticker, normalized_form)
        response_payload = _model_to_dict(response_model)

        if not _has_financial_data(schema):
            return _error_response(
                status_code=422,
                code="no_financial_data",
                message="해당 보고서에는 재무제표/지표 데이터가 없습니다. 다른 보고서를 선택해 주세요.",
            )

        _save_analyze_cache(cache_key, response_payload)
        _save_metrics_to_history(normalized_ticker, normalized_form, schema)
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


@app.get(
    "/analyze/history",
    response_model=MetricHistoryResponse,
    response_model_exclude_none=True,
    responses={422: {"model": ApiError}},
)
async def analyze_history(
    request: Request,
    ticker: str = Query(...),
    form: str = Query("10-Q"),
    limit: int = Query(8, ge=1, le=20),
):
    rate_limit_response = _check_rate_limit(
        request,
        bucket="history",
        limit=CALENDAR_IP_LIMIT,
        window_s=CALENDAR_IP_WINDOW_S,
        message="조회 요청이 많습니다. 잠시 후 다시 시도해 주세요.",
    )
    if rate_limit_response is not None:
        return rate_limit_response

    try:
        normalized_ticker = _normalize_ticker(ticker)
        normalized_form = _normalize_form(form)
    except ValueError as validation_error:
        return _error_response(status_code=422, code="validation_error", message=str(validation_error))

    rows = load_metric_history(ticker=normalized_ticker, form=normalized_form, limit=limit)
    rows_asc = list(reversed(rows))

    entries = []
    for row in rows_asc:
        raw_metrics = row.get("metrics") or {}
        metrics = AnalyzeMetrics(**raw_metrics) if raw_metrics else None
        entries.append(
            MetricHistoryEntry(
                period_end=row["period_end"],
                filing_date=row.get("filing_date"),
                accession_number=row.get("accession_number"),
                source_url=row.get("source_url"),
                metrics=metrics,
            )
        )

    return MetricHistoryResponse(ticker=normalized_ticker, form=normalized_form, history=entries)


_summary_cache: TTLCache[str] = TTLCache()
SUMMARY_CACHE_TTL_S = int(os.getenv("SUMMARY_CACHE_TTL_S", "86400"))


@app.get(
    "/analyze/summary",
    response_model=AiSummaryResponse,
    responses={422: {"model": ApiError}, 500: {"model": ApiError}},
)
async def analyze_summary(
    request: Request,
    ticker: str = Query(...),
    form: str = Query("10-Q"),
):
    try:
        normalized_ticker = _normalize_ticker(ticker)
        normalized_form = _normalize_form(form)
    except ValueError as validation_error:
        return _error_response(status_code=422, code="validation_error", message=str(validation_error))

    rate_limit_response = _check_summary_rate_limit(
        request,
        ticker=normalized_ticker,
        form=normalized_form,
    )
    if rate_limit_response is not None:
        return rate_limit_response

    cache_key = f"summary:{normalized_ticker}:{normalized_form}"
    cached = _summary_cache.get(cache_key)
    if cached is not None:
        return AiSummaryResponse(ticker=normalized_ticker, form=normalized_form, summary=cached)
    cached_summary_payload = load_response_cache(cache_key=cache_key)
    if cached_summary_payload is not None:
        summary = str(cached_summary_payload.get("summary") or "")
        if summary:
            _summary_cache.set(cache_key, summary, SUMMARY_CACHE_TTL_S)
            return AiSummaryResponse(
                ticker=normalized_ticker,
                form=normalized_form,
                period_end=cached_summary_payload.get("period_end"),
                summary=summary,
            )

    analyze_cached = _load_analyze_cache(f"analyze:{normalized_ticker}:{normalized_form}")
    if analyze_cached is None:
        return _error_response(
            status_code=422,
            code="no_analysis",
            message="먼저 /analyze를 실행해 주세요.",
        )

    try:
        from backend.ai_summary import generate_summary
        meta = analyze_cached.get("meta") or {}
        metrics = analyze_cached.get("metrics") or {}
        summary = generate_summary(
            ticker=normalized_ticker,
            form=normalized_form,
            meta=meta,
            metrics=metrics,
        )
        _summary_cache.set(cache_key, summary, SUMMARY_CACHE_TTL_S)
        period_end = meta.get("period_end")
        save_response_cache(
            cache_key=cache_key,
            payload={"summary": summary, "period_end": period_end},
            ttl_s=SUMMARY_CACHE_TTL_S,
        )
        return AiSummaryResponse(
            ticker=normalized_ticker,
            form=normalized_form,
            period_end=period_end,
            summary=summary,
        )
    except Exception as e:
        return _error_response(status_code=500, code="ai_error", message=str(e))


@app.get("/analyze/stream")
async def analyze_stream(
    request: Request,
    ticker: str = Query(...),
    form: str = Query("10-Q"),
):
    try:
        normalized_ticker = _normalize_ticker(ticker)
        normalized_form = _normalize_form(form)
    except ValueError as validation_error:
        async def _validation_err():
            payload = json.dumps({"type": "error", "code": "validation_error", "message": str(validation_error)})
            yield f"data: {payload}\n\n"
        return StreamingResponse(_validation_err(), media_type="text/event-stream")

    rate_limit_error = _check_analyze_rate_limit_payload(
        request,
        ticker=normalized_ticker,
        form=normalized_form,
    )
    if rate_limit_error is not None:
        async def _rate_limited():
            yield f"data: {json.dumps(rate_limit_error)}\n\n"
        return StreamingResponse(
            _rate_limited(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    cache_key = f"analyze:{normalized_ticker}:{normalized_form}"
    cached_payload = _load_analyze_cache(cache_key)
    if cached_payload is not None:
        cached_last_updated = _last_updated_if_today(cached_payload.get("last_updated"))
        if cached_last_updated is None:
            cached_payload = dict(cached_payload)
            cached_payload.pop("last_updated", None)

        if not _has_financial_data(cached_payload):
            async def _no_data_cached():
                payload = json.dumps({"type": "error", "code": "no_financial_data", "message": "해당 보고서에는 재무제표/지표 데이터가 없습니다. 다른 보고서를 선택해 주세요."})
                yield f"data: {payload}\n\n"
            return StreamingResponse(_no_data_cached(), media_type="text/event-stream")

        async def _cached():
            yield f"data: {json.dumps({'type': 'progress', 'message': '캐시에서 로드 중...'})}\n\n"
            yield f"data: {json.dumps({'type': 'result', 'data': cached_payload})}\n\n"
        return StreamingResponse(_cached(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

    event_queue: queue.Queue[dict[str, Any]] = queue.Queue()

    def _run() -> None:
        try:
            def _on_progress(msg: str) -> None:
                event_queue.put({"type": "progress", "message": msg})

            schema = run_analysis(normalized_ticker, normalized_form, progress_cb=_on_progress)
            event_queue.put({"type": "_schema", "schema": schema})
        except Exception as exc:
            event_queue.put({"type": "_error", "exc": exc})

    thread = threading.Thread(target=_run, daemon=True)
    thread.start()

    async def _stream():
        while True:
            try:
                event = event_queue.get(timeout=0.1)
            except queue.Empty:
                if not thread.is_alive():
                    break
                yield ": keep-alive\n\n"
                continue

            if event["type"] == "progress":
                yield f"data: {json.dumps({'type': 'progress', 'message': event['message']})}\n\n"

            elif event["type"] == "_error":
                exc = event["exc"]
                message = str(exc)
                if "Could not find any filings" in message or "Could not find filing for" in message:
                    code, status = "not_found", 404
                    message = "해당 보고서를 찾을 수 없습니다"
                else:
                    code, status = "internal_error", 500
                yield f"data: {json.dumps({'type': 'error', 'code': code, 'status': status, 'message': message})}\n\n"
                break

            elif event["type"] == "_schema":
                schema = event["schema"]
                response_model = _build_analyze_response_model(schema, normalized_ticker, normalized_form)
                response_payload = _model_to_dict(response_model)

                if not _has_financial_data(schema):
                    yield f"data: {json.dumps({'type': 'error', 'code': 'no_financial_data', 'status': 422, 'message': '해당 보고서에는 재무제표/지표 데이터가 없습니다. 다른 보고서를 선택해 주세요.'})}\n\n"
                    break

                _save_analyze_cache(cache_key, response_payload)
                _save_metrics_to_history(normalized_ticker, normalized_form, schema)
                yield f"data: {json.dumps({'type': 'result', 'data': response_payload})}\n\n"
                break

    return StreamingResponse(
        _stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/")
async def root():
    return {"message": "SEC Analyzer API is running"}


@app.get("/health")
@app.get("/kaithhealthcheck")
@app.get("/kaithheathcheck")
async def health():
    return {"status": "ok"}


@app.get(
    "/earnings",
    response_model=list[EarningsItem],
    response_model_exclude_none=True,
    responses={500: {"model": ApiError}},
)
def earnings(request: Request):
    global _earnings_last_success
    rate_limit_response = _check_rate_limit(
        request,
        bucket="earnings",
        limit=CALENDAR_IP_LIMIT,
        window_s=CALENDAR_IP_WINDOW_S,
        message="실적 조회 요청이 많습니다. 잠시 후 다시 시도해 주세요.",
    )
    if rate_limit_response is not None:
        return rate_limit_response

    cache_key = "earnings"
    cached_payload = _earnings_cache.get(cache_key)
    if cached_payload is not None:
        print(f"[cache] kind=earnings cache_hit=true key={cache_key}")
        return cached_payload
    persistent_payload = load_response_cache(cache_key=cache_key)
    if isinstance(persistent_payload, list):
        _earnings_cache.set(cache_key, persistent_payload, EARNINGS_CACHE_TTL_S)
        _earnings_last_success = persistent_payload
        print(f"[cache] kind=earnings persistent_hit=true key={cache_key}")
        return persistent_payload

    print(f"[cache] kind=earnings cache_hit=false key={cache_key}")
    
    try:
        if get_marketbeat_earnings is None:
            payload: list[dict[str, Any]] = []
        else:
            payload = get_marketbeat_earnings() or []

        if not payload:
            empty_ttl_s = int(os.getenv("EARNINGS_EMPTY_TTL_S", "300"))
            if _earnings_last_success is not None:
                _earnings_cache.set(cache_key, _earnings_last_success, empty_ttl_s)
                print(f"[cache] kind=earnings cache_set=last_success ttl_s={empty_ttl_s} key={cache_key}")
                return _earnings_last_success
            _earnings_cache.set(cache_key, payload, empty_ttl_s)
            print(f"[cache] kind=earnings cache_set=empty ttl_s={empty_ttl_s} key={cache_key}")
            return payload

        _earnings_cache.set(cache_key, payload, EARNINGS_CACHE_TTL_S)
        save_response_cache(cache_key=cache_key, payload=payload, ttl_s=EARNINGS_CACHE_TTL_S)
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


@app.get("/calendar", response_model=list[dict[str, Any]])
def calendar(
    request: Request,
    weeks: int = Query(1, ge=1, le=4),
    kind: Optional[str] = Query(None, description="earnings,economic"),
    status: Optional[str] = Query(None),
    country: Optional[str] = Query(None),
    importance: Optional[str] = Query(None),
    ticker: Optional[str] = Query(None),
):
    rate_limit_response = _check_rate_limit(
        request,
        bucket="calendar",
        limit=CALENDAR_IP_LIMIT,
        window_s=CALENDAR_IP_WINDOW_S,
        message="캘린더 조회 요청이 많습니다. 잠시 후 다시 시도해 주세요.",
    )
    if rate_limit_response is not None:
        return rate_limit_response

    cache_key = f"calendar:w{weeks}:k={kind or ''}:s={status or ''}:c={country or ''}:i={importance or ''}:t={ticker or ''}"
    cached_payload = _calendar_cache.get(cache_key)
    if cached_payload is not None:
        return cached_payload
    persistent_payload = load_response_cache(cache_key=cache_key)
    if isinstance(persistent_payload, list):
        _calendar_cache.set(cache_key, persistent_payload, EARNINGS_CACHE_TTL_S)
        return persistent_payload

    today = get_logical_today()
    start_date = today - timedelta(days=today.weekday())
    end_date = start_date + timedelta(days=7 * weeks - 1)

    filter_cfg = _load_calendar_filter_config()

    earnings_items = _fetch_earnings_items()
    earnings_cap = int(filter_cfg.get("earnings", 6) or 6)
    earnings_items = earnings_items[:earnings_cap]

    economic_items = _load_economic_items_from_cron()
    merged = earnings_items + economic_items

    filtered = _filter_calendar_items(
        merged,
        start_date=start_date,
        end_date=end_date,
        kind=kind,
        status=status,
        country=country,
        importance=importance,
        ticker=ticker,
    )
    filtered.sort(key=lambda it: ((it.get("event_date") or "9999-99-99"), (it.get("ticker") or it.get("event") or "")))

    desired_total = int(filter_cfg.get("desired_total", 23) or 23)
    if desired_total > 0:
        filtered = filtered[:desired_total]

    _calendar_cache.set(cache_key, filtered, EARNINGS_CACHE_TTL_S)
    save_response_cache(cache_key=cache_key, payload=filtered, ttl_s=EARNINGS_CACHE_TTL_S)
    return filtered


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("api:app", host="0.0.0.0", port=port, reload=True)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip() or "unknown"
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def _check_rate_limit_payload(
    request: Request,
    *,
    bucket: str,
    limit: int,
    window_s: int,
    message: str,
) -> dict[str, Any] | None:
    if not RATE_LIMIT_ENABLED:
        return None

    ip = _client_ip(request)
    result = _rate_limiter.allow(
        f"{bucket}:ip:{ip}",
        limit=limit,
        window_s=window_s,
    )
    if result.allowed:
        return None

    return {
        "type": "error",
        "code": "rate_limited",
        "status": 429,
        "message": message,
        "retry_after_s": result.retry_after_s,
    }


def _check_rate_limit(
    request: Request,
    *,
    bucket: str,
    limit: int,
    window_s: int,
    message: str,
) -> JSONResponse | None:
    payload = _check_rate_limit_payload(
        request,
        bucket=bucket,
        limit=limit,
        window_s=window_s,
        message=message,
    )
    if payload is None:
        return None
    headers = {"Retry-After": str(payload.get("retry_after_s", 1))}
    return _error_response(
        status_code=429,
        code="rate_limited",
        message=message,
        details={"retry_after_s": payload.get("retry_after_s", 1)},
        headers=headers,
    )


def _check_ticker_rate_limit_payload(
    *,
    bucket: str,
    ticker: str,
    form: str,
    limit: int,
    window_s: int,
    message: str,
) -> dict[str, Any] | None:
    if not RATE_LIMIT_ENABLED:
        return None

    result = _rate_limiter.allow(
        f"{bucket}:ticker:{ticker}:{form}",
        limit=limit,
        window_s=window_s,
    )
    if result.allowed:
        return None

    return {
        "type": "error",
        "code": "rate_limited",
        "status": 429,
        "message": message,
        "retry_after_s": result.retry_after_s,
    }


def _check_analyze_rate_limit_payload(
    request: Request,
    *,
    ticker: str,
    form: str,
) -> dict[str, Any] | None:
    ip_payload = _check_rate_limit_payload(
        request,
        bucket="analyze",
        limit=ANALYZE_IP_LIMIT,
        window_s=ANALYZE_IP_WINDOW_S,
        message="분석 요청이 많습니다. 잠시 후 다시 시도해 주세요.",
    )
    if ip_payload is not None:
        return ip_payload

    return _check_ticker_rate_limit_payload(
        bucket="analyze",
        ticker=ticker,
        form=form,
        limit=ANALYZE_TICKER_LIMIT,
        window_s=ANALYZE_TICKER_WINDOW_S,
        message="같은 종목 분석 요청이 많습니다. 잠시 후 다시 시도해 주세요.",
    )


def _check_analyze_rate_limit(
    request: Request,
    *,
    ticker: str,
    form: str,
) -> JSONResponse | None:
    payload = _check_analyze_rate_limit_payload(request, ticker=ticker, form=form)
    if payload is None:
        return None
    headers = {"Retry-After": str(payload.get("retry_after_s", 1))}
    return _error_response(
        status_code=429,
        code="rate_limited",
        message=str(payload["message"]),
        details={"retry_after_s": payload.get("retry_after_s", 1)},
        headers=headers,
    )


def _check_summary_rate_limit(
    request: Request,
    *,
    ticker: str,
    form: str,
) -> JSONResponse | None:
    ip_payload = _check_rate_limit_payload(
        request,
        bucket="summary",
        limit=SUMMARY_IP_LIMIT,
        window_s=SUMMARY_IP_WINDOW_S,
        message="AI 요약 요청 한도를 초과했습니다. 나중에 다시 시도해 주세요.",
    )
    if ip_payload is not None:
        payload = ip_payload
    else:
        payload = _check_ticker_rate_limit_payload(
            bucket="summary",
            ticker=ticker,
            form=form,
            limit=SUMMARY_TICKER_LIMIT,
            window_s=SUMMARY_TICKER_WINDOW_S,
            message="같은 종목의 AI 요약 요청 한도를 초과했습니다. 나중에 다시 시도해 주세요.",
        )
    if payload is None:
        return None
    headers = {"Retry-After": str(payload.get("retry_after_s", 1))}
    return _error_response(
        status_code=429,
        code="rate_limited",
        message=str(payload["message"]),
        details={"retry_after_s": payload.get("retry_after_s", 1)},
        headers=headers,
    )


def _load_analyze_cache(cache_key: str) -> dict[str, Any] | None:
    cached_payload = _analyze_cache.get(cache_key)
    if cached_payload is not None:
        return cached_payload

    cached_payload = load_response_cache(cache_key=cache_key)
    if cached_payload is None:
        return None

    _analyze_cache.set(cache_key, cached_payload, ANALYZE_CACHE_TTL_S)
    print(f"[cache] kind=analyze persistent_hit=true key={cache_key}")
    return cached_payload


def _save_analyze_cache(cache_key: str, payload: dict[str, Any]) -> None:
    _analyze_cache.set(cache_key, payload, ANALYZE_CACHE_TTL_S)
    save_response_cache(
        cache_key=cache_key,
        payload=payload,
        ttl_s=ANALYZE_CACHE_TTL_S,
    )


def _error_response(
    status_code: int,
    code: str,
    message: str,
    details: Optional[Any] = None,
    headers: Optional[dict[str, str]] = None,
) -> JSONResponse:
    payload: dict[str, Any] = {
        "code": code,
        "message": message,
    }
    if details is not None:
        payload["details"] = details
    return JSONResponse(status_code=status_code, content=payload, headers=headers)


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
        accession_number=meta.get("accession_number"),
        source_url=meta.get("source_url"),
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


def _has_financial_data(schema: dict[str, Any]) -> bool:
    tables = schema.get("tables") or {}
    if tables.get("income_statement") or tables.get("balance_sheet") or tables.get("cash_flow"):
        return True

    metrics = schema.get("metrics") or {}
    for val in metrics.values():
        if isinstance(val, dict) and val.get("current") is not None:
            return True

    sections = schema.get("sections") or {}
    if sections.get("mdna") or sections.get("risk_factors"):
        return True

    return False


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


def _save_metrics_to_history(ticker: str, form: str, schema: dict[str, Any]) -> None:
    meta = schema.get("meta") or {}
    period_end = meta.get("period_end")
    if not period_end:
        return
    metrics = schema.get("metrics") or {}
    try:
        save_metric_history(
            ticker=ticker,
            form=form,
            period_end=period_end,
            filing_date=meta.get("filing_date"),
            accession_number=meta.get("accession_number"),
            source_url=meta.get("source_url"),
            metrics=metrics,
        )
    except Exception as e:
        print("[history] save failed:", e)


def _fetch_earnings_items() -> list[dict[str, Any]]:
    """
    우선순위:
    1) cron 산출물(JSON) earnings
    2) 기존 marketbeat fallback
    """
    global _earnings_last_success

    cron_payload = _load_json_from_env_path("CRON_EARNINGS_CALENDAR_PATH", "backend/data/earnings_calendar.json")
    if isinstance(cron_payload, list) and cron_payload:
        return _normalize_earnings_items(cron_payload)

    combined_payload = _load_json_from_env_path("CRON_CALENDAR_COMBINED_PATH", "backend/data/calendar_combined.json")
    if isinstance(combined_payload, dict):
        maybe_earnings = combined_payload.get("earnings")
        if isinstance(maybe_earnings, list) and maybe_earnings:
            return _normalize_earnings_items(maybe_earnings)

    allow_live_fallback = os.getenv("CALENDAR_ALLOW_LIVE_EARNINGS_FALLBACK", "false").strip().lower() in {"1", "true", "yes", "on"}
    if not allow_live_fallback:
        if _earnings_last_success:
            print("[calendar] using last_success earnings snapshot (live fallback disabled)")
            return _normalize_earnings_items(_earnings_last_success)
        print("[calendar] skip live earnings fallback (CALENDAR_ALLOW_LIVE_EARNINGS_FALLBACK=false)")
        return []

    try:
        from backend.clients import get_weekly_earnings
        payload = get_weekly_earnings() if get_weekly_earnings else []
    except Exception as e:
        print(f"[calendar] earnings_fetch_failed error={type(e).__name__}: {e}")
        payload = _earnings_last_success or []

    payload = payload or []
    if payload:
        _earnings_last_success = payload

    return _normalize_earnings_items(payload)


def _load_economic_items_from_cron() -> list[dict[str, Any]]:
    direct_payload = _load_json_from_env_path("CRON_ECONOMIC_CALENDAR_PATH", "backend/data/economic_calendar.json")
    if isinstance(direct_payload, list) and direct_payload:
        return _normalize_economic_items(direct_payload)

    combined_payload = _load_json_from_env_path("CRON_CALENDAR_COMBINED_PATH", "backend/data/calendar_combined.json")
    if isinstance(combined_payload, dict):
        ff_raw = combined_payload.get("forexfactory_econ")
        nasdaq_raw = combined_payload.get("nasdaq_econ")
        ff_items = _normalize_economic_items(ff_raw if isinstance(ff_raw, list) else [])
        nasdaq_items = _normalize_economic_items(nasdaq_raw if isinstance(nasdaq_raw, list) else [])

        filter_cfg = combined_payload.get("filter") if isinstance(combined_payload.get("filter"), dict) else {}
        selected, _source = _apply_cron_selection_policy(ff_items, nasdaq_items, filter_cfg)
        if selected:
            return selected

    print("[calendar] economic cron files not found, starting live economic fallback")
    try:
        from backend.clients import nasdaq_get_weekly_economic_calendar
        live_econ = nasdaq_get_weekly_economic_calendar()
        return _normalize_economic_items(live_econ)
    except Exception as e:
        print(f"[calendar] live economic fallback failed: {e}")
        return []


def _load_json_from_env_path(env_key: str, default_rel_path: str) -> Any:
    configured_path = os.getenv(env_key, default_rel_path)
    path = Path(configured_path)
    if not path.is_absolute():
        repo_root = Path(__file__).resolve().parents[1]
        path = (repo_root / configured_path).resolve()

    if not path.exists():
        return None

    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"[calendar] json_read_failed env={env_key} path={path} error={type(e).__name__}: {e}")
        return None


def _date_from_iso_start(value: str) -> str:
    if not value:
        return ""
    try:
        return datetime.fromisoformat(value).date().isoformat()
    except ValueError:
        return ""


def _infer_importance(summary: str) -> str:
    s = summary.lower()
    if "major" in s:
        return "major"
    if "minor" in s:
        return "minor"
    return "medium"


def _normalize_economic_items(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for row in items:
        if not isinstance(row, dict):
            continue
        summary = str(row.get("summary") or row.get("event") or row.get("title") or "Economic Event")
        start = str(row.get("start") or "")
        out.append(
            {
                **row,
                "kind": "economic",
                "event": summary,
                "event_date": str(row.get("event_date") or row.get("date") or _date_from_iso_start(start)).strip(),
                "country": row.get("country") or "US",
                "importance": row.get("importance") or _infer_importance(summary),
                "start": start or row.get("start_time"),
                "consensus": row.get("consensus"),
                "previous": row.get("previous"),
                "actual": row.get("actual"),
            }
        )
    return out


def _normalize_earnings_items(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for row in items:
        if not isinstance(row, dict):
            continue
        start = str(row.get("start") or "")
        symbol = row.get("symbol") or row.get("ticker")
        out.append(
            {
                **row,
                "kind": "earnings",
                "ticker": symbol,
                "report_date": row.get("report_date") or _date_from_iso_start(start),
                "event_date": row.get("event_date") or row.get("report_date") or _date_from_iso_start(start),
                "release_time": row.get("report_time") or row.get("release_time"),
                "eps_estimate": row.get("eps_forecast") or row.get("eps_estimate"),
                "event": "Earnings",
            }
        )
    return out


def _apply_cron_selection_policy(
    forexfactory_items: list[dict[str, Any]],
    nasdaq_items: list[dict[str, Any]],
    filter_cfg: dict[str, Any],
) -> tuple[list[dict[str, Any]], str]:
    ff_cap = int(filter_cfg.get("forexfactory_econ", 10) or 10)
    nasdaq_cap = int(filter_cfg.get("nasdaq_econ", 17) or 17)
    preferred = str(filter_cfg.get("effective_econ_source") or "nasdaq_economic").strip().lower()

    if preferred == "nasdaq_economic" and nasdaq_items:
        return nasdaq_items[:nasdaq_cap], "nasdaq_economic"
    if preferred == "forexfactory" and forexfactory_items:
        return forexfactory_items[:ff_cap], "forexfactory"
    if nasdaq_items:
        return nasdaq_items[:nasdaq_cap], "nasdaq_economic"
    return forexfactory_items[:ff_cap], "forexfactory"


def _load_calendar_filter_config() -> dict[str, Any]:
    defaults = {
        "forexfactory_econ": 10,
        "nasdaq_econ": 17,
        "earnings": 6,
        "effective_econ_source": "nasdaq_economic",
        "desired_total": 23,
    }

    payload = _load_json_from_env_path("CRON_CALENDAR_FILTER_PATH", "backend/data/calendar_filter.json")
    if isinstance(payload, dict):
        merged = {**defaults, **payload}
        return merged
    return defaults


def _parse_csv_values(value: Optional[str]) -> set[str]:
    if not value:
        return set()
    return {v.strip().lower() for v in value.split(",") if v.strip()}


def _filter_calendar_items(
    items: list[dict[str, Any]],
    *,
    start_date: date,
    end_date: date,
    kind: Optional[str],
    status: Optional[str],
    country: Optional[str],
    importance: Optional[str],
    ticker: Optional[str],
) -> list[dict[str, Any]]:
    kinds = _parse_csv_values(kind)
    statuses = _parse_csv_values(status)
    countries = _parse_csv_values(country)
    importances = _parse_csv_values(importance)
    tickers = _parse_csv_values(ticker)

    out: list[dict[str, Any]] = []
    for item in items:
        event_date = str(item.get("event_date") or "").strip()
        if event_date:
            try:
                d = datetime.strptime(event_date, "%Y-%m-%d").date()
                if d < start_date or d > end_date:
                    continue
            except ValueError:
                continue

        item_kind = str(item.get("kind") or "").strip().lower()
        item_status = str(item.get("status") or "").strip().lower()
        item_country = str(item.get("country") or "").strip().lower()
        item_importance = str(item.get("importance") or "").strip().lower()
        item_ticker = str(item.get("ticker") or "").strip().lower()

        if kinds and item_kind not in kinds:
            continue
        if statuses and item_status not in statuses:
            continue
        if countries and item_country not in countries:
            continue
        if importances and item_importance not in importances:
            continue
        if tickers and item_ticker not in tickers:
            continue

        out.append(item)

    return out
