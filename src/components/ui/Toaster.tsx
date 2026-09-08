"use client";

import React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { useStore } from "@/lib/store/StoreContext";
import { cx } from "@/lib/utils";

export function Toaster() {
  const { toasts, dismissToast } = useStore();
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4 sm:bottom-6 sm:left-auto sm:right-6 sm:translate-x-0">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cx(
            "pointer-events-auto flex items-start gap-2 rounded-lg border px-3.5 py-2.5 text-sm shadow-lg",
            t.kind === "success" && "border-accent/30 bg-white text-ink",
            t.kind === "error" && "border-danger/30 bg-white text-ink",
            t.kind === "info" && "border-line bg-white text-ink"
          )}
        >
          {t.kind === "success" && <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-accent" />}
          {t.kind === "error" && <AlertCircle size={18} className="mt-0.5 shrink-0 text-danger" />}
          {t.kind === "info" && <Info size={18} className="mt-0.5 shrink-0 text-muted" />}
          <span className="flex-1">{t.message}</span>
          <button onClick={() => dismissToast(t.id)} aria-label="Dismiss" className="text-muted hover:text-ink">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
