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


class AnalyzeTables(BaseModel):
    income_statement: Optional[str] = None
    balance_sheet: Optional[str] = None
    cash_flow: Optional[str] = None


class AnalyzeResponse(BaseModel):
    meta: AnalyzeMeta
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
