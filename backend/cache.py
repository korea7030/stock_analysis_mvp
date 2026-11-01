from __future__ import annotations

import threading
import time
from dataclasses import dataclass
from typing import Generic, Optional, TypeVar


T = TypeVar("T")


@dataclass
class _Entry(Generic[T]):
    expires_at: float
    value: T


class TTLCache(Generic[T]):
    def __init__(self, max_entries: Optional[int] = None) -> None:
        if max_entries is not None and max_entries <= 0:
            raise ValueError("max_entries must be positive")
        self._lock = threading.Lock()
        self._data: dict[str, _Entry[T]] = {}
        self._max_entries = max_entries

    def get(self, key: str) -> Optional[T]:
        now = time.time()
        with self._lock:
            ent = self._data.get(key)
            if not ent:
                return None
            if ent.expires_at <= now:
                self._data.pop(key, None)
                return None
            if self._max_entries is not None:
                self._data.pop(key)
                self._data[key] = ent
            return ent.value

    def set(self, key: str, value: T, ttl_s: int) -> None:
        now = time.time()
        expires_at = now + max(0, int(ttl_s))
        with self._lock:
            expired_keys = [stored_key for stored_key, entry in self._data.items() if entry.expires_at <= now]
            for expired_key in expired_keys:
                self._data.pop(expired_key, None)
            self._data.pop(key, None)
            self._data[key] = _Entry(expires_at=expires_at, value=value)
            if self._max_entries is not None:
                while len(self._data) > self._max_entries:
                    oldest_key = next(iter(self._data))
                    self._data.pop(oldest_key)

    def __len__(self) -> int:
        with self._lock:
            return len(self._data)
