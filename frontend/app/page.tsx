"use client";

import { useEffect, useState } from "react";
import DOMPurify from "dompurify";

import type { AnalyzeResponse, EarningsItem, FilingForm, MetricValue } from "@/lib/apiTypes";
import { annotateTableHTML } from "@/lib/filingTables";

const EARNINGS_PAGE_SIZE = 8;
const FILING_FORMS: readonly FilingForm[] = ["10-Q", "10-K", "6-K", "8-K", "20-F"];
const FAVORITES_KEY = "stock-analysis-mvp:favorites";
const RECENT_KEY = "stock-analysis-mvp:recent";
const RECENT_MAX = 8;

function isFilingForm(value: string | null | undefined): value is FilingForm {
  return !!value && (FILING_FORMS as readonly string[]).includes(value);
}

function readTickerList(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is string => typeof x === "string")
      .map((x) => x.trim().toUpperCase())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function writeTickerList(key: string, list: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // localStorage 용량 초과/접근 거부 무시
  }
}

function clampPage(page: number, totalPages: number) {
  if (totalPages <= 1) return 1;
  return Math.min(Math.max(1, page), totalPages);
}

function Pager(props: {
  page: number;
  totalItems: number;
  pageSize: number;
  onChange: (nextPage: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(props.totalItems / props.pageSize));
  if (totalPages <= 1) return null;

  const start = props.totalItems === 0 ? 0 : (props.page - 1) * props.pageSize + 1;
  const end = Math.min(props.totalItems, props.page * props.pageSize);

  return (
    <div className="flex items-center justify-between pt-3">
      <button
        type="button"
        className="h-8 px-3 rounded border text-xs disabled:opacity-50"
        onClick={() => props.onChange(Math.max(1, props.page - 1))}
        disabled={props.page <= 1}
      >
        이전
      </button>
      <div className="text-xs text-slate-500">
        {start}-{end} / 총 {props.totalItems} · {props.page}/{totalPages} 페이지
      </div>
      <button
        type="button"
        className="h-8 px-3 rounded border text-xs disabled:opacity-50"
        onClick={() => props.onChange(Math.min(totalPages, props.page + 1))}
        disabled={props.page >= totalPages}
      >
        다음
      </button>
    </div>
  );
}

function formatLastUpdated(value: string | undefined) {
  if (!value) return "-";
  const trimmed = value.trim();
  const parts = trimmed.split("T");
  if (parts.length === 2) {
    const date = parts[0];
    const time = parts[1].split(".")[0].split("Z")[0];
    return `${date} ${time}`;
  }
  return trimmed;
}

export default function Dashboard() {
  const [ticker, setTicker] = useState("AAPL");
  const [form, setForm] = useState<FilingForm>("10-Q");
  const [data, setData] = useState<AnalyzeResponse | null>(null);
  const [earnings, setEarnings] = useState<EarningsItem[] | null>(null);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [earningsError, setEarningsError] = useState<string | null>(null);
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [reportedPage, setReportedPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [pendingAutoAnalyze, setPendingAutoAnalyze] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);

  const defaultApiBase =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
  const [apiBaseUrl, setApiBaseUrl] = useState(defaultApiBase);
  const localFallbackBase = "http://localhost:8000";

  const normalizeBaseUrl = (value: string) =>
    value.endsWith("/") ? value.slice(0, -1) : value;

  const isValidBaseUrl = (value: string) =>
    value.startsWith("http://") || value.startsWith("https://");

  useEffect(() => {
    let active = true;

    async function loadRuntimeConfig() {
      try {
        const response = await fetch("/config.json", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as { apiBaseUrl?: string };
        const nextBase = payload.apiBaseUrl?.trim();
        const isLocalhost =
          typeof window !== "undefined" &&
          (window.location.hostname === "localhost" ||
            window.location.hostname === "127.0.0.1");
        const envOverride = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
        const resolvedBase = isLocalhost && !envOverride ? localFallbackBase : nextBase;
        if (active && resolvedBase && isValidBaseUrl(resolvedBase)) {
          const normalized = normalizeBaseUrl(resolvedBase);
          setApiBaseUrl(normalized);
        }
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Runtime config load failed", err);
        }
      }
    }

    loadRuntimeConfig();

    return () => {
      active = false;
    };
  }, []);

  // 첫 마운트 시 URL 쿼리에서 ticker/form 을 복원하고, ticker 가 있으면 자동 분석 예약
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const t = params.get("ticker")?.trim().toUpperCase();
    const f = params.get("form")?.trim();
    if (t) setTicker(t);
    if (isFilingForm(f)) setForm(f);
    if (t) setPendingAutoAnalyze(true);
  }, []);

  // 첫 마운트 시 localStorage 에서 즐겨찾기/최근 본 종목 복원
  useEffect(() => {
    setFavorites(readTickerList(FAVORITES_KEY));
    setRecent(readTickerList(RECENT_KEY));
  }, []);

  useEffect(() => {
    writeTickerList(FAVORITES_KEY, favorites);
  }, [favorites]);

  useEffect(() => {
    writeTickerList(RECENT_KEY, recent);
  }, [recent]);

  function toggleFavorite(t: string) {
    const upper = t.trim().toUpperCase();
    if (!upper) return;
    setFavorites((prev) =>
      prev.includes(upper) ? prev.filter((x) => x !== upper) : [...prev, upper]
    );
    // 즐겨찾기에 추가되면 "최근" 에서는 빼서 중복 노출을 막음
    setRecent((prev) => prev.filter((x) => x !== upper));
  }

  function selectTicker(t: string) {
    const upper = t.trim().toUpperCase();
    if (!upper) return;
    setTicker(upper);
    setInputError(null);
    setPendingAutoAnalyze(true);
  }

  // ticker / form 변경 시 URL 쿼리스트링과 동기화 (replaceState 로 히스토리 오염 방지)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (ticker.trim()) {
      url.searchParams.set("ticker", ticker.trim());
    } else {
      url.searchParams.delete("ticker");
    }
    url.searchParams.set("form", form);
    const next = url.pathname + url.search + url.hash;
    const current = window.location.pathname + window.location.search + window.location.hash;
    if (next !== current) {
      window.history.replaceState(null, "", next);
    }
  }, [ticker, form]);

  useEffect(() => {
    let active = true;
    const baseUrl = normalizeBaseUrl(apiBaseUrl);
    if (!isValidBaseUrl(baseUrl)) return;

    async function loadEarnings() {
      setEarningsLoading(true);
      setEarningsError(null);
      try {
        const er = await fetch(`${baseUrl}/earnings`);
        if (!er.ok) {
          throw new Error(`HTTP ${er.status}`);
        }
        const payload = (await er.json()) as EarningsItem[];
        if (active) {
          setEarnings(Array.isArray(payload) ? payload : []);
        }
      } catch (e) {
        if (active) {
          const message = e instanceof Error ? e.message : "Failed to load earnings";
          setEarningsError(message);
          setEarnings([]);
        }
      } finally {
        if (active) {
          setEarningsLoading(false);
        }
      }
    }

    loadEarnings();
    return () => {
      active = false;
    };
  }, [apiBaseUrl]);

  const upcomingAll = (earnings || []).filter((it) => (it.status || "").toLowerCase() !== "reported");
  const reportedAll = (earnings || []).filter((it) => (it.status || "").toLowerCase() === "reported");

  const upcoming = [...upcomingAll].sort((a, b) => {
    const ad = a.report_date || "";
    const bd = b.report_date || "";
    if (ad !== bd) return ad.localeCompare(bd);
    return (a.ticker || "").localeCompare(b.ticker || "");
  });

  const reported = [...reportedAll].sort((a, b) => {
    const ad = a.report_date || "";
    const bd = b.report_date || "";
    if (ad !== bd) return bd.localeCompare(ad);
    return (a.ticker || "").localeCompare(b.ticker || "");
  });

  const upcomingTotalPages = Math.max(1, Math.ceil(upcoming.length / EARNINGS_PAGE_SIZE));
  const reportedTotalPages = Math.max(1, Math.ceil(reported.length / EARNINGS_PAGE_SIZE));

  useEffect(() => {
    setUpcomingPage((p) => clampPage(p, upcomingTotalPages));
  }, [upcomingTotalPages]);

  useEffect(() => {
    setReportedPage((p) => clampPage(p, reportedTotalPages));
  }, [reportedTotalPages]);

  const upcomingPageItems = upcoming.slice(
    (upcomingPage - 1) * EARNINGS_PAGE_SIZE,
    upcomingPage * EARNINGS_PAGE_SIZE
  );

  const reportedPageItems = reported.slice(
    (reportedPage - 1) * EARNINGS_PAGE_SIZE,
    reportedPage * EARNINGS_PAGE_SIZE
  );

  // URL 로 진입한 경우 apiBaseUrl 안정화 후 한 번 자동 분석
  useEffect(() => {
    if (!pendingAutoAnalyze) return;
    if (!ticker.trim()) return;
    if (!isValidBaseUrl(normalizeBaseUrl(apiBaseUrl))) return;
    setPendingAutoAnalyze(false);
    analyze();
    // analyze 는 ticker/form/apiBaseUrl 을 closure 로 사용하므로 deps 에 안 넣음
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAutoAnalyze, ticker, form, apiBaseUrl]);

  async function analyze() {
    if (!ticker.trim()) {
      setInputError("Ticker를 입력하세요");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setErrorCode(null);
      setData(null);

      const baseUrl = normalizeBaseUrl(apiBaseUrl);
      const encodedTicker = encodeURIComponent(ticker.trim());
      const encodedForm = encodeURIComponent(form);

      const res = await fetch(
        `${baseUrl}/analyze?ticker=${encodedTicker}&form=${encodedForm}`
      );
      if (!res.ok) {
        let errorMessage = "요청에 실패했습니다";
        let code: string | null = null;
        try {
          const payload = (await res.json()) as { message?: string; code?: string };
          if (payload?.message) errorMessage = payload.message;
          if (payload?.code) code = payload.code;
        } catch {
          if (res.status === 404) {
            errorMessage = "해당 보고서를 찾을 수 없습니다";
            code = "not_found";
          } else {
            errorMessage = `HTTP ${res.status}`;
          }
        }
        setErrorCode(code);
        throw new Error(errorMessage);
      }
      const json: AnalyzeResponse = await res.json();
      setData(json);

      // 분석 성공 시 즐겨찾기에 없는 ticker 만 "최근 본 종목" 에 기록
      const upperTicker = ticker.trim().toUpperCase();
      if (upperTicker) {
        setRecent((prev) => {
          if (favorites.includes(upperTicker)) return prev;
          const filtered = prev.filter((x) => x !== upperTicker);
          return [upperTicker, ...filtered].slice(0, RECENT_MAX);
        });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Request failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const formatNumber = (value: number | null | undefined) => {
    if (value == null) return "-";
    return Number(value).toLocaleString();
  };

  const formatPct = (value: number | null | undefined) => {
    if (value == null) return "N/A";
    const sign = value > 0 ? "+" : value < 0 ? "" : "";
    return `${sign}${value.toFixed(1)}%`;
  };

  const renderMetricRow = (label: string, metric?: MetricValue | null) => {
    const current = metric?.current ?? null;
    const previous = metric?.previous ?? null;
    const change = metric?.change_pct ?? null;
    return (
      <tr key={label}>
        <td className="text-left font-medium">{label}</td>
        <td className="text-right">{formatNumber(current)}</td>
        <td className="text-right">{formatNumber(previous)}</td>
        <td className="text-right">{formatPct(change)}</td>
      </tr>
    );
  };

  // ---------------- 공통 유틸 ----------------

  function sanitizeHtml(html: string): string {
    return DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true },
      ADD_TAGS: ["ix:nonfraction", "ix:nonnumeric"],
    });
  }

  // ---------------- 렌더 ----------------

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-700 text-white p-6 shadow">
          <h1 className="text-3xl font-semibold tracking-tight">SEC Filing Dashboard</h1>
          <p className="text-sm text-slate-200 mt-1">Statements and earnings in one place.</p>
        </div>

      {/* 입력 영역 */}
      <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-4 items-center">
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-1 gap-2">
            <span className="text-xs text-gray-500">Ticker</span>
            <button
              type="button"
              onClick={() => toggleFavorite(ticker)}
              disabled={!ticker.trim()}
              className="text-sm leading-none disabled:opacity-30 hover:scale-110 transition-transform"
              aria-label="즐겨찾기 토글"
              title={
                favorites.includes(ticker.trim().toUpperCase())
                  ? "즐겨찾기 해제"
                  : "즐겨찾기 추가"
              }
            >
              {favorites.includes(ticker.trim().toUpperCase()) ? "★" : "☆"}
            </button>
          </div>
          <input
            value={ticker}
            onChange={(e) => {
              setTicker(e.target.value.toUpperCase());
              if (inputError) {
                setInputError(null);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                analyze();
              }
            }}
            className={`border rounded px-3 py-2 min-w-[140px] ${
              inputError ? "border-red-500" : ""
            }`}
          />
          {/* 🔥 항상 자리를 차지하는 에러 영역 */}
          <div className="h-4 mt-1">
            {inputError && (
              <span className="text-xs text-red-600">
                {inputError}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col">
          <span className="text-xs text-gray-500 mb-1">Form</span>
          <div className="flex flex-wrap gap-4 items-center">
            {FILING_FORMS.map((f) => (
              <label key={f} className="flex gap-1 items-center text-sm">
                <input
                  type="radio"
                  name="filing-form"
                  checked={form === f}
                  onChange={() => setForm(f)}
                />
                {f}
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={analyze}
          className="ml-auto bg-black text-white px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "분석 중..." : "분석"}
        </button>
      </div>

      {(favorites.length > 0 || recent.length > 0) && (
        <div className="bg-white rounded-xl shadow p-3 space-y-2">
          {favorites.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-slate-500 mr-1">★ 즐겨찾기</span>
              {favorites.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center text-xs border rounded-full bg-amber-50 border-amber-200"
                >
                  <button
                    type="button"
                    onClick={() => selectTicker(t)}
                    className="font-medium text-amber-800 hover:underline pl-2 pr-1 py-0.5"
                  >
                    {t}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleFavorite(t)}
                    aria-label={`${t} 즐겨찾기 제거`}
                    title="즐겨찾기 제거"
                    className="text-amber-700 hover:text-amber-900 px-1.5 py-0.5"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          {recent.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-slate-500 mr-1">최근</span>
              {recent.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => selectTicker(t)}
                  className="text-xs border rounded-full px-2 py-0.5 hover:bg-slate-50"
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded p-3 text-sm">
          <p>{error}</p>
          {errorCode === "no_financial_data" && (
            <div className="mt-2 flex flex-wrap gap-2 items-center">
              <span className="text-xs text-red-600">다른 보고서로 다시 시도:</span>
              {FILING_FORMS.filter((f) => f !== form).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setForm(f);
                    setPendingAutoAnalyze(true);
                  }}
                  className="text-xs border border-red-300 rounded px-2 py-0.5 bg-white text-red-700 hover:bg-red-100"
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">이번 주 실적 발표</h2>
                <a
                  className="text-xs text-slate-500 hover:underline"
                  href="https://www.nasdaq.com/market-activity/earnings"
                  target="_blank"
                  rel="noreferrer"
                >
                출처
              </a>
            </div>
            {earningsLoading && <p className="text-sm text-slate-500 mt-3">불러오는 중...</p>}
            {earningsError && (
              <p className="text-sm text-red-600 mt-3">실적 데이터를 불러오지 못했습니다.</p>
            )}
            {!earningsLoading && !earningsError && earnings && earnings.length === 0 && (
              <p className="text-sm text-slate-500 mt-3">이번 주 발표 예정/완료된 실적이 없습니다.</p>
            )}

            {earnings && earnings.length > 0 && (
              <div className="mt-4 space-y-4">
                <div>
                  <div className="text-xs font-medium text-slate-500">발표 예정</div>
                  <div className="mt-2 space-y-2">
                    {upcomingPageItems.map((it, idx) => (
                      <div key={`${it.ticker || "x"}-${idx}`} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium text-sm">{it.ticker || "-"}</div>
                          <div className="text-xs text-slate-500">
                            {(it.report_date || "-") + " · " + (it.release_time || "TBD")}
                          </div>
                        </div>
                        <div className="text-xs text-slate-600 mt-1 line-clamp-2">{it.company || "-"}</div>
                        <div className="flex gap-3 mt-2 text-xs">
                          {it.earnings_release_url && (
                            <a className="text-blue-600 hover:underline" href={it.earnings_release_url} target="_blank" rel="noreferrer">
                              SEC 8-Ks
                            </a>
                          )}
                          {it.transcript_search_url && (
                            <a className="text-blue-600 hover:underline" href={it.transcript_search_url} target="_blank" rel="noreferrer">
                              Find Transcript
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Pager
                    page={upcomingPage}
                    totalItems={upcoming.length}
                    pageSize={EARNINGS_PAGE_SIZE}
                    onChange={setUpcomingPage}
                  />
                </div>

                <div>
                  <div className="text-xs font-medium text-slate-500">발표 완료</div>
                  <div className="mt-2 space-y-2">
                    {reportedPageItems.map((it, idx) => (
                      <div key={`${it.ticker || "y"}-${idx}`} className="border rounded-lg p-3 bg-slate-50">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium text-sm">{it.ticker || "-"}</div>
                          <div className="text-xs text-slate-500">
                            {(it.report_date || "-") + " · " + (it.release_time || "TBD")}
                          </div>
                        </div>
                        <div className="text-xs text-slate-600 mt-1 line-clamp-2">{it.company || "-"}</div>
                        <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-slate-700">
                          <div>EPS: {it.eps_actual || "-"} / {it.eps_estimate || "-"}</div>
                          <div>Rev: {it.revenue_actual || "-"} / {it.revenue_estimate || "-"}</div>
                        </div>
                        <div className="flex gap-3 mt-2 text-xs">
                          {it.earnings_release_url && (
                            <a className="text-blue-600 hover:underline" href={it.earnings_release_url} target="_blank" rel="noreferrer">
                              SEC 8-Ks
                            </a>
                          )}
                          {it.transcript_search_url && (
                            <a className="text-blue-600 hover:underline" href={it.transcript_search_url} target="_blank" rel="noreferrer">
                              Find Transcript
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Pager
                    page={reportedPage}
                    totalItems={reported.length}
                    pageSize={EARNINGS_PAGE_SIZE}
                    onChange={setReportedPage}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
          {loading && !data && (
            <>
              <div className="bg-white rounded-xl shadow p-5 animate-pulse">
                <div className="h-5 w-24 bg-slate-200 rounded mb-3" />
                <div className="h-4 w-3/4 bg-slate-100 rounded mb-2" />
                <div className="h-4 w-1/2 bg-slate-100 rounded" />
                <p className="text-xs text-slate-500 mt-4 not-italic">
                  SEC 에서 보고서를 받아 파싱하는 중입니다. 첫 호출은 수십 초가 걸릴 수 있어요.
                </p>
              </div>
              <div className="bg-white rounded-xl shadow p-5 animate-pulse">
                <div className="h-5 w-32 bg-slate-200 rounded mb-3" />
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-3 w-full bg-slate-100 rounded mb-2" />
                ))}
              </div>
            </>
          )}
          {data && (
            <>
          {/* 메타 */}
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="text-xl font-semibold mb-1">개요</h2>
            <p className="font-medium">
              {data.meta.company_name} ({data.meta.ticker})
            </p>
            <p className="text-sm text-gray-600">
              {data.meta.report_type ?? "-"} · 기준일 {data.meta.period_end ?? "-"} · 단위 {data.meta.unit ?? "-"}
            </p>
            {(data.meta.filing_date || data.meta.accession_number) && (
              <p className="mt-1 text-xs text-gray-500">
                공시일 {data.meta.filing_date || "-"} · Accession {data.meta.accession_number || "-"}
              </p>
            )}
            {data.meta.source_url && (
              <p className="mt-1 text-xs">
                <a
                  className="text-blue-600 hover:underline"
                  href={data.meta.source_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  원본 문서 보기
                </a>
              </p>
            )}
            <p className="mt-1 text-xs text-gray-400">
              최근 갱신: {formatLastUpdated(data.last_updated)}
            </p>
          </div>

          {data.metrics && (
            <div className="bg-white rounded-xl shadow p-5 overflow-x-auto">
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <h2 className="text-xl font-semibold">주요 지표</h2>
                <div className="text-xs text-slate-500">
                  {data.meta.report_type && <span>{data.meta.report_type}</span>}
                  {data.meta.period_end && <span> · 기준일 {data.meta.period_end}</span>}
                  {data.meta.unit && <span> · 단위 {data.meta.unit}</span>}
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-1 mb-3">
                Current = 가장 최근 보고 기간, Previous = 직전 동기간
                (10-Q 는 동분기, 10-K 는 동연도, 재무상태표는 직전 회계연도 말).
              </p>
              <table>
                <thead>
                  <tr>
                    <th className="text-left">지표</th>
                    <th className="text-right">Current</th>
                    <th className="text-right">Previous</th>
                    <th className="text-right">변동률</th>
                  </tr>
                </thead>
                <tbody>
                  {renderMetricRow("Revenue", data.metrics.revenue)}
                  {renderMetricRow("Gross Profit", data.metrics.gross_profit)}
                  {renderMetricRow("Operating Income", data.metrics.operating_income)}
                  {renderMetricRow("Net Income", data.metrics.net_income)}
                  {renderMetricRow("EPS (Basic)", data.metrics.eps_basic)}
                  {renderMetricRow("Cash & Equivalents", data.metrics.cash_and_equivalents)}
                  {renderMetricRow("Total Assets", data.metrics.total_assets)}
                  {renderMetricRow("Total Liabilities", data.metrics.total_liabilities)}
                  {renderMetricRow("Total Equity", data.metrics.total_equity)}
                  {renderMetricRow("Long-term Debt", data.metrics.long_term_debt)}
                  {renderMetricRow("Operating Cash Flow", data.metrics.operating_cash_flow)}
                  {renderMetricRow("Capex", data.metrics.capex)}
                  {renderMetricRow("Free Cash Flow", data.metrics.free_cash_flow)}
                </tbody>
              </table>
            </div>
          )}



          {/* 뱃지 + 기본 스타일 */}
          <style>{`
            .delta-badge {
              display: inline-flex;
              align-items: center;
              font-size: 10px;
              padding: 0 6px;
              border-radius: 9999px;
              margin-left: 4px;
              white-space: nowrap;
              border: 1px solid transparent;
            }
            .delta-up {
              background-color: #ecfdf5;
              color: #16a34a;
              border-color: #bbf7d0;
            }
            .delta-down {
              background-color: #fef2f2;
              color: #dc2626;
              border-color: #fecaca;
            }
            .delta-flat {
              background-color: #f3f4f6;
              color: #4b5563;
              border-color: #e5e7eb;
            }
            .delta-na {
              background-color: #f9fafb;
              color: #9ca3af;
              border-color: #e5e7eb;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            td, th {
              padding: 4px 6px;
              font-size: 11px;
            }
            .numeric-cell {
              white-space: nowrap;
            }
            .numeric-cell * {
              display: inline;
              white-space: nowrap;
            }
            tr:hover {
              background-color: #fafafa;
            }
          `}</style>

          {/* Income */}
          {data.tables?.income_statement && (
            <div className="bg-white rounded-xl shadow p-5 overflow-x-auto">
              <div className="flex items-baseline justify-between gap-2 flex-wrap mb-3">
                <h2 className="text-xl font-bold">손익계산서</h2>
                {data.meta.unit && (
                  <span className="text-xs text-slate-500">단위 {data.meta.unit}</span>
                )}
              </div>
              <div
                dangerouslySetInnerHTML={{
                  __html: annotateTableHTML(sanitizeHtml(data.tables.income_statement), "income"),
                }}
              />
            </div>
          )}

          {/* Balance */}
          {data.tables?.balance_sheet && (
            <div className="bg-white rounded-xl shadow p-5 overflow-x-auto">
              <div className="flex items-baseline justify-between gap-2 flex-wrap mb-3">
                <h2 className="text-xl font-bold">재무상태표</h2>
                {data.meta.unit && (
                  <span className="text-xs text-slate-500">단위 {data.meta.unit}</span>
                )}
              </div>
              <div
                dangerouslySetInnerHTML={{
                  __html: annotateTableHTML(sanitizeHtml(data.tables.balance_sheet), "balance"),
                }}
              />
            </div>
          )}

          {/* Cash Flow */}
          {data.tables?.cash_flow && (
            <div className="bg-white rounded-xl shadow p-5 overflow-x-auto">
              <div className="flex items-baseline justify-between gap-2 flex-wrap mb-3">
                <h2 className="text-xl font-bold">현금흐름표</h2>
                {data.meta.unit && (
                  <span className="text-xs text-slate-500">단위 {data.meta.unit}</span>
                )}
              </div>
              <div
                dangerouslySetInnerHTML={{
                  __html: annotateTableHTML(sanitizeHtml(data.tables.cash_flow), "cash"),
                }}
              />
            </div>
          )}
            </>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
