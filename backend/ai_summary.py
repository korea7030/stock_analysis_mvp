from __future__ import annotations

import json
import os
from typing import Any


def generate_summary(
    ticker: str,
    form: str,
    meta: dict[str, Any],
    metrics: dict[str, Any],
) -> str:
    try:
        from openai import OpenAI
    except ImportError:
        raise RuntimeError("openai package not installed")

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY not set")

    client = OpenAI(api_key=api_key)

    metrics_text = _format_metrics(metrics, meta.get("unit"))
    company = meta.get("company_name") or ticker
    period = meta.get("period_end") or "-"

    prompt = (
        f"{company} ({ticker}) {form} 보고서 ({period} 기준) 핵심 재무 지표:\n\n"
        f"{metrics_text}\n\n"
        "위 데이터를 바탕으로 투자자 관점의 핵심 인사이트를 2~3문장으로 한국어로 요약해줘. "
        "수치 변화의 의미, 주목할 트렌드, 주의할 점을 포함해. 단순 수치 나열 금지."
    )

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=300,
        temperature=0.5,
    )

    return (response.choices[0].message.content or "").strip()


def _format_metrics(metrics: dict[str, Any], unit: str | None) -> str:
    label_map = {
        "revenue": "매출",
        "gross_profit": "매출총이익",
        "operating_income": "영업이익",
        "net_income": "순이익",
        "eps_basic": "EPS(기본)",
        "operating_cash_flow": "영업현금흐름",
        "free_cash_flow": "잉여현금흐름",
        "total_assets": "총자산",
        "total_equity": "총자본",
    }
    lines = []
    if unit:
        lines.append(f"단위: {unit}")
    for key, label in label_map.items():
        val = metrics.get(key)
        if not isinstance(val, dict):
            continue
        current = val.get("current")
        previous = val.get("previous")
        change = val.get("change_pct")
        if current is None:
            continue
        parts = [f"{label}: {current:,.0f}"]
        if previous is not None:
            parts.append(f"(전기: {previous:,.0f})")
        if change is not None:
            parts.append(f"[{change:+.1f}%]")
        lines.append(" ".join(parts))
    return "\n".join(lines) if lines else json.dumps(metrics)
