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

    result = cast(dict[str, Any], run_analysis("AAPL", "10-K"))
    meta = cast(dict[str, Any], result["meta"])
    tables = cast(dict[str, Any], result["tables"])

    assert set(result.keys()) == {"meta", "metrics", "sections", "tables", "last_updated"}
    assert meta["ticker"] == "AAPL"
    assert meta["report_type"] == "10-K"
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


def test_toc_then_income_selects_real_income_statement(monkeypatch: pytest.MonkeyPatch) -> None:
    fixture_html = _read_fixture("toc_then_income.html")

    def _fake_sec_html(*_args: object, **_kwargs: object) -> str:
        return fixture_html

    monkeypatch.setattr(
        "backend.analyzer.sec_get_filing_html",
        _fake_sec_html,
    )

    result = cast(dict[str, Any], run_analysis("AAPL", "10-K"))
    tables = cast(dict[str, Any], result["tables"])

    income_html = tables.get("income_statement")
    assert income_html
    lowered = str(income_html).lower()
    assert "revenue" in lowered
    assert "net income" in lowered
    assert "table of contents" not in lowered


def test_toc_only_does_not_select_income_statement(monkeypatch: pytest.MonkeyPatch) -> None:
    fixture_html = _read_fixture("toc_only.html")

    def _fake_sec_html(*_args: object, **_kwargs: object) -> str:
        return fixture_html

    monkeypatch.setattr(
        "backend.analyzer.sec_get_filing_html",
        _fake_sec_html,
    )

    result = cast(dict[str, Any], run_analysis("AAPL", "10-K"))
    tables = cast(dict[str, Any], result["tables"])
    assert tables.get("income_statement") is None


def test_mdna_skips_toc_and_returns_body_text(monkeypatch: pytest.MonkeyPatch) -> None:
    fixture_html = _read_fixture("toc_then_mdna.html")

    def _fake_sec_html(*_args: object, **_kwargs: object) -> str:
        return fixture_html

    monkeypatch.setattr(
        "backend.analyzer.sec_get_filing_html",
        _fake_sec_html,
    )

    result = cast(dict[str, Any], run_analysis("AAPL", "10-K"))
    sections = cast(dict[str, Any], result["sections"])
    mdna = str(sections.get("mdna") or "").lower()
    assert "this section provides management" in mdna
    assert "table of contents" not in mdna


def test_sections_avoid_cross_reference_boilerplate(monkeypatch: pytest.MonkeyPatch) -> None:
    fixture_html = _read_fixture("boilerplate_then_risk_mdna.html")

    def _fake_sec_html(*_args: object, **_kwargs: object) -> str:
        return fixture_html

    monkeypatch.setattr(
        "backend.analyzer.sec_get_filing_html",
        _fake_sec_html,
    )

    result = cast(dict[str, Any], run_analysis("AAPL", "10-K"))
    sections = cast(dict[str, Any], result["sections"])

    risk = str(sections.get("risk_factors") or "").lower()
    mdna = str(sections.get("mdna") or "").lower()

    assert "we face intense competition" in risk
    assert "assumes no obligation" not in risk
    assert "net sales increased" in mdna
    assert "see item 7 of this form" not in mdna
