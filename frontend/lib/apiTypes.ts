export type FilingForm = "10-Q" | "10-K" | "6-K" | "8-K" | "20-F";

export type AnalyzeMeta = {
  company_name?: string | null;
  ticker?: string | null;
  report_type?: string | null;
  period_end?: string | null;
  filing_date?: string | null;
  unit?: string | null;
  accession_number?: string | null;
  source_url?: string | null;
};

export type AnalyzeTables = {
  income_statement?: string | null;
  balance_sheet?: string | null;
  cash_flow?: string | null;
};

export type MetricValue = {
  current?: number | null;
  previous?: number | null;
  change_pct?: number | null;
};

export type AnalyzeMetrics = {
  revenue?: MetricValue | null;
  gross_profit?: MetricValue | null;
  operating_income?: MetricValue | null;
  net_income?: MetricValue | null;
  eps_basic?: MetricValue | null;
  cash_and_equivalents?: MetricValue | null;
  total_assets?: MetricValue | null;
  total_liabilities?: MetricValue | null;
  total_equity?: MetricValue | null;
  long_term_debt?: MetricValue | null;
  operating_cash_flow?: MetricValue | null;
  capex?: MetricValue | null;
  free_cash_flow?: MetricValue | null;
};

export type AnalyzeSections = {
  mdna?: string | null;
  risk_factors?: string | null;
  mdna_diff?: string | null;
  risk_factors_diff?: string | null;
};

export type AnalyzeResponse = {
  meta: AnalyzeMeta;
  metrics?: AnalyzeMetrics | null;
  sections?: AnalyzeSections | null;
  tables: AnalyzeTables;
  last_updated?: string;
};
