"use client";

import { useEffect, useState } from "react";
import DOMPurify from "dompurify";

import type { AnalyzeResponse, FilingForm } from "@/lib/apiTypes";
import { annotateTableHTML } from "@/lib/filingTables";

export default function Dashboard() {
  const [ticker, setTicker] = useState("AAPL");
  const [form, setForm] = useState<FilingForm>("10-Q");
  const [data, setData] = useState<AnalyzeResponse | null>(null);
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
          setApiBaseUrl(normalizeBaseUrl(resolvedBase));
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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: AnalyzeResponse = await res.json();
      setData(json);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Request failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  // ---------------- 공통 유틸 ----------------

  function sanitizeHtml(html: string): string {
    return DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true },
      ADD_TAGS: ["ix:nonfraction", "ix:nonnumeric"],
    });
  }

  // ---------------- 렌더 ----------------

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">10-Q / 10-K / 6-K Financial Dashboard</h1>

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
          <div className="flex gap-4 items-center">
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
          Error: {error}
        </div>
      )}

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
            <p className="mt-1 text-xs text-gray-400">
              Last updated: {data.last_updated}
            </p>
          </div>

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
  );
}
