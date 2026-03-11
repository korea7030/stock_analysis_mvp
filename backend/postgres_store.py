from __future__ import annotations

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
        return psycopg.connect(dsn, connect_timeout=2)
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
    conn.commit()


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
