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
};

export const stockProfiles = [
  {
    ticker: "AAPL",
    name: "Apple Inc.",
    sector: "Technology",
    description:
      "Apple designs consumer devices, software, and services. Its filings are commonly reviewed for iPhone revenue, services growth, margins, cash flow, and capital returns.",
  },
  {
    ticker: "MSFT",
    name: "Microsoft Corporation",
    sector: "Technology",
    description:
      "Microsoft reports across cloud, productivity, software, gaming, and AI infrastructure. Investors often review Azure growth, operating margin, and free cash flow trends.",
  },
  {
    ticker: "NVDA",
    name: "NVIDIA Corporation",
    sector: "Semiconductors",
    description:
      "NVIDIA develops GPUs, accelerated computing platforms, and data center products. Its filings are useful for tracking data center revenue, gross margin, inventory, and supply commitments.",
  },
  {
    ticker: "GOOGL",
    name: "Alphabet Inc.",
    sector: "Communication Services",
    description:
      "Alphabet operates Google Search, YouTube, cloud services, and other technology investments. Filings help compare advertising revenue, cloud profitability, and capital expenditure.",
  },
  {
    ticker: "AMZN",
    name: "Amazon.com, Inc.",
    sector: "Consumer Discretionary",
    description:
      "Amazon reports retail, marketplace, advertising, subscriptions, and AWS performance. Key filing areas include operating income by segment, fulfillment costs, and cash flow.",
  },
  {
    ticker: "META",
    name: "Meta Platforms, Inc.",
    sector: "Communication Services",
    description:
      "Meta operates major social platforms and invests in AI and Reality Labs. Filings are often reviewed for advertising revenue, user metrics, operating expenses, and buybacks.",
  },
  {
    ticker: "TSLA",
    name: "Tesla, Inc.",
    sector: "Consumer Discretionary",
    description:
      "Tesla designs electric vehicles, energy storage, and related software. Filing analysis commonly focuses on automotive margins, deliveries, working capital, and cash generation.",
  },
  {
    ticker: "AVGO",
    name: "Broadcom Inc.",
    sector: "Semiconductors",
    description:
      "Broadcom supplies semiconductor and infrastructure software products. Filings help track segment revenue, acquisition effects, debt, margins, and free cash flow.",
  },
  {
    ticker: "JPM",
    name: "JPMorgan Chase & Co.",
    sector: "Financial Services",
    description:
      "JPMorgan Chase is a global bank. Filings are reviewed for net interest income, credit provisions, capital ratios, deposits, and segment profitability.",
  },
  {
    ticker: "LLY",
    name: "Eli Lilly and Company",
    sector: "Healthcare",
    description:
      "Eli Lilly develops pharmaceuticals across diabetes, obesity, oncology, and other areas. Filings help track product revenue, research costs, margins, and pipeline investment.",
  },
  {
    ticker: "V",
    name: "Visa Inc.",
    sector: "Financial Services",
    description:
      "Visa operates a global payments network. Filings are useful for analyzing payment volume, cross-border activity, operating margin, and cash returns.",
  },
  {
    ticker: "UNH",
    name: "UnitedHealth Group Incorporated",
    sector: "Healthcare",
    description:
      "UnitedHealth combines health insurance and health services. Filing analysis often focuses on medical cost ratio, Optum growth, cash flow, and operating margin.",
  },
  {
    ticker: "MA",
    name: "Mastercard Incorporated",
    sector: "Financial Services",
    description:
      "Mastercard operates payment networks and related services. Filings help compare switched transactions, cross-border volume, revenue growth, and operating leverage.",
  },
  {
    ticker: "XOM",
    name: "Exxon Mobil Corporation",
    sector: "Energy",
    description:
      "Exxon Mobil operates across upstream, refining, chemicals, and low carbon initiatives. Filings are reviewed for commodity sensitivity, capital spending, and cash distributions.",
  },
  {
    ticker: "COST",
    name: "Costco Wholesale Corporation",
    sector: "Consumer Staples",
    description:
      "Costco operates membership warehouses. Filing analysis commonly tracks comparable sales, membership fee revenue, inventory, margins, and cash generation.",
  },
] satisfies StockProfile[];

export function stockPath(ticker: string) {
  return `/stocks/${ticker.toLowerCase()}`;
}
