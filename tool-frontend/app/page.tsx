import SecFilingDashboard from "../../frontend/components/SecFilingDashboard";
import { toolSiteConfig } from "./siteConfig";

export default function ToolHomePage() {
  return <SecFilingDashboard publicationOrigin={toolSiteConfig.publicationOrigin} />;
}
