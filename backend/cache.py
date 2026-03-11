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
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._data: dict[str, _Entry[T]] = {}

    def get(self, key: str) -> Optional[T]:
        now = time.time()
        with self._lock:
            ent = self._data.get(key)
            if not ent:
                return None
            if ent.expires_at <= now:
                self._data.pop(key, None)
                return None
            return ent.value

    def set(self, key: str, value: T, ttl_s: int) -> None:
        expires_at = time.time() + max(0, int(ttl_s))
        with self._lock:
            self._data[key] = _Entry(expires_at=expires_at, value=value)
