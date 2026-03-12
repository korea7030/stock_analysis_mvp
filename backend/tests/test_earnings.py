from __future__ import annotations

# pyright: basic, reportMissingImports=false

from datetime import date

import backend.clients as clients


class _FakeResponse:
    def __init__(self, *, status_code: int, payload: dict):
        self.status_code = status_code
        self._payload = payload

    def json(self):
        return self._payload


def test_nasdaq_get_earnings_for_date_reported(monkeypatch):
    monkeypatch.setattr(clients, "_limiter_acquire", lambda *_args, **_kwargs: None)

    def _fake_get(_url, *, headers, timeout):
        assert "User-Agent" in headers
        assert timeout
        return _FakeResponse(
            status_code=200,
            payload={
                "data": {
                    "rows": [
                        {
                            "symbol": "ABCD",
                            "name": "ABCD Corp",
                            "time": "time-after-hours",
                            "epsForecast": "$1.23",
                            "eps": "$1.30",
                            "surprise": "5.69%",
                        }
                    ]
                }
            },
        )

    monkeypatch.setattr(clients.requests, "get", _fake_get)

    items = clients.nasdaq_get_earnings_for_date(date(2026, 3, 11))
    assert len(items) == 1
    it = items[0]
    assert it["ticker"] == "ABCD"
    assert it["company"] == "ABCD Corp"
    assert it["release_time"] == "After Hours"
    assert it["eps_estimate"] == "$1.23"
    assert it["eps_actual"] == "$1.30"
    assert it["status"] == "reported"
    assert it["report_date"] == "2026-03-11"
    assert it["source"] == "nasdaq"
    assert it["transcript_search_url"] == "https://seekingalpha.com/symbol/ABCD/earnings/transcripts"


def test_nasdaq_get_earnings_for_date_upcoming(monkeypatch):
    monkeypatch.setattr(clients, "_limiter_acquire", lambda *_args, **_kwargs: None)

    def _fake_get(_url, *, headers, timeout):
        assert "User-Agent" in headers
        assert timeout
        return _FakeResponse(
            status_code=200,
            payload={
                "data": {
                    "rows": [
                        {
                            "symbol": "EFGH",
                            "name": "EFGH Inc.",
                            "time": "time-pre-market",
                            "epsForecast": "$0.50",
                            "lastYearRptDt": "3/12/2025",
                            "lastYearEPS": "$0.42",
                        }
                    ]
                }
            },
        )

    monkeypatch.setattr(clients.requests, "get", _fake_get)

    items = clients.nasdaq_get_earnings_for_date(date(2026, 3, 12))
    assert len(items) == 1
    it = items[0]
    assert it["ticker"] == "EFGH"
    assert it["release_time"] == "Before Market Open"
    assert it["eps_actual"] is None
    assert it["status"] == "upcoming"
    assert it["last_year_report_date"] == "3/12/2025"
    assert it["last_year_eps"] == "$0.42"
    assert it["transcript_search_url"] == "https://seekingalpha.com/symbol/EFGH/earnings/transcripts"


def test_seekingalpha_transcripts_url_preserves_colon():
    url = clients.seekingalpha_transcripts_url("tsla:ca")
    assert url == "https://seekingalpha.com/symbol/TSLA:CA/earnings/transcripts"
