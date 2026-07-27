"use client";

import { useEffect } from "react";

/**
 * Gives browser automation and assistive integrations an explicit point at which
 * client event handlers are attached. It has no visual output.
 */
export function HydrationMarker() {
  useEffect(() => {
    document.documentElement.dataset.hydrated = "true";
    return () => {
      delete document.documentElement.dataset.hydrated;
    };
  }, []);
  return null;
}
