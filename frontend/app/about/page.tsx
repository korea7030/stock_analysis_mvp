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
          title: "How data is reviewed",
          body: [
            "The service is built to preserve links back to the original filing whenever possible. Users are expected to treat the extracted values as a screening layer and confirm material numbers in the SEC filing, company investor relations release, and related footnotes.",
            "When a reported value appears inconsistent, the site operator reviews the filing type, filing date, table period, unit scale, negative-number formatting, and GAAP versus non-GAAP presentation before changing parser behavior.",
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
          title: "Corrections and updates",
          body: [
            "Financial filings can be amended, restated, or supplemented by later company releases. Calendar data may also change after an earnings date is announced.",
            "If you find an incorrect value, missing recent filing, broken source link, or confusing report classification, send the ticker, filing type, filing date, and a short description to the contact address below. Corrections are prioritized when they affect displayed financial values or source-document matching.",
          ],
        },
        {
          title: "Operator",
          body: [
            "SEC Filing Dashboard is operated as an independent financial research and software project. It is not affiliated with the U.S. Securities and Exchange Commission, any listed company, or Google AdSense.",
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
