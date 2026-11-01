from types import SimpleNamespace
import concurrent.futures
import threading

import pytest
import requests

from backend import clients
from backend.cache import TTLCache


@pytest.fixture
def metadata_client(monkeypatch):
    clock = [1000.0]
    monkeypatch.setattr(clients.time, "time", lambda: clock[0])
    monkeypatch.setattr(clients.time, "sleep", lambda _: None)
    monkeypatch.setattr(clients, "_limiter_acquire", lambda *_: None)
    monkeypatch.setattr(clients, "_SEC_METADATA_CACHE", TTLCache(max_entries=512))
    monkeypatch.setattr(clients, "_SEC_METADATA_RATE_LIMIT_FALLBACK", TTLCache(max_entries=512))
    calls = []
    result = [SimpleNamespace(accession_number="original")]

    def fetch(query):
        calls.append(query)
        if isinstance(result[0], Exception):
            raise result[0]
        return list(result)

    downloader = SimpleNamespace(get_filing_metadatas=fetch)
    return clock, calls, result, downloader


def lookup(downloader, **kwargs):
    return clients.sec_get_filing_metadatas(
        downloader, ticker=kwargs.get("ticker", "AAPL"),
        form=kwargs.get("form", "10-Q"), limit=kwargs.get("limit", 1),
    )


def http_error(status):
    response = requests.Response()
    response.status_code = status
    return requests.HTTPError(response=response)


def test_metadata_cache_avoids_repeated_requests_and_refreshes(metadata_client):
    clock, calls, result, dl = metadata_client
    first = lookup(dl)
    first.clear()
    assert lookup(dl, ticker="aapl")[0].accession_number == "original"
    assert len(calls) == 1
    clock[0] += 301
    result[:] = [SimpleNamespace(accession_number="new")]
    assert lookup(dl)[0].accession_number == "new"
    assert len(calls) == 2


@pytest.mark.parametrize("kwargs", [{"ticker": "MSFT"}, {"form": "10-K"}])
def test_metadata_cache_is_query_scoped(metadata_client, kwargs):
    _, calls, _, dl = metadata_client
    lookup(dl)
    lookup(dl, **kwargs)
    assert len(calls) == 2


def test_metadata_cache_is_shared_across_limits_and_refreshes_together(metadata_client):
    clock, calls, result, dl = metadata_client
    result[:] = [SimpleNamespace(accession_number=f"old-{index}") for index in range(5)]
    assert len(lookup(dl, limit=1)) == 1
    assert len(lookup(dl, limit=5)) == 5
    assert len(calls) == 1
    assert calls[0].limit == 5

    clock[0] += 301
    result[:] = [SimpleNamespace(accession_number=f"new-{index}") for index in range(5)]
    assert lookup(dl, limit=1)[0].accession_number == "new-0"
    assert lookup(dl, limit=5)[0].accession_number == "new-0"
    assert len(calls) == 2


def test_concurrent_metadata_cache_misses_make_one_provider_request(metadata_client):
    _, calls, _, dl = metadata_client
    provider_entered = threading.Event()
    release_provider = threading.Event()
    third_cache_miss = threading.Event()
    duplicate_provider_call = threading.Event()
    miss_count = 0
    miss_count_lock = threading.Lock()

    class ObservedCache(TTLCache):
        def get(self, key):
            nonlocal miss_count
            value = super().get(key)
            if value is None:
                with miss_count_lock:
                    miss_count += 1
                    if miss_count >= 3:
                        third_cache_miss.set()
            return value

    def blocking_fetch(query):
        calls.append(query)
        if len(calls) >= 2:
            duplicate_provider_call.set()
        provider_entered.set()
        release_provider.wait(timeout=2)
        return [SimpleNamespace(accession_number="original")]

    clients._SEC_METADATA_CACHE = ObservedCache(max_entries=512)
    dl.get_filing_metadatas = blocking_fetch
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        first = executor.submit(lookup, dl)
        assert provider_entered.wait(timeout=2)
        second = executor.submit(lookup, dl)
        assert third_cache_miss.wait(timeout=2)
        assert not duplicate_provider_call.wait(timeout=0.1)
        release_provider.set()
        assert first.result(timeout=2)[0].accession_number == "original"
        assert second.result(timeout=2)[0].accession_number == "original"

    assert len(calls) == 1


def test_rate_limit_uses_recent_success_without_extending_expiry(metadata_client):
    clock, calls, result, dl = metadata_client
    lookup(dl)
    clock[0] += 301
    error = http_error(429)
    result[:] = [error]
    assert lookup(dl)[0].accession_number == "original"
    assert len(calls) == 4  # Initial success followed by three retries.
    clock[0] = 4600
    with pytest.raises(requests.HTTPError) as exc:
        lookup(dl)
    assert exc.value is error


@pytest.mark.parametrize("status", [403, 500])
def test_unrelated_errors_do_not_use_fallback(metadata_client, status):
    clock, _, result, dl = metadata_client
    lookup(dl)
    clock[0] += 301
    result[:] = [http_error(status)]
    with pytest.raises(requests.HTTPError):
        lookup(dl)


def test_cold_rate_limit_still_fails(metadata_client):
    _, _, result, dl = metadata_client
    result[:] = [http_error(429)]
    with pytest.raises(requests.HTTPError):
        lookup(dl)


def test_empty_metadata_is_not_cached(metadata_client):
    _, calls, result, dl = metadata_client
    result.clear()
    # Use a separate callable because this fixture's fetch expects a result.
    dl.get_filing_metadatas = lambda query: calls.append(query) or []
    assert lookup(dl) == []
    assert lookup(dl) == []
    assert len(calls) == 2
