import os

from backend.postgres_store import load_section_history, save_section_history


def test_postgres_store_no_env(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("POSTGRES_DSN", raising=False)
    monkeypatch.delenv("POSTGRES_URL", raising=False)

    assert load_section_history(ticker="AAPL", form="10-Q") is None
    save_section_history(ticker="AAPL", form="10-Q", mdna="x", risk_factors="y")
