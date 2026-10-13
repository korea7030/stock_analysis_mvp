"use client";

import { useEffect } from "react";
import { buildToolUrl } from "./deploymentConfig";

export function LegacyToolRedirect() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isLegacyToolUrl = params.has("ticker") || params.has("form");
    const isLegacyToolAnchor = window.location.hash === "#sec-analyzer";

    if (isLegacyToolUrl || isLegacyToolAnchor) {
      window.location.replace(buildToolUrl(window.location.search));
    }
  }, []);

  return null;
}
