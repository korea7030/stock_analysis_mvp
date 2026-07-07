from __future__ import annotations

import json
import os
from typing import Any

import psycopg


def _dsn() -> str | None:
    # Common convention across platforms
    return (
        os.getenv("DATABASE_URL")
        or os.getenv("POSTGRES_DSN")
        or os.getenv("POSTGRES_URL")
    )


def _connect() -> psycopg.Connection | None:
    dsn = _dsn()
    if not dsn:
        return None
    try:
        return psycopg.connect(dsn, connect_timeout=5)
    except Exception as e:
        print("[Postgres] Connection failed → disabled:", e)
        return None


def _ensure_tables(conn: psycopg.Connection) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS section_history (
              ticker TEXT NOT NULL,
              form TEXT NOT NULL,
              mdna TEXT NOT NULL,
              risk_factors TEXT NOT NULL,
              accession_number TEXT NULL,
              filing_date TEXT NULL,
              period_end TEXT NULL,
              source_url TEXT NULL,
              updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
              PRIMARY KEY (ticker, form)
            );
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS metric_history (
              ticker TEXT NOT NULL,
              form TEXT NOT NULL,
              period_end TEXT NOT NULL,
              filing_date TEXT NULL,
              accession_number TEXT NULL,
              source_url TEXT NULL,
              metrics JSONB NOT NULL DEFAULT '{}',
              recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
              PRIMARY KEY (ticker, form, period_end)
            );
            """
        )
        cur.execute(
            """
            CREATE INDEX IF NOT EXISTS metric_history_ticker_form_idx
              ON metric_history (ticker, form, period_end DESC);
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS response_cache (
              cache_key TEXT PRIMARY KEY,
              payload JSONB NOT NULL,
              expires_at TIMESTAMPTZ NOT NULL,
              updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
            """
        )
        cur.execute(
            """
            CREATE INDEX IF NOT EXISTS response_cache_expires_at_idx
              ON response_cache (expires_at);
            """
        )
    conn.commit()


# ---------------------------------------------------------------------------
# section_history (legacy)
# ---------------------------------------------------------------------------

def load_section_history(*, ticker: str, form: str) -> dict[str, Any] | None:
    conn = _connect()
    if conn is None:
        return None
    try:
        _ensure_tables(conn)
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT mdna, risk_factors, accession_number, filing_date, period_end, source_url
                FROM section_history
                WHERE ticker = %s AND form = %s
                """,
                (ticker, form),
            )
            row = cur.fetchone()
            if not row:
                return None
            mdna, risk_factors, accession_number, filing_date, period_end, source_url = row
            return {
                "mdna": mdna or "",
                "risk_factors": risk_factors or "",
                "accession_number": accession_number,
                "filing_date": filing_date,
                "period_end": period_end,
                "source_url": source_url,
            }
    except Exception as e:
        print("[Postgres ERROR]", e)
        return None
    finally:
        try:
            conn.close()
        except Exception:
            pass


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
    conn = _connect()
    if conn is None:
        return
    try:
        _ensure_tables(conn)
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO section_history (
                  ticker, form, mdna, risk_factors, accession_number, filing_date, period_end, source_url
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (ticker, form) DO UPDATE SET
                  mdna = EXCLUDED.mdna,
                  risk_factors = EXCLUDED.risk_factors,
                  accession_number = EXCLUDED.accession_number,
                  filing_date = EXCLUDED.filing_date,
                  period_end = EXCLUDED.period_end,
                  source_url = EXCLUDED.source_url,
                  updated_at = now();
                """,
                (ticker, form, mdna, risk_factors, accession_number, filing_date, period_end, source_url),
            )
        conn.commit()
    except Exception as e:
        print("[Postgres ERROR]", e)
    finally:
        try:
            conn.close()
        except Exception:
            pass


# ---------------------------------------------------------------------------
# metric_history (Phase 2-2)
# ---------------------------------------------------------------------------

def save_metric_history(
    *,
    ticker: str,
    form: str,
    period_end: str,
    filing_date: str | None = None,
    accession_number: str | None = None,
    source_url: str | None = None,
    metrics: dict[str, Any],
) -> None:
    conn = _connect()
    if conn is None:
        return
    try:
        _ensure_tables(conn)
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO metric_history (
                  ticker, form, period_end, filing_date, accession_number, source_url, metrics
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (ticker, form, period_end) DO UPDATE SET
                  filing_date = EXCLUDED.filing_date,
                  accession_number = EXCLUDED.accession_number,
                  source_url = EXCLUDED.source_url,
                  metrics = EXCLUDED.metrics,
                  recorded_at = now();
                """,
                (
                    ticker,
                    form,
                    period_end,
                    filing_date,
                    accession_number,
                    source_url,
                    json.dumps(metrics),
                ),
            )
        conn.commit()
        print(f"[Postgres] metric_history saved: {ticker}/{form}/{period_end}")
    except Exception as e:
        print("[Postgres ERROR] save_metric_history:", e)
    finally:
        try:
            conn.close()
        except Exception:
            pass


def load_metric_history(
    *,
    ticker: str,
    form: str,
    limit: int = 8,
) -> list[dict[str, Any]]:
    conn = _connect()
    if conn is None:
        return []
    try:
        _ensure_tables(conn)
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT period_end, filing_date, accession_number, source_url, metrics
                FROM metric_history
                WHERE ticker = %s AND form = %s
                ORDER BY period_end DESC
                LIMIT %s
                """,
                (ticker, form, limit),
            )
            rows = cur.fetchall()
            result = []
            for period_end, filing_date, accession_number, source_url, metrics_raw in rows:
                metrics = metrics_raw if isinstance(metrics_raw, dict) else json.loads(metrics_raw or "{}")
                result.append(
                    {
                        "period_end": period_end,
                        "filing_date": filing_date,
                        "accession_number": accession_number,
                        "source_url": source_url,
                        "metrics": metrics,
                    }
                )
            return result
    except Exception as e:
        print("[Postgres ERROR] load_metric_history:", e)
        return []
    finally:
        try:
            conn.close()
        except Exception:
            pass


# ---------------------------------------------------------------------------
# response_cache (shared API cache)
# ---------------------------------------------------------------------------

def save_response_cache(
    *,
    cache_key: str,
    payload: Any,
    ttl_s: int,
) -> None:
    conn = _connect()
    if conn is None:
        return
    try:
        _ensure_tables(conn)
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO response_cache (cache_key, payload, expires_at)
                VALUES (%s, %s, now() + (%s * interval '1 second'))
                ON CONFLICT (cache_key) DO UPDATE SET
                  payload = EXCLUDED.payload,
                  expires_at = EXCLUDED.expires_at,
                  updated_at = now();
                """,
                (cache_key, json.dumps(payload), max(0, int(ttl_s))),
            )
        conn.commit()
    except Exception as e:
        print("[Postgres ERROR] save_response_cache:", e)
    finally:
        try:
            conn.close()
        except Exception:
            pass


def load_response_cache(*, cache_key: str) -> Any | None:
    conn = _connect()
    if conn is None:
        return None
    try:
        _ensure_tables(conn)
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT payload
                FROM response_cache
                WHERE cache_key = %s
                  AND expires_at > now()
                """,
                (cache_key,),
            )
            row = cur.fetchone()
            if not row:
                return None
            payload_raw = row[0]
            return payload_raw if isinstance(payload_raw, (dict, list)) else json.loads(payload_raw or "null")
    except Exception as e:
        print("[Postgres ERROR] load_response_cache:", e)
        return None
    finally:
        try:
            conn.close()
        except Exception:
            pass


def purge_expired_response_cache() -> int:
    conn = _connect()
    if conn is None:
        return 0
    try:
        _ensure_tables(conn)
        with conn.cursor() as cur:
            cur.execute("DELETE FROM response_cache WHERE expires_at <= now();")
            deleted = cur.rowcount or 0
        conn.commit()
        return deleted
    except Exception as e:
        print("[Postgres ERROR] purge_expired_response_cache:", e)
        return 0
    finally:
        try:
            conn.close()
        except Exception:
            pass
