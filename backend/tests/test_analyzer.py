# pyright: basic, reportMissingImports=false
from pathlib import Path
from typing import Any, cast

import pytest

from backend.analyzer import parse_number, run_analysis


FIXTURES_DIR = Path(__file__).parent / "fixtures"


def _read_fixture(name: str) -> str:
    return (FIXTURES_DIR / name).read_text(encoding="utf-8")


def test_schema_shape(monkeypatch: pytest.MonkeyPatch) -> None:
    fixture_html = _read_fixture("mini_filing.html")

    def _fake_sec_html(*_args: object, **_kwargs: object) -> str:
        return fixture_html

    monkeypatch.setattr(
        "backend.analyzer.sec_get_filing_html",
        _fake_sec_html,
    )

    result = cast(dict[str, Any], run_analysis("AAPL", "10-Q"))
    meta = cast(dict[str, Any], result["meta"])
    tables = cast(dict[str, Any], result["tables"])

    assert set(result.keys()) == {"meta", "tables", "last_updated"}
    assert meta["ticker"] == "AAPL"
    assert meta["report_type"] == "10-Q"
    assert tables["income_statement"]
    assert tables["balance_sheet"]
    assert tables["cash_flow"]


def test_parse_number_edge_cases() -> None:
    assert parse_number("") is None
    assert parse_number("-") is None
    assert parse_number("—") is None
    assert parse_number("1,234") == 1234.0
    assert parse_number("(1,234)") == -1234.0


def test_annotate_income_missing_cells_no_crash(monkeypatch: pytest.MonkeyPatch) -> None:
    fixture_html = _read_fixture("mini_filing_missing_cells.html")

    def _fake_sec_html(*_args: object, **_kwargs: object) -> str:
        return fixture_html

    monkeypatch.setattr(
        "backend.analyzer.sec_get_filing_html",
        _fake_sec_html,
    )

    result = cast(dict[str, Any], run_analysis("AAPL", "10-Q"))
    tables = cast(dict[str, Any], result["tables"])
    assert tables["income_statement"]
