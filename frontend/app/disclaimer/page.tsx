import type { Metadata } from "next";
import { LegalPage } from "../legalContent";

export const metadata: Metadata = {
  title: "Financial Disclaimer",
  description: "Financial and data disclaimer for SEC Filing Dashboard.",
  alternates: { canonical: "/disclaimer" },
};

export default function DisclaimerPage() {
  return (
    <LegalPage
      title="Financial Disclaimer"
      updated="July 2026"
      intro="SEC Filing Dashboard is an informational research tool. The site does not recommend buying, selling, or holding any security."
      sections={[
        {
          title: "Not investment advice",
          body: [
            "Nothing on this site is investment advice, a securities recommendation, a valuation opinion, or an offer to buy or sell any financial instrument.",
            "All investment decisions involve risk. You should conduct your own research and consult a qualified advisor before making financial decisions.",
          ],
        },
        {
          title: "Automated data extraction",
          body: [
            "The site uses automated parsing to extract tables and metrics from public filings. Automated extraction can be wrong when tables are complex, labels are ambiguous, filings are amended, or data providers are unavailable.",
            "Displayed figures may not match company-defined non-GAAP measures, restatements, segment classifications, or later corrections.",
          ],
        },
        {
          title: "Source verification",
          body: [
            "Users should verify all important information against original SEC filings, company investor relations materials, and other authoritative sources.",
            "Source links are provided where available, but the site does not guarantee that every link, date, value, or summary is complete or current.",
          ],
        },
        {
          title: "AI-generated summaries",
          body: [
            "AI summaries, when available, are generated from selected extracted metrics and may omit important context. They should be treated as a convenience feature, not as a complete financial analysis.",
          ],
        },
        {
          title: "No liability for reliance",
          body: [
            "The operator is not responsible for trading losses, missed opportunities, business decisions, tax consequences, or other damages resulting from use of this site.",
          ],
        },
      ]}
    />
  );
}
