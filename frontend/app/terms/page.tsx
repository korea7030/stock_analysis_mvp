import type { Metadata } from "next";
import { LegalPage } from "../legalContent";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Terms of Use for SEC Filing Dashboard.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      updated="July 2026"
      intro="By using SEC Filing Dashboard, you agree to these Terms of Use. If you do not agree, do not use the site."
      sections={[
        {
          title: "Permitted use",
          body: [
            "You may use the site for personal research, education, and general business analysis of public company filings.",
            "You may not use the site to overload the service, bypass rate limits, scrape at abusive volumes, interfere with security, or misuse third-party data sources.",
          ],
        },
        {
          title: "No professional advice",
          body: [
            "The site provides automated filing analysis and informational content only. It does not provide investment, legal, accounting, tax, or financial planning advice.",
            "You are responsible for verifying any information against original filings and consulting qualified professionals before making decisions.",
          ],
        },
        {
          title: "Accuracy and availability",
          body: [
            "The site relies on public data sources, automated parsers, caches, and third-party infrastructure. Results may be delayed, incomplete, unavailable, or incorrect.",
            "The operator may change, limit, suspend, or discontinue any feature without notice.",
          ],
        },
        {
          title: "Intellectual property",
          body: [
            "Site design, software, and original explanatory content are owned by the site operator or respective licensors. Public filing content remains subject to the terms and rights applicable to its source.",
            "You may link to public pages of the site, but you may not copy or redistribute the service as a competing product without permission.",
          ],
        },
        {
          title: "Limitation of liability",
          body: [
            "The site is provided as is and as available. To the maximum extent permitted by law, the operator is not liable for losses arising from use of the site, data errors, outages, or reliance on automated analysis.",
          ],
        },
        {
          title: "Contact",
          body: [
            "Questions about these Terms may be sent to korea7030.jhl@gmail.com.",
          ],
        },
      ]}
    />
  );
}
