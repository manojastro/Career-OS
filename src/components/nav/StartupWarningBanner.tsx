"use client";

import { AlertTriangle, X } from "lucide-react";
import { useStore } from "@/lib/store/StoreContext";

export function StartupWarningBanner() {
  const { startupWarning, dismissStartupWarning } = useStore();
  if (!startupWarning) return null;
  return (
    <div className="flex items-start gap-2 border-b border-warn/30 bg-warnSoft px-4 py-2.5 text-sm text-warn">
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <p className="flex-1">{startupWarning}</p>
      <button onClick={dismissStartupWarning} aria-label="Dismiss" className="shrink-0">
        <X size={16} />
      </button>
    </div>
  );
}
