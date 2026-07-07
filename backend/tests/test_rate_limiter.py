from backend.rate_limiter import SlidingWindowRateLimiter


def test_sliding_window_rate_limiter_blocks_after_limit() -> None:
    limiter = SlidingWindowRateLimiter()

    assert limiter.allow("ip:1", limit=2, window_s=60).allowed
    assert limiter.allow("ip:1", limit=2, window_s=60).allowed

    blocked = limiter.allow("ip:1", limit=2, window_s=60)
    assert not blocked.allowed
    assert blocked.retry_after_s > 0


def test_sliding_window_rate_limiter_is_key_scoped() -> None:
    limiter = SlidingWindowRateLimiter()

    assert limiter.allow("ip:1", limit=1, window_s=60).allowed
    assert not limiter.allow("ip:1", limit=1, window_s=60).allowed
    assert limiter.allow("ip:2", limit=1, window_s=60).allowed


def test_sliding_window_rate_limiter_can_be_disabled_with_zero_limit() -> None:
    limiter = SlidingWindowRateLimiter()

    for _ in range(5):
        assert limiter.allow("ip:1", limit=0, window_s=60).allowed
