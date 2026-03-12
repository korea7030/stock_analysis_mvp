export type AnnotateKind = "income" | "balance" | "cash";

export function annotateTableHTML(html: string, kind: AnnotateKind): string {
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
    const cleaned = raw.replace(/[^0-9.\-]/g, "");
    if (!cleaned) return null;
    let n = Number(cleaned);
    if (!Number.isFinite(n)) return null;
    if (raw.includes("(") && !raw.includes("-")) n = -Math.abs(n);
    return n;
  };

  const cellHasBadge = (cell: HTMLElement) => !!cell.querySelector(".delta-badge");

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

  const isHeaderRow = (row: HTMLTableRowElement): boolean => {
    const text = (row.textContent || "").replace(/\u00a0/g, " ").trim();
    if (!text) return true;
    if (monthRe.test(text) && /\b20\d{2}\b/.test(text)) return true;

    const cells = Array.from(row.querySelectorAll("td,th"));
    const hasDollar = cells.some((c) => (c.textContent || "").includes("$"));
    const cellTexts = cells
      .map((c) => (c.textContent || "").trim())
      .filter(Boolean);

    if (!hasDollar && cellTexts.length > 0 && cellTexts.every((t) => /^\d{4}$/.test(t))) {
      return true;
    }

    if (text.toLowerCase().includes("months ended")) return true;
    return false;
  };

  const yearRowYears = (() => {
    for (const row of rows) {
      const tr = row as HTMLTableRowElement;
      const cells = Array.from(tr.querySelectorAll("td,th"));
      if (!cells.length) continue;
      const cellTexts = cells
        .map((c) => (c.textContent || "").replace(/\u00a0/g, " ").trim())
        .filter(Boolean);
      if (cellTexts.length >= 2 && cellTexts.every((t) => /^(19|20)\d{2}$/.test(t))) {
        return cellTexts.map((t) => Number(t)).filter((n) => Number.isFinite(n));
      }
    }
    return [] as number[];
  })();

  const yearCount = yearRowYears.length;
  const yearAscending = yearCount >= 2 ? yearRowYears[0] < yearRowYears[1] : false;

  doc.querySelectorAll(".delta-badge").forEach((el) => el.remove());

  rows.forEach((row) => {
    const tr = row as HTMLTableRowElement;
    if (isHeaderRow(tr)) return;

    const cells = Array.from(tr.querySelectorAll("td"));
    if (!cells.length) return;

    const numericCells = cells.filter((c) => {
      const t = (c.textContent || "").replace(/\u00a0/g, " ").trim();
      if (monthRe.test(t) && /\b20\d{2}\b/.test(t)) return false;
      if (/^(19|20)\d{2}$/.test(t)) return false;
      return parseNumLocal(t) !== null;
    });

    numericCells.forEach((cell) => {
      cell.classList.add("numeric-cell");
      cell.style.whiteSpace = "nowrap";
    });

    if (kind === "income") {
      const hasRevenuesHeader = (doc.body.textContent || "").toLowerCase().includes("revenues");
      const hasOtherIncomeHeader = (doc.body.textContent || "").toLowerCase().includes("other income");

      if (yearCount >= 2 && numericCells.length === yearCount * 2 && hasRevenuesHeader && hasOtherIncomeHeader) {
        const groupSize = 2;
        const curYearIdx = yearAscending ? yearCount - 1 : 0;
        const prevYearIdx = yearAscending ? yearCount - 2 : 1;

        const curRevCell = numericCells[curYearIdx * groupSize + 0];
        const prevRevCell = numericCells[prevYearIdx * groupSize + 0];
        const curOtherCell = numericCells[curYearIdx * groupSize + 1];
        const prevOtherCell = numericCells[prevYearIdx * groupSize + 1];

        const curRev = parseNumLocal(curRevCell.textContent);
        const prevRev = parseNumLocal(prevRevCell.textContent);
        if (curRev != null && prevRev != null && !cellHasBadge(curRevCell)) {
          const pct = prevRev !== 0 ? (curRev - prevRev) / Math.abs(prevRev) : 0;
          curRevCell.appendChild(makeBadgeLocal(pct));
        }

        const curOther = parseNumLocal(curOtherCell.textContent);
        const prevOther = parseNumLocal(prevOtherCell.textContent);
        if (curOther != null && prevOther != null && !cellHasBadge(curOtherCell)) {
          const pct = prevOther !== 0 ? (curOther - prevOther) / Math.abs(prevOther) : 0;
          curOtherCell.appendChild(makeBadgeLocal(pct));
        }

        return;
      }

      if (yearCount >= 2 && numericCells.length === yearCount) {
        const curIdx = yearAscending ? yearCount - 1 : 0;
        const prevIdx = yearAscending ? yearCount - 2 : 1;
        const curCell = numericCells[curIdx];
        const prevCell = numericCells[prevIdx];
        const cur = parseNumLocal(curCell.textContent);
        const prev = parseNumLocal(prevCell.textContent);
        if (cur != null && prev != null && !cellHasBadge(curCell)) {
          const pct = prev !== 0 ? (cur - prev) / Math.abs(prev) : 0;
          curCell.appendChild(makeBadgeLocal(pct));
        }
        return;
      }

      if (numericCells.length >= 4) {
        const curQCell = numericCells[0];
        const prevQCell = numericCells[1];
        const curYCell = numericCells[2];
        const prevYCell = numericCells[3];

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

      if (numericCells.length >= 2) {
        const curCell = numericCells[0];
        const prevCell = numericCells[1];
        const cur = parseNumLocal(curCell.textContent);
        const prev = parseNumLocal(prevCell.textContent);
        if (cur == null || prev == null || cellHasBadge(curCell)) return;
        const pct = prev !== 0 ? (cur - prev) / Math.abs(prev) : 0;
        curCell.appendChild(makeBadgeLocal(pct));
      }

      return;
    }

    if (numericCells.length >= 2) {
      const curIdx = yearCount >= 2 && numericCells.length >= yearCount ? (yearAscending ? yearCount - 1 : 0) : 0;
      const prevIdx = yearCount >= 2 && numericCells.length >= yearCount ? (yearAscending ? yearCount - 2 : 1) : 1;
      const curCell = numericCells[curIdx];
      const prevCell = numericCells[prevIdx];
      const cur = parseNumLocal(curCell.textContent);
      const prev = parseNumLocal(prevCell.textContent);
      if (cur == null || prev == null || cellHasBadge(curCell)) return;
      const pct = prev !== 0 ? (cur - prev) / Math.abs(prev) : 0;
      curCell.appendChild(makeBadgeLocal(pct));
    }
  });

  doc.querySelectorAll("tr").forEach((tr) => {
    const text = (tr.textContent || "").replace(/\u00a0/g, " ").trim();
    if (monthRe.test(text) && /\b20\d{2}\b/.test(text)) {
      tr.querySelectorAll(".delta-badge").forEach((el) => el.remove());
    }
  });

  return doc.body.innerHTML;
}
