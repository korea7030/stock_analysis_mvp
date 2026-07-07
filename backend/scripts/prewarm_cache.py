from __future__ import annotations

import os
import sys
import time
from pathlib import Path


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


sys.path.insert(0, str(_repo_root()))

from backend.analyzer import run_analysis  # noqa: E402
from backend.api import (  # noqa: E402
    ANALYZE_CACHE_TTL_S,
    _build_analyze_response_model,
    _has_financial_data,
    _model_to_dict,
    _normalize_form,
    _normalize_ticker,
    _save_analyze_cache,
    _save_metrics_to_history,
)


DEFAULT_TICKERS = "AAPL,MSFT,NVDA,GOOGL,AMZN,META,TSLA,AVGO,JPM,LLY,V,UNH,MA,XOM,COST"


def _csv_env(name: str, default: str) -> list[str]:
    raw = os.getenv(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


def main() -> int:
    tickers = _csv_env("PREWARM_TICKERS", DEFAULT_TICKERS)
    forms = _csv_env("PREWARM_FORMS", "10-Q")
    sleep_s = float(os.getenv("PREWARM_SLEEP_S", "1.0"))

    ok = 0
    failed = 0
    skipped = 0

    for ticker_raw in tickers:
        for form_raw in forms:
            try:
                ticker = _normalize_ticker(ticker_raw)
                form = _normalize_form(form_raw)
            except ValueError as exc:
                skipped += 1
                print(f"[prewarm] skip invalid ticker={ticker_raw} form={form_raw}: {exc}")
                continue

            cache_key = f"analyze:{ticker}:{form}"
            try:
                print(f"[prewarm] start ticker={ticker} form={form}")
                schema = run_analysis(ticker, form)
                if not _has_financial_data(schema):
                    skipped += 1
                    print(f"[prewarm] skip no_financial_data ticker={ticker} form={form}")
                    continue

                response_model = _build_analyze_response_model(schema, ticker, form)
                response_payload = _model_to_dict(response_model)
                _save_analyze_cache(cache_key, response_payload)
                _save_metrics_to_history(ticker, form, schema)
                ok += 1
                print(f"[prewarm] saved ticker={ticker} form={form} ttl_s={ANALYZE_CACHE_TTL_S}")
            except Exception as exc:
                failed += 1
                print(f"[prewarm] failed ticker={ticker} form={form}: {type(exc).__name__}: {exc}")
            finally:
                if sleep_s > 0:
                    time.sleep(sleep_s)

    print(f"[prewarm] done ok={ok} skipped={skipped} failed={failed}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
