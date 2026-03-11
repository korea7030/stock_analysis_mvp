export type FilingForm = "10-Q" | "6-K";

export type AnalyzeMeta = {
  company_name?: string | null;
  ticker?: string | null;
  report_type?: string | null;
  period_end?: string | null;
  filing_date?: string | null;
  unit?: string | null;
};

export type AnalyzeTables = {
  income_statement?: string | null;
  balance_sheet?: string | null;
  cash_flow?: string | null;
};

export type AnalyzeResponse = {
  meta: AnalyzeMeta;
  tables: AnalyzeTables;
  last_updated?: string;
};
