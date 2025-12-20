"use client";

import { useState } from "react";

export default function Dashboard() {
  const [ticker, setTicker] = useState("AAPL");
  const [form, setForm] = useState<"10-Q" | "6-K">("10-Q");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);

  async function analyze() {
    if (!ticker.trim()) {
      setInputError("Ticker를 입력하세요");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setData(null);

      const API_BASE =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

      const res = await fetch(
        `${API_BASE}/analyze?ticker=${ticker}&form=${form}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e?.message ?? "Request failed");
    } finally {
      setLoading(false);
    }
  }

  // ---------------- 공통 유틸 ----------------

  function parseNum(text: string | null): number | null {
    if (!text) return null;
    const raw = text.replace(/\u00a0/g, " ").trim();
    if (!raw) return null;
    // 숫자 하나도 없으면 탈락
    if (!/[0-9]/.test(raw)) return null;

    const cleaned = raw.replace(/[^0-9.\-()]/g, "");
    if (!cleaned) return null;

    let n = Number(cleaned.replace(/[()]/g, ""));
    if (raw.includes("(") && !raw.includes("-")) n = -n;
    return Number.isFinite(n) ? n : null;
  }

  function makeBadge(doc: Document, pct: number | null): HTMLElement {
    const span = doc.createElement("span");
    span.classList.add("delta-badge");

    if (pct == null) {
      span.classList.add("delta-na");
      span.textContent = "N/A";
      return span;
    }

    const sign = pct > 0 ? "up" : pct < 0 ? "down" : "flat";
    span.classList.add(`delta-${sign}`);

    const arrow = pct > 0 ? "▲" : pct < 0 ? "▼" : "•";
    span.textContent = `${arrow} ${(pct * 100).toFixed(1)}%`;
    return span;
  }

  /**
   * kind:
   *  - "income"  : 3M / 9M → 숫자 셀 4개인 행만 비교
   *  - "balance" : 현재 / 이전 → 숫자 셀 2개인 행 비교
   *  - "cash"    : 현재 / 이전 → 숫자 셀 2개인 행 비교
   */
  function annotateTableHTML(
    html: string,
    kind: "income" | "balance" | "cash"
  ): string {
    if (!html) return html;
  
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const rows = Array.from(doc.querySelectorAll("tr"));
    if (!rows.length) return html;
  
    const monthRe =
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/i;
  
    const looksNumeric = (text: string | null) => {
      if (!text) return false;
      const t = text.replace(/\s/g, "");
      return /^[\$\(\)\d,\.\-]+$/.test(t);
    };
  
    const parseNumLocal = (text: string | null): number | null => {
      if (!looksNumeric(text)) return null;
      const raw = text || "";
      let cleaned = raw.replace(/[^0-9.\-]/g, "");
      if (!cleaned) return null;
      let n = Number(cleaned);
      if (!Number.isFinite(n)) return null;
      if (raw.includes("(") && !raw.includes("-")) n = -Math.abs(n);
      return n;
    };
  
    const cellHasBadge = (cell: HTMLElement) =>
      !!cell.querySelector(".delta-badge");
  
    const makeBadgeLocal = (pct: number | null) => {
      const span = doc.createElement("span");
      span.classList.add("delta-badge");
      if (pct === null) {
        span.classList.add("delta-na");
        span.textContent = "N/A";
        return span;
      }
      const sign = pct > 0 ? "up" : pct < 0 ? "down" : "flat";
      span.classList.add(`delta-${sign}`);
      const arrow = pct > 0 ? "▲" : pct < 0 ? "▼" : "•";
      span.textContent = `${arrow} ${(pct * 100).toFixed(1)}%`;
      return span;
    };
  
    /** 날짜/연도/헤더 행 제외 */
    const isHeaderRow = (row: HTMLTableRowElement): boolean => {
      const text = (row.textContent || "").replace(/\u00a0/g, " ").trim();
      if (!text) return true;
  
      // 🔥 날짜 행은 무조건 헤더 취급 (June 28, 2025 / June 29, 2024 등)
      if (monthRe.test(text) && /\b20\d{2}\b/.test(text)) return true;
  
      const cells = Array.from(row.querySelectorAll("td,th"));
      const hasDollar = cells.some((c) =>
        (c.textContent || "").includes("$")
      );
      const cellTexts = cells
        .map((c) => (c.textContent || "").trim())
        .filter(Boolean);
  
      // 연도만 (2025 2024)
      if (!hasDollar && cellTexts.length > 0 && cellTexts.every((t) => /^\d{4}$/.test(t))) {
        return true;
      }
  
      // Three/Nine Months Ended
      if (text.toLowerCase().includes("months ended")) return true;
  
      return false;
    };
  
    // 기존에 붙어 있을 수도 있는 배지 전부 제거 (이전 버전 흔적 삭제)
    doc.querySelectorAll(".delta-badge").forEach((el) => el.remove());
  
    rows.forEach((row) => {
      const tr = row as HTMLTableRowElement;
      if (isHeaderRow(tr)) return;
  
      const cells = Array.from(tr.querySelectorAll("td"));
      if (!cells.length) return;
  
      // 날짜 셀은 숫자로 보이더라도 강제로 제외
      const numericCells = cells.filter((c) => {
        const t = (c.textContent || "").replace(/\u00a0/g, " ").trim();
        if (monthRe.test(t) && /\b20\d{2}\b/.test(t)) return false; // 날짜
        if (/^(19|20)\d{2}$/.test(t)) return false; // 연도만
        return parseNumLocal(t) !== null;
      });
  
      /** Income Statement 처리 */
      if (kind === "income") {
        // 숫자 셀 4개가 아니면 skip
        if (numericCells.length !== 4) return;
  
        const curQCell = numericCells[0]; // 3M 현재
        const prevQCell = numericCells[1]; // 3M 전년
        const curYCell = numericCells[2]; // 9M 현재
        const prevYCell = numericCells[3]; // 9M 전년
  
        const curQ = parseNumLocal(curQCell.textContent);
        const prevQ = parseNumLocal(prevQCell.textContent);
        const curY = parseNumLocal(curYCell.textContent);
        const prevY = parseNumLocal(prevYCell.textContent);
  
        if (curQ != null && prevQ != null && !cellHasBadge(curQCell)) {
          const pct = prevQ !== 0 ? (curQ - prevQ) / Math.abs(prevQ) : 0;
          curQCell.appendChild(makeBadgeLocal(pct));
        }
  
        if (curY != null && prevY != null && !cellHasBadge(curYCell)) {
          const pct = prevY !== 0 ? (curY - prevY) / Math.abs(prevY) : 0;
          curYCell.appendChild(makeBadgeLocal(pct));
        }
  
        return;
      }
  
      /** Balance Sheet + Cash Flow : 2개 숫자 셀 → 첫 번째(현재)만 */
      if (numericCells.length === 2) {
        const [curCell, prevCell] = numericCells;
        const cur = parseNumLocal(curCell.textContent);
        const prev = parseNumLocal(prevCell.textContent);
        if (cur == null || prev == null || cellHasBadge(curCell)) return;
        const pct = prev !== 0 ? (cur - prev) / Math.abs(prev) : 0;
        curCell.appendChild(makeBadgeLocal(pct));
      }
    });
  
    // 🔥 마지막 안전장치: 혹시라도 날짜 행에 남아 있는 배지는 전부 제거
    doc.querySelectorAll("tr").forEach((tr) => {
      const text = (tr.textContent || "").replace(/\u00a0/g, " ").trim();
      if (monthRe.test(text) && /\b20\d{2}\b/.test(text)) {
        tr.querySelectorAll(".delta-badge").forEach((el) => el.remove());
      }
    });
  
    return doc.body.innerHTML;
  }

  // ---------------- 렌더 ----------------

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">10-Q / 6-K Financial Dashboard</h1>

      {/* 입력 영역 */}
      <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-4 items-center">
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 mb-1">Ticker</span>
          <input
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
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
                  __html: annotateTableHTML(data.tables.income_statement, "income"),
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
                  __html: annotateTableHTML(data.tables.balance_sheet, "balance"),
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
                  __html: annotateTableHTML(data.tables.cash_flow, "cash"),
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}