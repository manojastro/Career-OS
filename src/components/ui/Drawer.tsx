"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cx } from "@/lib/utils";

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" role="presentation" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cx(
          "flex h-full w-full flex-col bg-paper shadow-xl outline-none sm:h-full",
          wide ? "sm:w-[640px]" : "sm:w-[440px]"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-muted hover:bg-black/5 hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  danger,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-sm rounded-card bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        <p className="mt-2 text-sm text-muted">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg border border-line px-3.5 py-2 text-sm font-medium hover:bg-black/5">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={cx(
              "rounded-lg px-3.5 py-2 text-sm font-medium text-white",
              danger ? "bg-danger hover:bg-danger/90" : "bg-accent hover:bg-accent/90"
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
