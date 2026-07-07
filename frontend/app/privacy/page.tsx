import type { Metadata } from "next";
import { LegalPage } from "../legalContent";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for SEC Filing Dashboard.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="July 2026"
      intro="This Privacy Policy explains what information SEC Filing Dashboard may collect, how it is used, and how third-party services may process data when you use the site."
      sections={[
        {
          title: "Information you provide",
          body: [
            "The site does not require account registration for the public dashboard. When you enter a ticker symbol or select a filing type, that request may be sent to the backend API to return filing analysis.",
            "If you contact the operator by email, the information you include in that message may be used to respond to your inquiry.",
          ],
        },
        {
          title: "Automatically collected information",
          body: [
            "The backend may receive technical information such as IP address, user agent, request path, timestamps, and rate-limit metadata. This information is used for security, abuse prevention, troubleshooting, and service reliability.",
            "The browser may store local preferences such as favorite and recent ticker symbols using localStorage. These values stay in your browser unless you clear them.",
          ],
        },
        {
          title: "Cookies, ads, and analytics",
          body: [
            "If advertising or analytics products are enabled, third-party providers may use cookies or similar technologies to measure traffic, prevent fraud, personalize ads where permitted, and comply with advertising policies.",
            "Google AdSense or other ad providers may process data according to their own privacy policies. Users can manage browser cookie settings and ad personalization controls through their browser or Google account settings.",
          ],
        },
        {
          title: "Third-party services",
          body: [
            "The site may interact with third-party services such as SEC resources, market calendar providers, hosting providers, database providers, and AI providers to deliver analysis and summaries.",
            "The site does not control the privacy practices of external websites linked from the dashboard.",
          ],
        },
        {
          title: "Data retention and security",
          body: [
            "Cached filing analysis and summary data may be retained to improve performance, reduce repeated external API calls, and protect the service from abuse.",
            "Reasonable technical measures are used to operate the service, but no internet service can guarantee perfect security or uninterrupted availability.",
          ],
        },
        {
          title: "Contact",
          body: [
            "For privacy questions or deletion requests related to information you provided directly, contact korea7030.jhl@gmail.com.",
          ],
        },
      ]}
    />
  );
}
