import pytest

from backend import cache as cache_module
from backend.cache import TTLCache


def test_cache_returns_unexpired_value(monkeypatch):
    monkeypatch.setattr(cache_module.time, "time", lambda: 1000.0)
    cache = TTLCache[str]()

    cache.set("key", "value", ttl_s=60)

    assert cache.get("key") == "value"
    assert len(cache) == 1


@pytest.mark.parametrize("max_entries", [0, -1])
def test_cache_rejects_non_positive_capacity(max_entries):
    with pytest.raises(ValueError, match="max_entries must be positive"):
        TTLCache(max_entries=max_entries)


def test_cache_evicts_least_recently_used_entry(monkeypatch):
    monkeypatch.setattr(cache_module.time, "time", lambda: 1000.0)
    cache = TTLCache[str](max_entries=2)
    cache.set("first", "1", ttl_s=60)
    cache.set("second", "2", ttl_s=60)

    assert cache.get("first") == "1"
    cache.set("third", "3", ttl_s=60)

    assert cache.get("second") is None
    assert cache.get("first") == "1"
    assert cache.get("third") == "3"


def test_cache_prunes_expired_entries_when_setting_another_key(monkeypatch):
    clock = [1000.0]
    monkeypatch.setattr(cache_module.time, "time", lambda: clock[0])
    cache = TTLCache[str](max_entries=3)
    cache.set("expired-one", "1", ttl_s=1)
    cache.set("expired-two", "2", ttl_s=1)

    clock[0] += 2
    cache.set("current", "3", ttl_s=60)

    assert len(cache) == 1
    assert cache.get("current") == "3"
