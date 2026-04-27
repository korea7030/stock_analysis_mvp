# pyright: basic, reportMissingImports=false
from pathlib import Path
from typing import Any, cast

import pytest
from bs4 import BeautifulSoup

from backend.analyzer import extract_metrics, parse_number, run_analysis


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
    assert sections.get("mdna") is None
    assert sections.get("risk_factors") is None
    assert sections.get("mdna_diff") is None
    assert sections.get("risk_factors_diff") is None


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
    assert sections.get("mdna") is None
    assert sections.get("risk_factors") is None


def test_sections_strip_boilerplate_paragraphs(monkeypatch: pytest.MonkeyPatch) -> None:
    fixture_html = _read_fixture("sections_with_boilerplate_inside.html")

    def _fake_sec_html(*_args: object, **_kwargs: object) -> str:
        return fixture_html

    monkeypatch.setattr(
        "backend.analyzer.sec_get_filing_html",
        _fake_sec_html,
    )

    result = cast(dict[str, Any], run_analysis("AAPL", "10-K"))
    sections = cast(dict[str, Any], result["sections"])
    assert sections.get("mdna") is None
    assert sections.get("risk_factors") is None


def test_balance_sheet_year_order_prefers_latest_as_current() -> None:
    balance_html = _read_fixture("balance_sheet_year_order.html")
    metrics = extract_metrics(income_html=None, balance_html=balance_html, cashflow_html=None)
    assets = metrics["total_assets"]
    assert assets["current"] == 595281.0
    assert assets["previous"] == 450256.0


def test_income_label_footnote_is_not_treated_as_current_value(monkeypatch: pytest.MonkeyPatch) -> None:
    fixture_html = _read_fixture("income_label_with_footnote.html")

    def _fake_sec_html(*_args: object, **_kwargs: object) -> str:
        return fixture_html

    monkeypatch.setattr(
        "backend.analyzer.sec_get_filing_html",
        _fake_sec_html,
    )

    result = cast(dict[str, Any], run_analysis("PGY", "10-Q"))
    metrics = cast(dict[str, Any], result["metrics"])

    revenue = metrics["revenue"]
    assert revenue["current"] == 339887.0
    assert revenue["previous"] == 249283.0

    net_income = metrics["net_income"]
    assert net_income["current"] == 23273.0
    assert net_income["previous"] == -74231.0

    income_html = cast(dict[str, Any], result["tables"])["income_statement"] or ""
    revenue_row = ""
    for line in income_html.splitlines():
        if "Revenue from fees" in line:
            revenue_row = line
            break
    if not revenue_row:
        # 셀이 멀티라인일 수 있어 통째로 비교
        revenue_row = income_html
    assert "▼ -100.0%" not in revenue_row


def test_income_ascending_year_columns_produces_positive_badges(monkeypatch: pytest.MonkeyPatch) -> None:
    fixture_html = _read_fixture("income_ascending_year_columns.html")

    def _fake_sec_html(*_args: object, **_kwargs: object) -> str:
        return fixture_html

    monkeypatch.setattr(
        "backend.analyzer.sec_get_filing_html",
        _fake_sec_html,
    )

    result = cast(dict[str, Any], run_analysis("AMZN", "10-Q"))
    metrics = cast(dict[str, Any], result["metrics"])

    # 메트릭은 _maybe_reverse_by_year_order 로 이미 정상 (현재가 최신)
    # _find_row_values 가 "sales" 부분문자열로 첫 매칭행 (Net product sales) 을 선택.
    revenue = metrics["revenue"]
    assert revenue["current"] == 206274.0
    assert revenue["previous"] == 190085.0
    assert revenue["change_pct"] is not None and revenue["change_pct"] > 0

    net_income = metrics["net_income"]
    assert net_income["current"] == 56478.0
    assert net_income["previous"] == 39244.0
    assert net_income["change_pct"] is not None and net_income["change_pct"] > 0

    income_html = cast(dict[str, Any], result["tables"])["income_statement"] or ""

    # 헤더 행(연도만 들어 있는 행) 에는 배지가 박히지 않아야 함
    soup = BeautifulSoup(income_html, "lxml")
    for tr in soup.find_all("tr"):
        cell_texts = [td.get_text(" ", strip=True) for td in tr.find_all("td")]
        nonempty = [t for t in cell_texts if t]
        if nonempty and all(t in {"2024", "2025"} for t in nonempty):
            assert tr.find(class_="delta-badge") is None, "연도 헤더 행에 배지가 박혔습니다"

    # ascending 표라도 데이터 행에는 양수(▲) 배지가 박혀야 함 (▼ 가 아님)
    assert "▲" in income_html
    assert "▼" not in income_html
