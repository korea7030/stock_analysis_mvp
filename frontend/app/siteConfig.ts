export const siteConfig = {
  name: "SEC Filing Dashboard",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://finnblog.pe.kr",
  description:
    "SEC filing analysis, financial statement extraction, earnings calendar, and company filing research tools.",
};

export type StockProfile = {
  ticker: string;
  name: string;
  sector: string;
  description: string;
  watchItems: string[];
  filingFocus: string;
};

export const stockProfiles = [
  {
    ticker: "AAPL",
    name: "Apple Inc.",
    sector: "Technology",
    description:
      "Apple designs consumer devices, software, and services. Its filings are commonly reviewed for iPhone revenue, services growth, margins, cash flow, and capital returns.",
    watchItems: [
      "iPhone, Mac, iPad, Services revenue mix and the margin effect of Services growth.",
      "Greater China revenue, foreign exchange impact, and product cycle timing.",
      "Share repurchases, dividends, deferred revenue, and operating cash flow conversion.",
    ],
    filingFocus:
      "For AAPL, the 10-Q and 10-K are usually more useful than an 8-K when comparing financial statements. The earnings 8-K can be read first for headline revenue and segment commentary, then checked against the later quarterly filing for complete balance sheet, cash flow, and footnote context.",
  },
  {
    ticker: "MSFT",
    name: "Microsoft Corporation",
    sector: "Technology",
    description:
      "Microsoft reports across cloud, productivity, software, gaming, and AI infrastructure. Investors often review Azure growth, operating margin, and free cash flow trends.",
    watchItems: [
      "Microsoft Cloud and Azure growth rates compared with capital expenditure needs.",
      "Operating margin by Productivity, Intelligent Cloud, and More Personal Computing.",
      "AI infrastructure spending, remaining performance obligations, and cash flow durability.",
    ],
    filingFocus:
      "For MSFT, start with segment revenue and operating income tables, then review capital expenditure and remaining performance obligations to judge whether cloud and AI demand is translating into durable contracted revenue.",
  },
  {
    ticker: "NVDA",
    name: "NVIDIA Corporation",
    sector: "Semiconductors",
    description:
      "NVIDIA develops GPUs, accelerated computing platforms, and data center products. Its filings are useful for tracking data center revenue, gross margin, inventory, and supply commitments.",
    watchItems: [
      "Data Center revenue growth, customer concentration, and geographic restrictions.",
      "Gross margin, inventory commitments, purchase obligations, and supply constraints.",
      "Operating expense growth tied to accelerated computing and AI platform investment.",
    ],
    filingFocus:
      "For NVDA, the filing notes around inventory, purchase obligations, export controls, and customer concentration are as important as the income statement because AI accelerator demand can shift quickly across supply cycles.",
  },
  {
    ticker: "GOOGL",
    name: "Alphabet Inc.",
    sector: "Communication Services",
    description:
      "Alphabet operates Google Search, YouTube, cloud services, and other technology investments. Filings help compare advertising revenue, cloud profitability, and capital expenditure.",
    watchItems: [
      "Google Search, YouTube ads, Network revenue, and Google Cloud operating income.",
      "Traffic acquisition costs, capital expenditures, and depreciation from AI infrastructure.",
      "Other Bets losses, headcount expense, legal contingencies, and buyback activity.",
    ],
    filingFocus:
      "For GOOGL, compare the earnings 8-K with the 10-Q segment tables. The 8-K highlights revenue and operating income quickly, while the 10-Q provides fuller cash flow, balance sheet, and risk factor updates.",
  },
  {
    ticker: "AMZN",
    name: "Amazon.com, Inc.",
    sector: "Consumer Discretionary",
    description:
      "Amazon reports retail, marketplace, advertising, subscriptions, and AWS performance. Key filing areas include operating income by segment, fulfillment costs, and cash flow.",
    watchItems: [
      "AWS revenue and operating income versus North America and International retail margins.",
      "Advertising services growth, fulfillment costs, shipping costs, and inventory turns.",
      "Operating cash flow, capital leases, property and equipment additions, and free cash flow.",
    ],
    filingFocus:
      "For AMZN, segment operating income often explains more than consolidated net income. Read AWS margin, retail cost structure, and cash flow tables together before drawing conclusions from headline revenue growth.",
  },
  {
    ticker: "META",
    name: "Meta Platforms, Inc.",
    sector: "Communication Services",
    description:
      "Meta operates major social platforms and invests in AI and Reality Labs. Filings are often reviewed for advertising revenue, user metrics, operating expenses, and buybacks.",
    watchItems: [
      "Family of Apps ad impressions, average price per ad, and regional revenue trends.",
      "Reality Labs losses, AI infrastructure capital expenditure, and operating expense guidance.",
      "Daily active people, legal contingencies, tax items, and share repurchases.",
    ],
    filingFocus:
      "For META, separate the core advertising business from Reality Labs and infrastructure spending. The segment table helps show whether ad growth is funding long-horizon investment without eroding consolidated margins.",
  },
  {
    ticker: "TSLA",
    name: "Tesla, Inc.",
    sector: "Consumer Discretionary",
    description:
      "Tesla designs electric vehicles, energy storage, and related software. Filing analysis commonly focuses on automotive margins, deliveries, working capital, and cash generation.",
    watchItems: [
      "Automotive gross margin excluding credits, average selling price pressure, and deliveries.",
      "Energy generation and storage growth, services margins, and warranty reserves.",
      "Inventory, receivables, operating cash flow, capital expenditure, and financing activity.",
    ],
    filingFocus:
      "For TSLA, the income statement should be paired with delivery volumes, inventory, warranty reserves, and cash flow. Margin changes can reflect pricing, mix, credits, production ramp costs, or temporary inventory movements.",
  },
  {
    ticker: "AVGO",
    name: "Broadcom Inc.",
    sector: "Semiconductors",
    description:
      "Broadcom supplies semiconductor and infrastructure software products. Filings help track segment revenue, acquisition effects, debt, margins, and free cash flow.",
    watchItems: [
      "Semiconductor solutions versus infrastructure software revenue and margin contribution.",
      "Acquisition integration costs, amortization, debt maturity, and interest expense.",
      "Free cash flow, dividend coverage, backlog, and customer concentration disclosures.",
    ],
    filingFocus:
      "For AVGO, normalize acquisition and amortization effects before comparing periods. Debt, interest expense, and software margin contribution can materially change the quality of reported earnings.",
  },
  {
    ticker: "JPM",
    name: "JPMorgan Chase & Co.",
    sector: "Financial Services",
    description:
      "JPMorgan Chase is a global bank. Filings are reviewed for net interest income, credit provisions, capital ratios, deposits, and segment profitability.",
    watchItems: [
      "Net interest income, deposit costs, loan growth, and securities portfolio marks.",
      "Provision for credit losses, charge-offs, allowance coverage, and credit card trends.",
      "CET1 ratio, liquidity coverage, tangible book value, and segment return on equity.",
    ],
    filingFocus:
      "For JPM, bank-specific metrics matter more than standard industrial ratios. Review capital, credit quality, deposits, and net interest income together because earnings can improve while credit risk is building.",
  },
  {
    ticker: "LLY",
    name: "Eli Lilly and Company",
    sector: "Healthcare",
    description:
      "Eli Lilly develops pharmaceuticals across diabetes, obesity, oncology, and other areas. Filings help track product revenue, research costs, margins, and pipeline investment.",
    watchItems: [
      "Product-level revenue for major diabetes, obesity, oncology, and immunology drugs.",
      "Gross margin, acquired in-process R&D, regulatory milestones, and launch expenses.",
      "Inventory, supply capacity, patent risk, and collaboration or licensing obligations.",
    ],
    filingFocus:
      "For LLY, product revenue tables and R&D disclosures are essential. A single high-growth product can drive headline results, so patent timing, supply capacity, and pipeline investment should be checked in the notes.",
  },
  {
    ticker: "V",
    name: "Visa Inc.",
    sector: "Financial Services",
    description:
      "Visa operates a global payments network. Filings are useful for analyzing payment volume, cross-border activity, operating margin, and cash returns.",
    watchItems: [
      "Payments volume, processed transactions, cross-border volume, and client incentives.",
      "Operating margin, litigation provisions, tax rate, and currency effects.",
      "Share repurchases, dividends, and free cash flow relative to revenue growth.",
    ],
    filingFocus:
      "For V, operating metrics explain the revenue base. Cross-border volume and client incentives can change revenue quality even when total payments volume remains healthy.",
  },
  {
    ticker: "UNH",
    name: "UnitedHealth Group Incorporated",
    sector: "Healthcare",
    description:
      "UnitedHealth combines health insurance and health services. Filing analysis often focuses on medical cost ratio, Optum growth, cash flow, and operating margin.",
    watchItems: [
      "Medical care ratio, premium revenue, care utilization, and reserve development.",
      "Optum Health, Optum Insight, and Optum Rx revenue and operating income trends.",
      "Cash flow from operations, regulatory matters, acquisitions, and debt levels.",
    ],
    filingFocus:
      "For UNH, the medical care ratio and Optum segment performance should be reviewed before focusing on EPS. Small changes in care utilization can have a large effect on insurance margins.",
  },
  {
    ticker: "MA",
    name: "Mastercard Incorporated",
    sector: "Financial Services",
    description:
      "Mastercard operates payment networks and related services. Filings help compare switched transactions, cross-border volume, revenue growth, and operating leverage.",
    watchItems: [
      "Gross dollar volume, switched transactions, cross-border volume, and rebates.",
      "Value-added services revenue, operating margin, and litigation or regulatory reserves.",
      "Currency impact, tax rate, buybacks, dividends, and cash conversion.",
    ],
    filingFocus:
      "For MA, compare transaction growth with revenue after rebates and incentives. The notes can clarify whether reported growth is volume-driven, currency-driven, or helped by service mix.",
  },
  {
    ticker: "XOM",
    name: "Exxon Mobil Corporation",
    sector: "Energy",
    description:
      "Exxon Mobil operates across upstream, refining, chemicals, and low carbon initiatives. Filings are reviewed for commodity sensitivity, capital spending, and cash distributions.",
    watchItems: [
      "Upstream production, realized oil and gas prices, refining margins, and chemical margins.",
      "Capital and exploration expenditures, reserves, impairments, and asset sales.",
      "Operating cash flow, dividends, buybacks, debt, and breakeven sensitivity.",
    ],
    filingFocus:
      "For XOM, commodity prices can dominate period comparisons. Segment earnings, production volumes, capex, and cash distributions should be reviewed together to separate operating performance from price cycles.",
  },
  {
    ticker: "COST",
    name: "Costco Wholesale Corporation",
    sector: "Consumer Staples",
    description:
      "Costco operates membership warehouses. Filing analysis commonly tracks comparable sales, membership fee revenue, inventory, margins, and cash generation.",
    watchItems: [
      "Comparable sales by region, traffic, ticket size, and e-commerce contribution.",
      "Membership fee revenue, renewal rates, gross margin, and merchandise cost inflation.",
      "Inventory, payables, warehouse openings, special dividends, and operating cash flow.",
    ],
    filingFocus:
      "For COST, membership economics and inventory discipline are central. Comparable sales alone can miss the effect of renewal rates, merchandise mix, and working capital timing.",
  },
  {
    ticker: "IONQ",
    name: "IonQ, Inc.",
    sector: "Quantum Computing",
    description:
      "IonQ develops quantum computing systems and related access services. Its filings are reviewed for revenue growth, backlog, R&D spending, cash runway, warrant liability changes, and commercialization progress.",
    watchItems: [
      "Revenue growth versus contract timing, bookings, backlog, and customer concentration.",
      "R&D expense, operating cash burn, liquidity runway, and capital needs.",
      "Warrant liability fair value changes and other non-cash items that can distort net income.",
    ],
    filingFocus:
      "For IONQ, compare the earnings 8-K with the 10-Q. The 8-K may include management's quarter summary and selected non-GAAP context, while the 10-Q provides the formal financial statements and footnotes for warrant liabilities, cash runway, and risk factors.",
  },
  {
    ticker: "PLTR",
    name: "Palantir Technologies Inc.",
    sector: "Software",
    description:
      "Palantir provides data integration and AI software platforms for government and commercial customers. Filings help track revenue growth, customer concentration, remaining deal value, margins, and stock-based compensation.",
    watchItems: [
      "Government versus commercial revenue growth, U.S. commercial momentum, and customer count.",
      "Remaining deal value, billings indicators, operating margin, and adjusted versus GAAP results.",
      "Stock-based compensation, share count dilution, cash flow, and contract concentration.",
    ],
    filingFocus:
      "For PLTR, revenue growth should be read with remaining deal value, customer count, and stock-based compensation. GAAP profitability and cash flow can tell a different story from adjusted operating metrics.",
  },
] satisfies StockProfile[];

export function stockPath(ticker: string) {
  return `/stocks/${ticker.toLowerCase()}`;
}
