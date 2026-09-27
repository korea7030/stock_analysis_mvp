"use client";

import { useSyncExternalStore } from "react";
import { PublisherAdSense } from "./PublisherAdSense";

const subscribe = () => () => {};

export function HomePublisherAdSense() {
  const isEditorialEntry = useSyncExternalStore(
    subscribe,
    () => {
      const params = new URLSearchParams(window.location.search);
      const isLegacyToolEntry =
        params.has("ticker") ||
        params.has("form") ||
        window.location.hash === "#sec-analyzer";

      return !isLegacyToolEntry;
    },
    () => false,
  );

  return isEditorialEntry ? <PublisherAdSense /> : null;
}
