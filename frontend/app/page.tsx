"use client";

import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

import type { AiSummaryResponse, AnalyzeResponse, CalendarItem, FilingForm, MetricValue, MetricHistoryResponse } from "@/lib/apiTypes";
import { annotateTableHTML } from "@/lib/filingTables";

const EARNINGS_PAGE_SIZE = 8;
const FILING_FORMS: readonly FilingForm[] = ["10-Q", "10-K", "6-K", "8-K", "20-F"];
const FAVORITES_KEY = "stock-analysis-mvp:favorites";
const RECENT_KEY = "stock-analysis-mvp:recent";
const RECENT_MAX = 8;

const LOADING_STEPS = [
  "SEC EDGAR에서 공시 검색 중...",
  "최신 보고서 다운로드 중...",
  "재무제표 파싱 중...",
  "메트릭 추출 중...",
];

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

function formatChartValue(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(1);
}

function formatRetryAfter(seconds: number | undefined): string {
  if (!seconds || seconds <= 0) return "";
  if (seconds >= 3600) return ` 약 ${Math.ceil(seconds / 3600)}시간 후 다시 시도해 주세요.`;
  if (seconds >= 60) return ` 약 ${Math.ceil(seconds / 60)}분 후 다시 시도해 주세요.`;
  return ` 약 ${seconds}초 후 다시 시도해 주세요.`;
}

function apiErrorMessage(
  fallback: string,
  payload?: { message?: string; details?: { retry_after_s?: number }; retry_after_s?: number },
): string {
  const retryAfter = payload?.retry_after_s ?? payload?.details?.retry_after_s;
  return `${payload?.message ?? fallback}${formatRetryAfter(retryAfter)}`;
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

export default function Dashboard() {
  const [ticker, setTicker] = useState("AAPL");
  const [form, setForm] = useState<FilingForm>("10-Q");
  const [data, setData] = useState<AnalyzeResponse | null>(null);
  const [calendar, setCalendar] = useState<CalendarItem[] | null>(null);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [earningsError, setEarningsError] = useState<string | null>(null);
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [reportedPage, setReportedPage] = useState(1);
  const [economicPage, setEconomicPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [pendingAutoAnalyze, setPendingAutoAnalyze] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);

  const [loadingStep, setLoadingStep] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [currentStepMsg, setCurrentStepMsg] = useState<string>("");

  const [historyData, setHistoryData] = useState<MetricHistoryResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"metrics" | "trend">("metrics");
  const [compareTickerInput, setCompareTickerInput] = useState("");
  const [compareData, setCompareData] = useState<AnalyzeResponse | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  const [aiSummary, setAiSummary] = useState<AiSummaryResponse | null>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummaryError, setAiSummaryError] = useState<string | null>(null);

  const defaultApiBase =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
  const [apiBaseUrl, setApiBaseUrl] = useState(defaultApiBase);
  const localFallbackBase = "http://localhost:8000";

  const normalizeBaseUrl = (value: string) =>
    value.endsWith("/") ? value.slice(0, -1) : value;

  const isValidBaseUrl = (value: string) =>
    value.startsWith("http://") || value.startsWith("https://");

  useEffect(() => {
    if (!loading) {
      setLoadingStep(0);
      setElapsedSec(0);
      setCurrentStepMsg("");
      return;
    }
    const stepTimer = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % LOADING_STEPS.length);
    }, 3000);
    const secTimer = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => {
      clearInterval(stepTimer);
      clearInterval(secTimer);
    };
  }, [loading]);

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
        const isEnvLocalhost =
          !!envOverride &&
          (envOverride.includes("localhost") || envOverride.includes("127.0.0.1"));

        const resolvedBase = isLocalhost
          ? envOverride || localFallbackBase
          : nextBase || (!isEnvLocalhost ? envOverride : undefined);

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const t = params.get("ticker")?.trim().toUpperCase();
    const f = params.get("form")?.trim();
    if (t) setTicker(t);
    if (isFilingForm(f)) setForm(f);
    if (t) setPendingAutoAnalyze(true);
  }, []);

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
    setRecent((prev) => prev.filter((x) => x !== upper));
  }

  function selectTicker(t: string) {
    const upper = t.trim().toUpperCase();
    if (!upper) return;
    setTicker(upper);
    setInputError(null);
    setPendingAutoAnalyze(true);
  }

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
        const er = await fetch(`${baseUrl}/calendar?weeks=1`);
        if (!er.ok) {
          throw new Error(`HTTP ${er.status}`);
        }
        const payload = (await er.json()) as CalendarItem[];
        if (active) {
          setCalendar(Array.isArray(payload) ? payload : []);
        }
      } catch (e) {
        if (active) {
          const message = e instanceof Error ? e.message : "Failed to load earnings";
          setEarningsError(message);
          setCalendar([]);
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

  const earnings = (calendar || []).filter((it) => (it.kind || "earnings").toLowerCase() === "earnings");
  const economic = (calendar || []).filter((it) => (it.kind || "").toLowerCase() === "economic");

  const upcomingAll = earnings.filter((it) => (it.status || "").toLowerCase() !== "reported");
  const reportedAll = earnings.filter((it) => (it.status || "").toLowerCase() === "reported");

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
  const economicTotalPages = Math.max(1, Math.ceil(economic.length / EARNINGS_PAGE_SIZE));

  useEffect(() => {
    setUpcomingPage((p) => clampPage(p, upcomingTotalPages));
  }, [upcomingTotalPages]);

  useEffect(() => {
    setReportedPage((p) => clampPage(p, reportedTotalPages));
  }, [reportedTotalPages]);

  useEffect(() => {
    setEconomicPage((p) => clampPage(p, economicTotalPages));
  }, [economicTotalPages]);

  const upcomingPageItems = upcoming.slice(
    (upcomingPage - 1) * EARNINGS_PAGE_SIZE,
    upcomingPage * EARNINGS_PAGE_SIZE
  );

  const reportedPageItems = reported.slice(
    (reportedPage - 1) * EARNINGS_PAGE_SIZE,
    reportedPage * EARNINGS_PAGE_SIZE,
  );
  const economicPageItems = economic.slice(
    (economicPage - 1) * EARNINGS_PAGE_SIZE,
    economicPage * EARNINGS_PAGE_SIZE,
  );

  useEffect(() => {
    if (!pendingAutoAnalyze) return;
    if (!ticker.trim()) return;
    if (!isValidBaseUrl(normalizeBaseUrl(apiBaseUrl))) return;
    setPendingAutoAnalyze(false);
    analyze();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAutoAnalyze, ticker, form, apiBaseUrl]);

  function analyze() {
    if (!ticker.trim()) {
      setInputError("Ticker를 입력하세요");
      return;
    }

    setLoading(true);
    setError(null);
    setErrorCode(null);
    setData(null);

    const baseUrl = normalizeBaseUrl(apiBaseUrl);
    const encodedTicker = encodeURIComponent(ticker.trim());
    const encodedForm = encodeURIComponent(form);
    const url = `${baseUrl}/analyze/stream?ticker=${encodedTicker}&form=${encodedForm}`;

    const es = new EventSource(url);

    es.onmessage = (e) => {
      let parsed: { type: string; message?: string; code?: string; status?: number; retry_after_s?: number; data?: AnalyzeResponse };
      try {
        parsed = JSON.parse(e.data) as typeof parsed;
      } catch {
        return;
      }

      if (parsed.type === "progress" && parsed.message) {
        setLoadingStep(LOADING_STEPS.indexOf(parsed.message) >= 0
          ? LOADING_STEPS.indexOf(parsed.message)
          : loadingStep);
        setCurrentStepMsg(parsed.message);
      } else if (parsed.type === "result" && parsed.data) {
        es.close();
        setData(parsed.data);
        setLoading(false);
        const upperTicker = ticker.trim().toUpperCase();
        if (upperTicker) {
          setRecent((prev) => {
            if (favorites.includes(upperTicker)) return prev;
            const filtered = prev.filter((x) => x !== upperTicker);
            return [upperTicker, ...filtered].slice(0, RECENT_MAX);
          });
        }
      } else if (parsed.type === "error") {
        es.close();
        setErrorCode(parsed.code ?? null);
        setError(apiErrorMessage("요청에 실패했습니다", parsed));
        setLoading(false);
      }
    };

    es.onerror = () => {
      es.close();
      setError("서버 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      setLoading(false);
    };
  }

  const formatNumber = (value: number | null | undefined) => {
    if (value == null) return "-";
    return Number(value).toLocaleString();
  };

  useEffect(() => {
    if (!data) return;
    const resolvedTicker = data.meta.ticker || ticker;
    const resolvedForm = data.meta.report_type || form;
    const baseUrl = normalizeBaseUrl(apiBaseUrl);
    setHistoryLoading(true);
    setHistoryData(null);
    fetch(`${baseUrl}/analyze/history?ticker=${encodeURIComponent(resolvedTicker)}&form=${encodeURIComponent(resolvedForm)}`)
      .then((r) => r.json())
      .then((json) => setHistoryData(json as MetricHistoryResponse))
      .catch(() => setHistoryData(null))
      .finally(() => setHistoryLoading(false));
    setAiSummary(null);
    setAiSummaryError(null);
  }, [data, apiBaseUrl, form, ticker]);

  const formatPct = (value: number | null | undefined) => {
    if (value == null) return "N/A";
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}%`;
  };

  async function fetchAiSummary() {
    if (!data) return;
    const resolvedTicker = data.meta.ticker || ticker;
    const resolvedForm = data.meta.report_type || form;
    const baseUrl = normalizeBaseUrl(apiBaseUrl);
    setAiSummaryLoading(true);
    setAiSummaryError(null);
    setAiSummary(null);
    try {
      const res = await fetch(`${baseUrl}/analyze/summary?ticker=${encodeURIComponent(resolvedTicker)}&form=${encodeURIComponent(resolvedForm)}`);
      if (!res.ok) {
        const err = (await res.json()) as { message?: string; details?: { retry_after_s?: number } };
        throw new Error(apiErrorMessage(`HTTP ${res.status}`, err));
      }
      setAiSummary((await res.json()) as AiSummaryResponse);
    } catch (e) {
      setAiSummaryError(e instanceof Error ? e.message : "AI 요약 실패");
    } finally {
      setAiSummaryLoading(false);
    }
  }

  async function fetchCompare() {
    const ct = compareTickerInput.trim().toUpperCase();
    if (!ct) return;
    const baseUrl = normalizeBaseUrl(apiBaseUrl);
    setCompareLoading(true);
    setCompareError(null);
    setCompareData(null);
    try {
      const res = await fetch(`${baseUrl}/analyze?ticker=${encodeURIComponent(ct)}&form=${encodeURIComponent(form)}`);
      if (!res.ok) {
        const err = (await res.json()) as { message?: string; details?: { retry_after_s?: number } };
        throw new Error(apiErrorMessage(`HTTP ${res.status}`, err));
      }
      setCompareData((await res.json()) as AnalyzeResponse);
    } catch (e) {
      setCompareError(e instanceof Error ? e.message : "비교 데이터 로드 실패");
    } finally {
      setCompareLoading(false);
    }
  }

  const COMPARE_METRICS: { key: keyof NonNullable<AnalyzeResponse["metrics"]>; label: string }[] = [
    { key: "revenue", label: "매출" },
    { key: "gross_profit", label: "매출총이익" },
    { key: "operating_income", label: "영업이익" },
    { key: "net_income", label: "순이익" },
    { key: "operating_cash_flow", label: "영업현금흐름" },
    { key: "free_cash_flow", label: "잉여현금흐름" },
    { key: "total_assets", label: "총자산" },
    { key: "total_equity", label: "총자본" },
  ];

  const renderMetricRow = (label: string, metric?: MetricValue | null) => {
    const current = metric?.current ?? null;
    const previous = metric?.previous ?? null;
    const change = metric?.change_pct ?? null;
    const isPositive = change !== null && change > 0;
    const isNegative = change !== null && change < 0;
    return (
      <tr key={label} className="hover:bg-slate-50 transition-colors">
        <td className="text-left font-medium py-2 px-3 text-sm text-slate-700">{label}</td>
        <td className="text-right py-2 px-3 text-sm font-mono">{formatNumber(current)}</td>
        <td className="text-right py-2 px-3 text-sm font-mono text-slate-500">{formatNumber(previous)}</td>
        <td className={`text-right py-2 px-3 text-sm font-medium ${isPositive ? "text-green-600" : isNegative ? "text-red-500" : "text-slate-500"}`}>
          {formatPct(change)}
        </td>
      </tr>
    );
  };

  function sanitizeHtml(html: string): string {
    return DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true },
      ADD_TAGS: ["ix:nonfraction", "ix:nonnumeric"],
    });
  }

  const chartData = data?.metrics
    ? [
        {
          name: "Revenue",
          current: data.metrics.revenue?.current ?? 0,
          previous: data.metrics.revenue?.previous ?? 0,
        },
        {
          name: "Net Income",
          current: data.metrics.net_income?.current ?? 0,
          previous: data.metrics.net_income?.previous ?? 0,
        },
        {
          name: "FCF",
          current: data.metrics.free_cash_flow?.current ?? 0,
          previous: data.metrics.free_cash_flow?.previous ?? 0,
        },
      ]
    : null;

  const hasChartData =
    chartData !== null &&
    chartData.some((d) => d.current !== 0 || d.previous !== 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">


        <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-700 text-white p-5 sm:p-6 shadow">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">SEC Filing Dashboard</h1>
          <p className="text-sm text-slate-200 mt-1">Statements and earnings in one place.</p>
        </div>


        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">

            <div className="flex flex-col w-full sm:w-auto">
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
                  if (inputError) setInputError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") analyze();
                }}
                className={`border rounded px-3 py-2 w-full sm:min-w-[140px] sm:w-auto ${
                  inputError ? "border-red-500" : ""
                }`}
              />
              <div className="h-4 mt-1">
                {inputError && (
                  <span className="text-xs text-red-600">{inputError}</span>
                )}
              </div>
            </div>


            <div className="flex flex-col w-full sm:w-auto">
              <span className="text-xs text-gray-500 mb-1">Form</span>
              <div className="flex flex-wrap gap-3 items-center">
                {FILING_FORMS.map((f) => (
                  <label key={f} className="flex gap-1 items-center text-sm cursor-pointer">
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
              className="sm:ml-auto bg-black text-white px-5 py-2 rounded hover:bg-gray-800 disabled:opacity-60 w-full sm:w-auto"
              disabled={loading}
            >
              {loading ? "분석 중..." : "분석"}
            </button>
          </div>
        </div>


        {(favorites.length > 0 || recent.length > 0) && (
          <div className="bg-white rounded-xl shadow p-3 space-y-2 overflow-x-auto">
            {favorites.length > 0 && (
              <div className="flex flex-nowrap gap-2 items-center min-w-0">
                <span className="text-xs text-slate-500 mr-1 shrink-0">★ 즐겨찾기</span>
                {favorites.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center text-xs border rounded-full bg-amber-50 border-amber-200 shrink-0"
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
                      className="text-amber-700 hover:text-amber-900 px-1.5 py-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            {recent.length > 0 && (
              <div className="flex flex-nowrap gap-2 items-center min-w-0">
                <span className="text-xs text-slate-500 mr-1 shrink-0">최근</span>
                {recent.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => selectTicker(t)}
                    className="text-xs border rounded-full px-2 py-0.5 hover:bg-slate-50 shrink-0"
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


          <div className="order-1 lg:order-2 lg:col-span-8 space-y-6">


            {loading && !data && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl shadow p-5 animate-pulse">
                  <div className="h-5 w-32 bg-slate-200 rounded mb-4" />
                  <div className="h-4 w-3/4 bg-slate-100 rounded mb-2" />
                  <div className="h-4 w-1/2 bg-slate-100 rounded mb-2" />
                  <div className="h-4 w-2/3 bg-slate-100 rounded" />

                  <div className="mt-5 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                      <span className="text-xs text-slate-500">
                        {currentStepMsg || LOADING_STEPS[loadingStep]}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3">
                      <span className="text-xs text-slate-400">약 {elapsedSec}초 경과</span>
                      {elapsedSec >= 15 && (
                        <span className="text-xs text-slate-400">처음 조회는 30~60초 소요될 수 있습니다</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow p-5 animate-pulse">
                  <div className="h-5 w-24 bg-slate-200 rounded mb-4" />
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-3 bg-slate-100 rounded mb-2 ${i % 3 === 0 ? "w-full" : i % 3 === 1 ? "w-4/5" : "w-3/5"}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {data && (
              <>

                <div className="bg-white rounded-xl shadow p-5">
                  <h2 className="text-xl font-semibold mb-2">개요</h2>
                  <p className="font-medium text-slate-800">
                    {data.meta.company_name} ({data.meta.ticker})
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-500">
                    <span>{data.meta.report_type ?? "-"}</span>
                    <span>기준일 {data.meta.period_end ?? "-"}</span>
                    <span>단위 {data.meta.unit ?? "-"}</span>
                  </div>
                  {(data.meta.filing_date || data.meta.accession_number) && (
                    <p className="mt-1 text-xs text-gray-400">
                      공시일 {data.meta.filing_date || "-"} · Accession {data.meta.accession_number || "-"}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-3 items-center">
                    {data.meta.source_url && (
                      <a
                        className="text-xs text-blue-600 hover:underline"
                        href={data.meta.source_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        원본 문서 보기 →
                      </a>
                    )}
                    <span className="text-xs text-gray-400">
                      최근 갱신: {formatLastUpdated(data.last_updated)}
                    </span>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-slate-400">
                    SEC 원문 공시에서 자동 추출한 데이터입니다. 표 구조에 따라 일부 항목이 누락되거나 다르게 분류될 수 있으며 투자 조언으로 제공되지 않습니다.
                  </p>
                </div>


                <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 rounded-xl p-5">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold text-violet-900">AI 재무 요약</span>
                      <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium">GPT-4o</span>
                    </div>
                    {!aiSummary && !aiSummaryLoading && (
                      <button
                        type="button"
                        onClick={() => void fetchAiSummary()}
                        className="text-xs bg-violet-700 text-white px-3 py-1.5 rounded-lg hover:bg-violet-800"
                      >
                        요약 생성
                      </button>
                    )}
                    {aiSummary && (
                      <button
                        type="button"
                        onClick={() => void fetchAiSummary()}
                        className="text-xs text-violet-600 hover:underline"
                      >
                        재생성
                      </button>
                    )}
                  </div>
                  {aiSummaryLoading && (
                    <div className="flex items-center gap-2 text-sm text-violet-600">
                      <span className="inline-block w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                      GPT-4o 분석 중...
                    </div>
                  )}
                  {aiSummaryError && (
                    <p className="text-sm text-red-600">{aiSummaryError}</p>
                  )}
                  {aiSummary && (
                    <p className="text-sm text-slate-800 leading-relaxed">{aiSummary.summary}</p>
                  )}
                  {!aiSummary && !aiSummaryLoading && !aiSummaryError && (
                    <p className="text-xs text-violet-400">버튼을 눌러 AI 인사이트를 생성하세요</p>
                  )}
                </div>

                {hasChartData && chartData && (
                  <div className="bg-white rounded-xl shadow p-5">
                    <div className="flex items-baseline justify-between gap-2 flex-wrap mb-4">
                      <h2 className="text-xl font-semibold">핵심 지표 요약</h2>
                      {data.meta.unit && (
                        <span className="text-xs text-slate-500">단위 {data.meta.unit}</span>
                      )}
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart
                        data={chartData}
                        margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
                        barCategoryGap="30%"
                        barGap={4}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 12, fill: "#64748b" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tickFormatter={formatChartValue}
                          tick={{ fontSize: 11, fill: "#94a3b8" }}
                          axisLine={false}
                          tickLine={false}
                          width={52}
                        />
                        <Tooltip
                          formatter={(value: number, name: string) => [
                            formatChartValue(value),
                            name === "current" ? "Current" : "Previous",
                          ]}
                          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                        />
                        <Legend
                          formatter={(value) => (value === "current" ? "Current" : "Previous")}
                          wrapperStyle={{ fontSize: 12 }}
                        />
                        <Bar dataKey="current" name="current" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="previous" name="previous" fill="#bfdbfe" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}


                {data.metrics && (
                  <div className="bg-white rounded-xl shadow p-5">
                    <div className="flex items-baseline justify-between gap-2 flex-wrap mb-3">
                      <h2 className="text-xl font-semibold">주요 지표</h2>
                      <div className="flex items-center gap-3">
                        <div className="text-xs text-slate-500">
                          {data.meta.report_type && <span>{data.meta.report_type}</span>}
                          {data.meta.period_end && <span> · 기준일 {data.meta.period_end}</span>}
                          {data.meta.unit && <span> · 단위 {data.meta.unit}</span>}
                        </div>
                        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
                          <button
                            type="button"
                            onClick={() => setActiveTab("metrics")}
                            className={`px-3 py-1 ${activeTab === "metrics" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                          >
                            지표
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTab("trend")}
                            className={`px-3 py-1 ${activeTab === "trend" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                          >
                            트렌드
                          </button>
                        </div>
                      </div>
                    </div>

                    {activeTab === "metrics" && (
                      <>
                        <p className="text-xs text-slate-400 mb-3">
                          Current = 최근 보고 기간 / Previous = 직전 동기간
                        </p>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="border-b-2 border-slate-200">
                                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">지표</th>
                                <th className="text-right py-2 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Current</th>
                                <th className="text-right py-2 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Previous</th>
                                <th className="text-right py-2 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">변동률</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
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
                      </>
                    )}

                    {activeTab === "trend" && (
                      <div>
                        <p className="text-xs text-slate-400 mb-3">
                          트렌드는 이 서비스에 저장된 동일 티커/보고서 조회 이력을 기준으로 표시됩니다. 전체 과거 공시를 자동으로 소급 분석한 결과가 아닙니다.
                        </p>
                        {historyLoading && (
                          <p className="text-sm text-slate-500 py-8 text-center">히스토리 로딩 중...</p>
                        )}
                        {!historyLoading && (!historyData || historyData.history.length <= 1) && (
                          <p className="text-sm text-slate-400 py-8 text-center">
                            저장된 이력이 부족합니다. 같은 보고서 유형의 분석 결과가 쌓이면 표시됩니다.
                          </p>
                        )}
                        {!historyLoading && historyData && historyData.history.length > 1 && (() => {
                          const trendChartData = historyData.history.map((entry) => ({
                            period: entry.period_end,
                            revenue: entry.metrics?.revenue?.current ?? null,
                            net_income: entry.metrics?.net_income?.current ?? null,
                            operating_cash_flow: entry.metrics?.operating_cash_flow?.current ?? null,
                          }));
                          return (
                            <ResponsiveContainer width="100%" height={260}>
                              <LineChart data={trendChartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                <YAxis tickFormatter={formatChartValue} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={52} />
                                <Tooltip
                                  formatter={(value: number) => formatChartValue(value)}
                                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                                />
                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                <Line type="monotone" dataKey="revenue" name="매출" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} connectNulls />
                                <Line type="monotone" dataKey="net_income" name="순이익" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} connectNulls />
                                <Line type="monotone" dataKey="operating_cash_flow" name="영업현금흐름" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} connectNulls />
                              </LineChart>
                            </ResponsiveContainer>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {data.metrics && (
                  <div className="bg-white rounded-xl shadow p-5">
                    <h2 className="text-xl font-semibold mb-3">티커 비교</h2>
                    <div className="flex gap-2 mb-4">
                      <input
                        value={compareTickerInput}
                        onChange={(e) => setCompareTickerInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => { if (e.key === "Enter") void fetchCompare(); }}
                        placeholder="비교할 티커 입력 (예: MSFT)"
                        className="border rounded px-3 py-2 text-sm flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => void fetchCompare()}
                        disabled={compareLoading || !compareTickerInput.trim()}
                        className="bg-slate-800 text-white px-4 py-2 rounded text-sm hover:bg-slate-700 disabled:opacity-50"
                      >
                        {compareLoading ? "로딩..." : "비교"}
                      </button>
                      {compareData && (
                        <button
                          type="button"
                          onClick={() => { setCompareData(null); setCompareTickerInput(""); setCompareError(null); }}
                          className="px-3 py-2 border rounded text-sm text-slate-500 hover:bg-slate-50"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    {compareError && <p className="text-sm text-red-600 mb-3">{compareError}</p>}
                    {compareData?.metrics && (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr className="border-b-2 border-slate-200">
                              <th className="text-left py-2 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">지표</th>
                              <th className="text-right py-2 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">{data.meta.ticker ?? ticker}</th>
                              <th className="text-right py-2 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">{compareData.meta.ticker ?? compareTickerInput}</th>
                              <th className="text-right py-2 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">차이</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {COMPARE_METRICS.map(({ key, label }) => {
                              const aVal = data.metrics?.[key]?.current ?? null;
                              const bVal = compareData.metrics?.[key]?.current ?? null;
                              const diff = aVal != null && bVal != null && bVal !== 0
                                ? ((aVal - bVal) / Math.abs(bVal)) * 100
                                : null;
                              return (
                                <tr key={key} className="hover:bg-slate-50">
                                  <td className="py-2 px-3 font-medium text-slate-700">{label}</td>
                                  <td className="py-2 px-3 text-right font-mono">{formatNumber(aVal)}</td>
                                  <td className="py-2 px-3 text-right font-mono text-slate-500">{formatNumber(bVal)}</td>
                                  <td className={`py-2 px-3 text-right font-medium ${diff == null ? "text-slate-400" : diff > 0 ? "text-green-600" : diff < 0 ? "text-red-500" : "text-slate-500"}`}>
                                    {diff == null ? "-" : `${diff > 0 ? "+" : ""}${diff.toFixed(1)}%`}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}


                {data.tables?.income_statement && (
                  <div className="bg-white rounded-xl shadow p-5">
                    <div className="flex items-baseline justify-between gap-2 flex-wrap mb-3">
                      <h2 className="text-xl font-bold">손익계산서</h2>
                      {data.meta.unit && (
                        <span className="text-xs text-slate-500">단위 {data.meta.unit}</span>
                      )}
                    </div>
                    <div className="filing-table-wrapper overflow-x-auto max-h-[500px] overflow-y-auto rounded border border-slate-100">
                      <div
                        dangerouslySetInnerHTML={{
                          __html: annotateTableHTML(sanitizeHtml(data.tables.income_statement), "income"),
                        }}
                      />
                    </div>
                  </div>
                )}


                {data.tables?.balance_sheet && (
                  <div className="bg-white rounded-xl shadow p-5">
                    <div className="flex items-baseline justify-between gap-2 flex-wrap mb-3">
                      <h2 className="text-xl font-bold">재무상태표</h2>
                      {data.meta.unit && (
                        <span className="text-xs text-slate-500">단위 {data.meta.unit}</span>
                      )}
                    </div>
                    <div className="filing-table-wrapper overflow-x-auto max-h-[500px] overflow-y-auto rounded border border-slate-100">
                      <div
                        dangerouslySetInnerHTML={{
                          __html: annotateTableHTML(sanitizeHtml(data.tables.balance_sheet), "balance"),
                        }}
                      />
                    </div>
                  </div>
                )}


                {data.tables?.cash_flow && (
                  <div className="bg-white rounded-xl shadow p-5">
                    <div className="flex items-baseline justify-between gap-2 flex-wrap mb-3">
                      <h2 className="text-xl font-bold">현금흐름표</h2>
                      {data.meta.unit && (
                        <span className="text-xs text-slate-500">단위 {data.meta.unit}</span>
                      )}
                    </div>
                    <div className="filing-table-wrapper overflow-x-auto max-h-[500px] overflow-y-auto rounded border border-slate-100">
                      <div
                        dangerouslySetInnerHTML={{
                          __html: annotateTableHTML(sanitizeHtml(data.tables.cash_flow), "cash"),
                        }}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>


          <div className="order-2 lg:order-1 lg:col-span-4 space-y-6">
            <div className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-base sm:text-lg font-semibold">이번 주 캘린더</h2>
                <a
                  className="text-xs text-slate-500 hover:underline"
                  href="https://www.nasdaq.com/market-activity/earnings"
                  target="_blank"
                  rel="noreferrer"
                >
                  출처
                </a>
              </div>
              <p className="text-xs text-slate-400 mb-3">실적 발표 · 경제지표</p>

              {earningsLoading && <p className="text-sm text-slate-500 mt-3">불러오는 중...</p>}
              {earningsError && (
                <p className="text-sm text-red-600 mt-3">실적 데이터를 불러오지 못했습니다.</p>
              )}
              {!earningsLoading && !earningsError && earnings.length === 0 && (
                <p className="text-sm text-slate-500 mt-3">이번 주 발표 예정/완료된 실적이 없습니다.</p>
              )}

              {earnings.length > 0 && (
                <div className="mt-2 space-y-5">

                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">발표 예정</div>
                    <div className="space-y-2">
                      {upcomingPageItems.map((it, idx) => (
                        <div key={`${it.ticker || "x"}-${idx}`} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-semibold text-sm">{it.ticker || "-"}</div>
                            <div className="text-xs text-slate-500">
                              {(it.report_date || "-")} · {it.release_time || "TBD"}
                            </div>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{it.company || "-"}</div>
                          <div className="flex gap-3 mt-2 text-xs">
                            {it.earnings_release_url && (
                              <a className="text-blue-600 hover:underline" href={it.earnings_release_url} target="_blank" rel="noreferrer">
                                SEC 8-Ks
                              </a>
                            )}
                            {it.transcript_search_url && (
                              <a className="text-blue-600 hover:underline" href={it.transcript_search_url} target="_blank" rel="noreferrer">
                                Transcript
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <Pager page={upcomingPage} totalItems={upcoming.length} pageSize={EARNINGS_PAGE_SIZE} onChange={setUpcomingPage} />
                  </div>


                  {reported.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">발표 완료</div>
                      <div className="space-y-2">
                        {reportedPageItems.map((it, idx) => (
                          <div key={`${it.ticker || "y"}-${idx}`} className="border rounded-lg p-3 bg-slate-50">
                            <div className="flex items-center justify-between gap-2">
                              <div className="font-semibold text-sm">{it.ticker || "-"}</div>
                              <div className="text-xs text-slate-500">
                                {(it.report_date || "-")} · {it.release_time || "TBD"}
                              </div>
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{it.company || "-"}</div>
                            <div className="grid grid-cols-2 gap-1 mt-2 text-xs text-slate-600">
                              <div>EPS: <span className="font-medium">{it.eps_actual || "-"}</span> / {it.eps_estimate || "-"}</div>
                              <div>Rev: <span className="font-medium">{it.revenue_actual || "-"}</span> / {it.revenue_estimate || "-"}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Pager page={reportedPage} totalItems={reported.length} pageSize={EARNINGS_PAGE_SIZE} onChange={setReportedPage} />
                    </div>
                  )}


                  {economic.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2">경제지표</div>
                      <div className="space-y-2">
                        {economicPageItems.map((it, idx) => (
                          <div key={`${it.event || "ev"}-${idx}`} className="border rounded-lg p-3 bg-indigo-50/40">
                            <div className="flex items-start justify-between gap-2">
                              <div className="font-medium text-sm leading-tight">{it.event || "-"}</div>
                              <div className="text-xs text-slate-500 shrink-0">{it.event_date || "-"}</div>
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {it.country || "US"} · {it.importance || "-"}
                              {it.release_time && ` · ${it.release_time}`}
                            </div>
                            {(it.actual || it.consensus || it.previous) && (
                              <div className="text-xs mt-2 grid grid-cols-3 gap-1 bg-white/70 p-2 rounded border border-indigo-100/50">
                                <div className="text-slate-500">실제<br /><span className="font-semibold text-slate-800">{it.actual || "-"}</span></div>
                                <div className="text-slate-500">예측<br /><span className="font-semibold text-slate-800">{it.consensus || "-"}</span></div>
                                <div className="text-slate-500">이전<br /><span className="font-semibold text-slate-800">{it.previous || "-"}</span></div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <Pager page={economicPage} totalItems={economic.length} pageSize={EARNINGS_PAGE_SIZE} onChange={setEconomicPage} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
