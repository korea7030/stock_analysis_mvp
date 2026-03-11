from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel


class AnalyzeMeta(BaseModel):
    company_name: Optional[str] = None
    ticker: Optional[str] = None
    report_type: Optional[str] = None
    period_end: Optional[str] = None
    filing_date: Optional[str] = None
    unit: Optional[str] = None
    accession_number: Optional[str] = None
    source_url: Optional[str] = None


class AnalyzeTables(BaseModel):
    income_statement: Optional[str] = None
    balance_sheet: Optional[str] = None
    cash_flow: Optional[str] = None


class MetricValue(BaseModel):
    current: Optional[float] = None
    previous: Optional[float] = None
    change_pct: Optional[float] = None


class AnalyzeMetrics(BaseModel):
    revenue: Optional[MetricValue] = None
    gross_profit: Optional[MetricValue] = None
    operating_income: Optional[MetricValue] = None
    net_income: Optional[MetricValue] = None
    eps_basic: Optional[MetricValue] = None
    cash_and_equivalents: Optional[MetricValue] = None
    total_assets: Optional[MetricValue] = None
    total_liabilities: Optional[MetricValue] = None
    total_equity: Optional[MetricValue] = None
    long_term_debt: Optional[MetricValue] = None
    operating_cash_flow: Optional[MetricValue] = None
    capex: Optional[MetricValue] = None
    free_cash_flow: Optional[MetricValue] = None


class AnalyzeSections(BaseModel):
    mdna: Optional[str] = None
    risk_factors: Optional[str] = None
    mdna_diff: Optional[str] = None
    risk_factors_diff: Optional[str] = None


class AnalyzeResponse(BaseModel):
    meta: AnalyzeMeta
    metrics: Optional[AnalyzeMetrics] = None
    sections: Optional[AnalyzeSections] = None
    tables: AnalyzeTables
    last_updated: Optional[str] = None


class EarningsItem(BaseModel):
    ticker: Optional[str] = None
    company: Optional[str] = None
    release_time: Optional[str] = None
    eps_estimate: Optional[str] = None
    eps_actual: Optional[str] = None
    revenue_estimate: Optional[str] = None
    revenue_actual: Optional[str] = None

    class Config:
        extra = "allow"


class ApiError(BaseModel):
    code: str
    message: str
    details: Optional[Any] = None

    class Config:
        extra = "allow"
