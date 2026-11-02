import concurrent.futures
import threading

import pytest

from backend import api
from backend.cache import TTLCache


def _calendar_request(*, ticker=None):
    return api.calendar(
        None,
        weeks=1,
        kind=None,
        status=None,
        country=None,
        importance=None,
        ticker=ticker,
    )


@pytest.fixture
def calendar_api(monkeypatch):
    monkeypatch.setattr(api, "_calendar_cache", TTLCache())
    monkeypatch.setattr(api, "_check_rate_limit", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(api, "load_response_cache", lambda **_kwargs: None)
    monkeypatch.setattr(api, "save_response_cache", lambda **_kwargs: None)
    monkeypatch.setattr(api, "_load_calendar_filter_config", lambda: {"earnings": 6, "desired_total": 23})
    monkeypatch.setattr(api, "_load_economic_items_from_cron", lambda limit=None: [])


def test_calendar_coalesces_concurrent_requests_for_same_key(calendar_api, monkeypatch):
    provider_entered = threading.Event()
    release_provider = threading.Event()
    duplicate_provider_call = threading.Event()
    second_started = threading.Event()
    calls = []

    def _fetch_earnings(limit=None):
        calls.append(1)
        if len(calls) >= 2:
            duplicate_provider_call.set()
        provider_entered.set()
        release_provider.wait(timeout=2)
        return []

    def _second_request():
        second_started.set()
        return _calendar_request()

    monkeypatch.setattr(api, "_fetch_earnings_items", _fetch_earnings)
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        first = executor.submit(_calendar_request)
        assert provider_entered.wait(timeout=2)
        second = executor.submit(_second_request)
        assert second_started.wait(timeout=2)
        assert not duplicate_provider_call.wait(timeout=0.2)
        release_provider.set()
        assert first.result(timeout=2) == []
        assert second.result(timeout=2) == []

    assert len(calls) == 1


def test_calendar_releases_singleflight_lock_after_failure(calendar_api, monkeypatch):
    calls = []

    def _fetch_earnings(_limit):
        calls.append(1)
        if len(calls) == 1:
            raise TimeoutError("provider timeout")
        return []

    monkeypatch.setattr(api, "_fetch_earnings_items", _fetch_earnings)

    with pytest.raises(TimeoutError, match="provider timeout"):
        _calendar_request()

    assert _calendar_request() == []
    assert len(calls) == 2


def test_calendar_allows_different_keys_to_fetch_concurrently(calendar_api, monkeypatch):
    first_ticker = "AAPL"
    first_key = f"calendar:v5:w1:k=:s=:c=:i=:t={first_ticker}"
    first_index = hash(first_key) % len(api._calendar_locks)
    second_ticker = next(
        ticker
        for ticker in (f"T{index}" for index in range(256))
        if hash(f"calendar:v5:w1:k=:s=:c=:i=:t={ticker}") % len(api._calendar_locks) != first_index
    )
    barrier = threading.Barrier(2)
    concurrent_fetch = threading.Event()

    def _fetch_earnings(limit=None):
        try:
            barrier.wait(timeout=0.5)
            concurrent_fetch.set()
        except threading.BrokenBarrierError:
            pass
        return []

    monkeypatch.setattr(api, "_fetch_earnings_items", _fetch_earnings)

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        first = executor.submit(_calendar_request, ticker=first_ticker)
        second = executor.submit(_calendar_request, ticker=second_ticker)
        assert first.result(timeout=2) == []
        assert second.result(timeout=2) == []

    assert concurrent_fetch.is_set()
