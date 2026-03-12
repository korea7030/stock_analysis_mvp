"use client";

import { useEffect, useState } from "react";
import DOMPurify from "dompurify";

import type { AnalyzeResponse, EarningsItem, FilingForm, MetricValue } from "@/lib/apiTypes";
import { annotateTableHTML } from "@/lib/filingTables";

export default function Dashboard() {
  const [ticker, setTicker] = useState("AAPL");
  const [form, setForm] = useState<FilingForm>("10-Q");
  const [data, setData] = useState<AnalyzeResponse | null>(null);
  const [earnings, setEarnings] = useState<EarningsItem[] | null>(null);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [earningsError, setEarningsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);

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

  const upcoming = (earnings || []).filter((it) => (it.status || "").toLowerCase() !== "reported");
  const reported = (earnings || []).filter((it) => (it.status || "").toLowerCase() === "reported");

  async function analyze() {
    if (!ticker.trim()) {
      setInputError("Ticker를 입력하세요");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setData(null);

      const baseUrl = normalizeBaseUrl(apiBaseUrl);
      const encodedTicker = encodeURIComponent(ticker.trim());
      const encodedForm = encodeURIComponent(form);

      const res = await fetch(
        `${baseUrl}/analyze?ticker=${encodedTicker}&form=${encodedForm}`
      );
      if (!res.ok) {
        let errorMessage = "요청에 실패했습니다";
        if (res.status === 404) {
          errorMessage = "해당 보고서를 찾을 수 없습니다";
        } else {
          try {
            const payload = (await res.json()) as { message?: string };
            if (payload?.message) {
              errorMessage = payload.message;
            }
          } catch {
            errorMessage = `HTTP ${res.status}`;
          }
        }
        throw new Error(errorMessage);
      }
      const json: AnalyzeResponse = await res.json();
      setData(json);
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
          <p className="text-sm text-slate-200 mt-1">Statements, MD&A, and earnings in one place.</p>
        </div>

      {/* 입력 영역 */}
      <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-4 items-center">
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 mb-1">Ticker</span>
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
            <label className="flex gap-1 items-center text-sm">
              <input
                type="radio"
                checked={form === "10-Q"}
                onChange={() => setForm("10-Q")}
              />
              10-Q
            </label>
            <label className="flex gap-1 items-center text-sm">
              <input
                type="radio"
                checked={form === "10-K"}
                onChange={() => setForm("10-K")}
              />
              10-K
            </label>
            <label className="flex gap-1 items-center text-sm">
              <input
                type="radio"
                checked={form === "6-K"}
                onChange={() => setForm("6-K")}
              />
              6-K
            </label>
            <label className="flex gap-1 items-center text-sm">
              <input
                type="radio"
                checked={form === "8-K"}
                onChange={() => setForm("8-K")}
              />
              8-K
            </label>
            <label className="flex gap-1 items-center text-sm">
              <input
                type="radio"
                checked={form === "20-F"}
                onChange={() => setForm("20-F")}
              />
              20-F
            </label>
          </div>
        </div>

        <button
          onClick={analyze}
          className="ml-auto bg-black text-white px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Loading..." : "Analyze"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded p-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Earnings This Week</h2>
              <a
                className="text-xs text-slate-500 hover:underline"
                href="https://www.marketbeat.com/earnings/weekly/"
                target="_blank"
                rel="noreferrer"
              >
                Source
              </a>
            </div>
            {earningsLoading && <p className="text-sm text-slate-500 mt-3">Loading...</p>}
            {earningsError && <p className="text-sm text-red-600 mt-3">{earningsError}</p>}
            {!earningsLoading && !earningsError && earnings && earnings.length === 0 && (
              <p className="text-sm text-slate-500 mt-3">No earnings found.</p>
            )}

            {earnings && earnings.length > 0 && (
              <div className="mt-4 space-y-4">
                <div>
                  <div className="text-xs font-medium text-slate-500">Upcoming</div>
                  <div className="mt-2 space-y-2">
                    {upcoming.slice(0, 8).map((it, idx) => (
                      <div key={`${it.ticker || "x"}-${idx}`} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium text-sm">{it.ticker || "-"}</div>
                          <div className="text-xs text-slate-500">{it.release_time || "-"}</div>
                        </div>
                        <div className="text-xs text-slate-600 mt-1 line-clamp-2">{it.company || "-"}</div>
                        <div className="flex gap-3 mt-2 text-xs">
                          {it.earnings_release_url && (
                            <a className="text-blue-600 hover:underline" href={it.earnings_release_url} target="_blank" rel="noreferrer">
                              8-K Release
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
                </div>

                <div>
                  <div className="text-xs font-medium text-slate-500">Reported</div>
                  <div className="mt-2 space-y-2">
                    {reported.slice(0, 8).map((it, idx) => (
                      <div key={`${it.ticker || "y"}-${idx}`} className="border rounded-lg p-3 bg-slate-50">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium text-sm">{it.ticker || "-"}</div>
                          <div className="text-xs text-slate-500">{it.release_time || "-"}</div>
                        </div>
                        <div className="text-xs text-slate-600 mt-1 line-clamp-2">{it.company || "-"}</div>
                        <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-slate-700">
                          <div>EPS: {it.eps_actual || "-"} / {it.eps_estimate || "-"}</div>
                          <div>Rev: {it.revenue_actual || "-"} / {it.revenue_estimate || "-"}</div>
                        </div>
                        <div className="flex gap-3 mt-2 text-xs">
                          {it.earnings_release_url && (
                            <a className="text-blue-600 hover:underline" href={it.earnings_release_url} target="_blank" rel="noreferrer">
                              8-K Release
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
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
          {data && (
            <>
          {/* 메타 */}
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="text-xl font-semibold mb-1">Meta</h2>
            <p className="font-medium">
              {data.meta.company_name} ({data.meta.ticker})
            </p>
            <p className="text-sm text-gray-600">
              {data.meta.report_type} · Period End: {data.meta.period_end} ·
              Unit: {data.meta.unit}
            </p>
            {(data.meta.filing_date || data.meta.accession_number) && (
              <p className="mt-1 text-xs text-gray-500">
                Filing: {data.meta.filing_date || "-"} · Accession: {data.meta.accession_number || "-"}
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
                  Source document
                </a>
              </p>
            )}
            <p className="mt-1 text-xs text-gray-400">
              Last updated: {data.last_updated}
            </p>
          </div>

          {data.metrics && (
            <div className="bg-white rounded-xl shadow p-5 overflow-x-auto">
              <h2 className="text-xl font-semibold mb-3">Key Metrics</h2>
              <table>
                <thead>
                  <tr>
                    <th className="text-left">Metric</th>
                    <th className="text-right">Current</th>
                    <th className="text-right">Previous</th>
                    <th className="text-right">Change</th>
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

          {data.sections && (
            <div className="bg-white rounded-xl shadow p-5 space-y-4">
              <div>
                <h2 className="text-xl font-semibold mb-2">MD&A</h2>
                <pre className="whitespace-pre-wrap text-xs text-gray-700">
                  {data.sections.mdna || "No section found."}
                </pre>
                {data.sections.mdna_diff && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer">Show diff</summary>
                    <pre className="whitespace-pre-wrap text-xs text-gray-600 mt-2">
                      {data.sections.mdna_diff}
                    </pre>
                  </details>
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2">Risk Factors</h2>
                <pre className="whitespace-pre-wrap text-xs text-gray-700">
                  {data.sections.risk_factors || "No section found."}
                </pre>
                {data.sections.risk_factors_diff && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer">Show diff</summary>
                    <pre className="whitespace-pre-wrap text-xs text-gray-600 mt-2">
                      {data.sections.risk_factors_diff}
                    </pre>
                  </details>
                )}
              </div>
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
              <h2 className="text-xl font-bold mb-3">Income Statement</h2>
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
              <h2 className="text-xl font-bold mb-3">Balance Sheet</h2>
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
              <h2 className="text-xl font-bold mb-3">Cash Flow</h2>
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
