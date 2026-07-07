import type { Metadata } from "next";
import { LegalPage } from "../legalContent";

export const metadata: Metadata = {
  title: "About",
  description: "About SEC Filing Dashboard and its financial filing research tools.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <LegalPage
      title="About SEC Filing Dashboard"
      updated="July 2026"
      intro="SEC Filing Dashboard helps readers inspect public company filings, financial statement tables, earnings calendar items, and automatically extracted filing metrics."
      sections={[
        {
          title: "What this site does",
          body: [
            "The dashboard retrieves public company filing data, extracts financial tables when available, and displays selected metrics such as revenue, net income, cash flow, assets, liabilities, and equity.",
            "The stock pages provide an indexable research entry point for companies that users commonly analyze. Each page links back to the interactive filing analyzer.",
          ],
        },
        {
          title: "Data sources",
          body: [
            "Filing data comes from public SEC resources and related public market calendars. Source links are shown where available so users can verify details against the original documents.",
            "Automated extraction can miss, misclassify, or simplify information when company filings use unusual table formats or nonstandard labels.",
          ],
        },
        {
          title: "Editorial approach",
          body: [
            "The site is designed as a research utility, not as a stock recommendation service. Explanatory content is intended to help users navigate filings and understand reported data.",
            "Users should read original filings and consult qualified professionals before making financial, legal, tax, or investment decisions.",
          ],
        },
        {
          title: "Contact",
          body: [
            "For corrections, data issues, or business inquiries, contact the site operator at korea7030.jhl@gmail.com.",
          ],
        },
      ]}
    />
  );
}
