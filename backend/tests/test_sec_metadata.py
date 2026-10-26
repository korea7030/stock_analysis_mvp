from types import SimpleNamespace

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
    monkeypatch.setattr(clients, "_SEC_METADATA_CACHE", TTLCache())
    monkeypatch.setattr(clients, "_SEC_METADATA_RATE_LIMIT_FALLBACK", TTLCache())
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


@pytest.mark.parametrize("kwargs", [{"ticker": "MSFT"}, {"form": "10-K"}, {"limit": 2}])
def test_metadata_cache_is_query_scoped(metadata_client, kwargs):
    _, calls, _, dl = metadata_client
    lookup(dl)
    lookup(dl, **kwargs)
    assert len(calls) == 2


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
