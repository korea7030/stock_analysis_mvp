from __future__ import annotations

import time
import os
import concurrent.futures
import urllib.parse
from datetime import date, datetime, timedelta
from typing import Any, Callable, Optional, TypeVar

import requests
from bs4 import BeautifulSoup
from pyrate_limiter import Duration, Limiter, Rate
from sec_downloader.types import RequestedFilings

from .cache import TTLCache


SEC_RPS = int(os.getenv("SEC_RPS", "10"))
MARKETBEAT_RPS = int(os.getenv("MARKETBEAT_RPS", "2"))
NASDAQ_RPS = int(os.getenv("NASDAQ_RPS", "2"))

SEC_LIMITER = Limiter(Rate(SEC_RPS, Duration.SECOND))
MARKETBEAT_LIMITER = Limiter(Rate(MARKETBEAT_RPS, Duration.SECOND))
NASDAQ_LIMITER = Limiter(Rate(NASDAQ_RPS, Duration.SECOND))


T = TypeVar("T")


def _limiter_acquire(limiter: Limiter, name: str) -> None:
    fn: Any = limiter.try_acquire
    try:
        fn(name, blocking=True)
    except TypeError:
        fn(name)


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
    if last_exc is None:
        raise RuntimeError(f"[{label}] failed without an exception")
    raise last_exc


def sec_get_filing_html(dl: Any, *, ticker: str, form: str, timeout_s: int = 30) -> str:
    def _call() -> str:
        t0 = time.time()
        _limiter_acquire(SEC_LIMITER, "sec")
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

_SEC_TICKER_MAP_CACHE: TTLCache[dict[str, str]] = TTLCache()


def _sec_headers() -> dict[str, str]:
    return {"User-Agent": "Stock Analysis MVP korea7030.jhl@gmail.com"}


def _normalize_ticker_for_sec(symbol: str) -> str:
    return symbol.strip().upper().replace(".", "-").replace("/", "-")


def sec_ticker_to_cik(ticker: str | None) -> str | None:
    if ticker is None:
        return None
    normalized = _normalize_ticker_for_sec(ticker)
    if not normalized:
        return None

    cache_key = "sec_company_tickers"
    mapping = _SEC_TICKER_MAP_CACHE.get(cache_key)
    if mapping is None:
        url = "https://www.sec.gov/files/company_tickers.json"

        def _call() -> dict[str, str]:
            t0 = time.time()
            _limiter_acquire(SEC_LIMITER, "sec")
            waited_s = time.time() - t0
            rate_limited = waited_s >= 0.01
            print(f"[sec_ticker_map] fetch rate_limited={rate_limited} waited_s={waited_s:.3f}")
            r = requests.get(url, headers=_sec_headers(), timeout=20)
            if r.status_code != 200:
                raise HttpStatusError(r.status_code, f"HTTP {r.status_code}")
            payload = r.json()
            out: dict[str, str] = {}
            if isinstance(payload, dict):
                for item in payload.values():
                    if not isinstance(item, dict):
                        continue
                    t = item.get("ticker")
                    c = item.get("cik_str")
                    if not t or c is None:
                        continue
                    key = _normalize_ticker_for_sec(str(t))
                    out[key] = str(c).zfill(10)
            return out

        mapping = _retry(_call, attempts=3, base_sleep_s=0.5, max_sleep_s=4.0, label="sec_ticker_map")
        _SEC_TICKER_MAP_CACHE.set(cache_key, mapping, ttl_s=86400)

    cik = mapping.get(normalized)
    if cik:
        return cik
    return mapping.get(ticker.strip().upper())


def sec_company_filings_url(*, ticker: str | None, form_type: str) -> str | None:
    cik = sec_ticker_to_cik(ticker)
    if cik is None:
        return None
    params = {
        "action": "getcompany",
        "CIK": cik,
        "type": form_type,
        "owner": "exclude",
        "count": "40",
    }
    return "https://www.sec.gov/cgi-bin/browse-edgar?" + urllib.parse.urlencode(params)


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
        _limiter_acquire(SEC_LIMITER, "sec")
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
    positive_keywords = [
        "press",
        "release",
        "earn",
        "result",
        "financial",
        "statement",
        "operations",
        "income",
        "cash",
        "mda",
        "mdaq",
        "interim",
        "quarter",
        "q1",
        "q2",
        "q3",
        "q4",
        "fy",
    ]
    negative_keywords = [
        "executive",
        "director",
        "share",
        "dealing",
        "transaction",
        "notice",
        "proxy",
        "govern",
        "compliance",
        "signature",
    ]
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
            if any(k in lower for k in positive_keywords):
                score += 250_000
            if any(k in lower for k in negative_keywords):
                score -= 500_000
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
        _limiter_acquire(MARKETBEAT_LIMITER, "marketbeat")
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

            ticker = ticker_el.text.strip().upper() if ticker_el else None
            company = company_el.text.strip() if company_el else None
            release_time = tds[1].text.strip()
            eps_estimate = tds[2].text.strip()
            eps_actual = tds[3].text.strip()
            revenue_estimate = tds[4].text.strip()
            revenue_actual = tds[5].text.strip()

            def _is_missing(value: str | None) -> bool:
                if value is None:
                    return True
                cleaned = value.strip()
                return cleaned in {"", "-", "—", "N/A"}

            status = "reported" if (not _is_missing(eps_actual) or not _is_missing(revenue_actual)) else "upcoming"
            earnings_release_url = sec_company_filings_url(ticker=ticker, form_type="8-K")
            transcript_search_url = seekingalpha_transcripts_url(ticker)

            earnings.append(
                {
                    "ticker": ticker,
                    "company": company,
                    "release_time": release_time,
                    "eps_estimate": eps_estimate,
                    "eps_actual": eps_actual,
                    "revenue_estimate": revenue_estimate,
                    "revenue_actual": revenue_actual,
                    "status": status,
                    "earnings_release_url": earnings_release_url,
                    "transcript_search_url": transcript_search_url,
                    "source_url": url,
                }
            )

        return earnings

    return _retry(_call, attempts=2, base_sleep_s=0.5, max_sleep_s=2.0, label="marketbeat_fetch")


def _nasdaq_headers() -> dict[str, str]:
    return {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Origin": "https://www.nasdaq.com",
        "Referer": "https://www.nasdaq.com/market-activity/earnings",
    }


def _nasdaq_time_label(value: str | None) -> str:
    cleaned = value.strip() if value else ""
    if not cleaned:
        return "TBD"
    mapping: dict[str, str] = {
        "time-before-market-open": "Before Market Open",
        "time-pre-market": "Before Market Open",
        "time-after-hours": "After Hours",
        "time-not-supplied": "Time Not Supplied",
    }
    return mapping.get(cleaned, cleaned)


def seekingalpha_transcripts_url(ticker: str | None) -> str | None:
    if ticker is None:
        return None
    symbol = ticker.strip().upper()
    if not symbol:
        return None
    quoted = urllib.parse.quote(symbol, safe=":.")
    return f"https://seekingalpha.com/symbol/{quoted}/earnings/transcripts"


def _nasdaq_status(
    *,
    report_date: date,
    time_code: str | None,
    eps_actual: Any,
    today: date | None,
    now_et: datetime | None,
) -> str:
    if not _is_missing_text(eps_actual):
        return "reported"
    if today is None:
        return "upcoming"
    if report_date < today:
        return "reported"
    if report_date > today:
        return "upcoming"
    if now_et is None:
        return "upcoming"

    code = (time_code or "").strip()
    if code in {"time-pre-market", "time-before-market-open"}:
        deadline = now_et.replace(hour=11, minute=0, second=0, microsecond=0)
        return "reported" if now_et >= deadline else "upcoming"
    if code == "time-after-hours":
        deadline = now_et.replace(hour=18, minute=0, second=0, microsecond=0)
        return "reported" if now_et >= deadline else "upcoming"

    return "upcoming"


def _is_missing_text(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        cleaned = value.strip()
        return cleaned in {"", "-", "—", "N/A"}
    return False


def nasdaq_get_earnings_for_date(
    report_date: date,
    *,
    today: date | None = None,
    now_et: datetime | None = None,
    timeout_s: int = 20,
) -> list[dict[str, Any]]:
    date_str = report_date.isoformat()
    url = f"https://api.nasdaq.com/api/calendar/earnings?date={urllib.parse.quote_plus(date_str)}"

    def _call() -> list[dict[str, Any]]:
        t0 = time.time()
        _limiter_acquire(NASDAQ_LIMITER, "nasdaq")
        waited_s = time.time() - t0
        rate_limited = waited_s >= 0.01
        print(f"[nasdaq_fetch] url={url} rate_limited={rate_limited} waited_s={waited_s:.3f}")
        r = requests.get(url, headers=_nasdaq_headers(), timeout=timeout_s)
        if r.status_code != 200:
            raise HttpStatusError(r.status_code, f"HTTP {r.status_code}")
        payload = r.json()
        rows = ((payload.get("data") or {}).get("rows")) or []
        if not isinstance(rows, list):
            return []

        out: list[dict[str, Any]] = []
        for row in rows:
            if not isinstance(row, dict):
                continue
            ticker_raw = row.get("symbol")
            ticker = str(ticker_raw).strip().upper() if ticker_raw else None
            company_raw = row.get("name")
            company = str(company_raw).strip() if company_raw else None

            eps_estimate = row.get("epsForecast")
            eps_actual = row.get("eps")

            time_code = row.get("time")
            status = _nasdaq_status(
                report_date=report_date,
                time_code=str(time_code) if time_code is not None else None,
                eps_actual=eps_actual,
                today=today,
                now_et=now_et,
            )
            earnings_release_url = sec_company_filings_url(ticker=ticker, form_type="8-K")
            transcript_search_url = seekingalpha_transcripts_url(ticker)

            out.append(
                {
                    "ticker": ticker,
                    "company": company,
                    "release_time": _nasdaq_time_label(str(time_code) if time_code is not None else None),
                    "eps_estimate": str(eps_estimate).strip() if not _is_missing_text(eps_estimate) else None,
                    "eps_actual": str(eps_actual).strip() if not _is_missing_text(eps_actual) else None,
                    "revenue_estimate": None,
                    "revenue_actual": None,
                    "status": status,
                    "report_date": date_str,
                    "earnings_release_url": earnings_release_url,
                    "transcript_search_url": transcript_search_url,
                    "source_url": url,
                    "source": "nasdaq",
                    "last_year_eps": (str(row.get("lastYearEPS")).strip() if not _is_missing_text(row.get("lastYearEPS")) else None),
                    "last_year_report_date": (
                        str(row.get("lastYearRptDt")).strip() if not _is_missing_text(row.get("lastYearRptDt")) else None
                    ),
                }
            )
        return out

    return _retry(_call, attempts=3, base_sleep_s=0.5, max_sleep_s=4.0, label="nasdaq_fetch")


def nasdaq_get_weekly_earnings(anchor_date: date | None = None) -> list[dict[str, Any]]:
    if anchor_date is None:
        try:
            from zoneinfo import ZoneInfo

            anchor_date = datetime.now(ZoneInfo("America/New_York")).date()
        except Exception:
            anchor_date = datetime.now().date()

    week_start = anchor_date - timedelta(days=anchor_date.weekday())
    days = [week_start + timedelta(days=i) for i in range(7)]

    now_et: datetime | None = None
    try:
        from zoneinfo import ZoneInfo

        now_et = datetime.now(ZoneInfo("America/New_York"))
    except Exception:
        now_et = None

    earnings: list[dict[str, Any]] = []
    for d in days:
        try:
            earnings.extend(nasdaq_get_earnings_for_date(d, today=anchor_date, now_et=now_et))
        except Exception as e:
            print(f"[nasdaq_fetch] date={d.isoformat()} failed error={type(e).__name__}: {e}")
            continue

    return earnings


def get_weekly_earnings() -> list[dict[str, Any]]:
    try:
        earnings = nasdaq_get_weekly_earnings()
        if earnings:
            return earnings
    except Exception as e:
        print(f"[earnings] nasdaq_failed error={type(e).__name__}: {e}")

    try:
        return marketbeat_get_weekly_earnings()
    except Exception as e:
        print(f"[earnings] marketbeat_failed error={type(e).__name__}: {e}")
        return []
