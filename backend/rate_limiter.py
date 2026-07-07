from __future__ import annotations

import threading
import time
from collections import deque
from dataclasses import dataclass


@dataclass(frozen=True)
class RateLimitResult:
    allowed: bool
    retry_after_s: int = 0


class SlidingWindowRateLimiter:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._events: dict[str, deque[float]] = {}

    def allow(self, key: str, *, limit: int, window_s: int) -> RateLimitResult:
        if limit <= 0 or window_s <= 0:
            return RateLimitResult(allowed=True)

        now = time.time()
        cutoff = now - window_s

        with self._lock:
            events = self._events.setdefault(key, deque())
            while events and events[0] <= cutoff:
                events.popleft()

            if len(events) >= limit:
                retry_after_s = max(1, int(events[0] + window_s - now) + 1)
                return RateLimitResult(allowed=False, retry_after_s=retry_after_s)

            events.append(now)
            return RateLimitResult(allowed=True)

    def clear(self) -> None:
        with self._lock:
            self._events.clear()
