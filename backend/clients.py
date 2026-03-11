from __future__ import annotations

import time
import os
import concurrent.futures
from typing import Any, Callable, Optional, TypeVar

import requests
from bs4 import BeautifulSoup
from pyrate_limiter import Duration, Limiter, Rate
from sec_downloader.types import RequestedFilings

from backend.cache import TTLCache


SEC_RPS = int(os.getenv("SEC_RPS", "10"))
MARKETBEAT_RPS = int(os.getenv("MARKETBEAT_RPS", "2"))

SEC_LIMITER = Limiter(Rate(SEC_RPS, Duration.SECOND))
MARKETBEAT_LIMITER = Limiter(Rate(MARKETBEAT_RPS, Duration.SECOND))


T = TypeVar("T")


class HttpStatusError(RuntimeError):
    def __init__(self, status_code: int, message: str):
        super().__init__(message)
        self.status_code = status_code


def _retry(
    fn: Callable[[], T],
    *,
    attempts: int,
    base_sleep_s: float,
    max_sleep_s: float,
    label: str,
) -> T:
    last_exc: Optional[Exception] = None
    for attempt in range(1, attempts + 1):
        try:
            return fn()
        except HttpStatusError as e:
            if e.status_code != 429:
                raise
            last_exc = e
            if attempt == attempts:
                break
            sleep_s = min(max_sleep_s, base_sleep_s * (2 ** (attempt - 1)))
            print(f"[{label}] retry attempt={attempt} sleep_s={sleep_s:.2f} status={e.status_code}")
            time.sleep(sleep_s)
        except Exception as e:
            last_exc = e
            if attempt == attempts:
                break
            sleep_s = min(max_sleep_s, base_sleep_s * (2 ** (attempt - 1)))
            print(f"[{label}] retry attempt={attempt} sleep_s={sleep_s:.2f} error={type(e).__name__}: {e}")
            time.sleep(sleep_s)
    raise last_exc  # type: ignore[misc]


def sec_get_filing_html(dl: Any, *, ticker: str, form: str, timeout_s: int = 30) -> str:
    def _call() -> str:
        t0 = time.time()
        SEC_LIMITER.try_acquire("sec", blocking=True)
        waited_s = time.time() - t0
        rate_limited = waited_s >= 0.01
        print(
            f"[sec_download] ticker={ticker} form={form} rate_limited={rate_limited} waited_s={waited_s:.3f}"
        )
        call_timeout_s = int(os.getenv("SEC_CALL_TIMEOUT_S", "90"))
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as ex:
            fut = ex.submit(dl.get_filing_html, ticker=ticker, form=form)
            try:
                html = fut.result(timeout=call_timeout_s)
            except concurrent.futures.TimeoutError as e:
                raise TimeoutError(f"SEC download timed out after {call_timeout_s}s") from e
        if isinstance(html, bytes):
            return html.decode("utf-8", errors="ignore")
        return html

    return _retry(_call, attempts=3, base_sleep_s=0.5, max_sleep_s=4.0, label="sec_download")


_SEC_INDEX_CACHE: TTLCache[dict[str, Any]] = TTLCache()


def sec_get_filing_metadatas(
    dl: Any,
    *,
    ticker: str,
    form: str,
    limit: int,
) -> list[Any]:
    query = RequestedFilings(ticker_or_cik=ticker, form_type=form, limit=limit)
    return list(dl.get_filing_metadatas(query))


def sec_download_filing_url(dl: Any, *, url: str) -> str:
    def _call() -> str:
        t0 = time.time()
        SEC_LIMITER.try_acquire("sec", blocking=True)
        waited_s = time.time() - t0
        rate_limited = waited_s >= 0.01
        print(f"[sec_download_url] rate_limited={rate_limited} waited_s={waited_s:.3f} url={url}")
        call_timeout_s = int(os.getenv("SEC_CALL_TIMEOUT_S", "90"))
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as ex:
            fut = ex.submit(dl.download_filing, url=url)
            try:
                html = fut.result(timeout=call_timeout_s)
            except concurrent.futures.TimeoutError as e:
                raise TimeoutError(f"SEC download timed out after {call_timeout_s}s") from e
        if isinstance(html, bytes):
            return html.decode("utf-8", errors="ignore")
        return html

    return _retry(_call, attempts=3, base_sleep_s=0.5, max_sleep_s=4.0, label="sec_download_url")


def sec_get_exhibit_urls(*, cik: str, accession_number: str) -> list[str]:
    accession_dir = accession_number.replace("-", "")
    cache_key = f"sec_index:{cik}:{accession_dir}"
    cached = _SEC_INDEX_CACHE.get(cache_key)
    if cached is None:
        url = f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{accession_dir}/index.json"
        r = requests.get(
            url,
            headers={"User-Agent": "Stock Analysis MVP korea7030.jhl@gmail.com"},
            timeout=20,
        )
        r.raise_for_status()
        cached = r.json()
        _SEC_INDEX_CACHE.set(cache_key, cached, ttl_s=86400)

    items = (cached.get("directory") or {}).get("item") or []
    ranked: list[tuple[int, str]] = []
    for it in items:
        name = str(it.get("name") or "")
        if not name:
            continue
        size_raw = it.get("size")
        try:
            size = int(size_raw) if size_raw not in (None, "") else 0
        except Exception:
            size = 0

        lower = name.lower()
        if lower.endswith(".htm") or lower.endswith(".html"):
            is_index = "-index" in lower or lower.endswith(".txt")
            if is_index:
                continue
            is_ex99 = lower.startswith("ex99") or "dex99" in lower
            score = size
            if is_ex99:
                score += 1_000_000
            ranked.append((score, name))

    ranked.sort(reverse=True)
    urls: list[str] = []
    for _score, name in ranked[:5]:
        urls.append(
            f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{accession_dir}/{name}"
        )
    return urls


def marketbeat_get_weekly_earnings(timeout_s: int = 10) -> list[dict[str, Any]]:
    url = "https://www.marketbeat.com/earnings/weekly/"

    def _call() -> list[dict[str, Any]]:
        t0 = time.time()
        MARKETBEAT_LIMITER.try_acquire("marketbeat", blocking=True)
        waited_s = time.time() - t0
        rate_limited = waited_s >= 0.01
        print(f"[marketbeat_fetch] url={url} rate_limited={rate_limited} waited_s={waited_s:.3f}")

        r = requests.get(
            url,
            headers={"User-Agent": "Stock Analysis MVP"},
            timeout=timeout_s,
        )
        if r.status_code != 200:
            raise HttpStatusError(r.status_code, f"HTTP {r.status_code}")

        soup = BeautifulSoup(r.text, "html.parser")
        table = soup.select_one("table.scroll-table")
        if not table:
            return []

        earnings: list[dict[str, Any]] = []
        for tr in table.select("tbody tr"):
            tds = tr.select("td")
            if len(tds) < 6:
                continue

            company_cell = tds[0]
            ticker_el = company_cell.select_one(".ticker-area")
            company_el = company_cell.select_one(".title-area")

            earnings.append(
                {
                    "ticker": ticker_el.text.strip() if ticker_el else None,
                    "company": company_el.text.strip() if company_el else None,
                    "release_time": tds[1].text.strip(),
                    "eps_estimate": tds[2].text.strip(),
                    "eps_actual": tds[3].text.strip(),
                    "revenue_estimate": tds[4].text.strip(),
                    "revenue_actual": tds[5].text.strip(),
                }
            )

        return earnings

    return _retry(_call, attempts=2, base_sleep_s=0.5, max_sleep_s=2.0, label="marketbeat_fetch")
