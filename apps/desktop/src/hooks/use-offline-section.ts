import { useState } from "react";
import { OfflineSectionPreference } from "@/lib/offline-section-preference";

export function useOfflineSection() {
  const [isExpanded, setIsExpanded] = useState(() => OfflineSectionPreference.isExpanded());

  const toggle = () => {
    setIsExpanded((current) => {
      const next = !current;
      OfflineSectionPreference.setExpanded(next);
      return next;
    });
  };

  return { isExpanded, toggle };
}
