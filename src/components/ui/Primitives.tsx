"use client";

import React from "react";
import { cx } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

export function Button({
  variant = "secondary",
  size = "md",
  className,
  disabled,
  title,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  const base = "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";
  const sizes: Record<ButtonSize, string> = {
    sm: "px-2.5 py-1.5 text-xs",
    md: "px-3.5 py-2 text-sm",
  };
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-accent text-white hover:bg-accent/90",
    secondary: "bg-white text-ink border border-line hover:bg-accentSoft",
    ghost: "text-ink hover:bg-black/5",
    danger: "bg-danger text-white hover:bg-danger/90",
  };
  return (
    <button
      className={cx(base, sizes[size], variants[variant], className)}
      disabled={disabled}
      title={title}
      {...props}
    />
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "warn" | "danger" | "success";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-black/5 text-ink",
    accent: "bg-accentSoft text-accent",
    warn: "bg-warnSoft text-warn",
    danger: "bg-dangerSoft text-danger",
    success: "bg-accentSoft text-accent",
  };
  return (
    <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}

export function Input({ label, hint, error, id, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string; error?: string }) {
  const generatedId = React.useId();
  const inputId = id || generatedId;
  return (
    <label htmlFor={inputId} className="block text-sm">
      {label && <span className="mb-1 block font-medium text-ink">{label}</span>}
      <input
        id={inputId}
        className={cx(
          "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-accent",
          error && "border-danger",
          className
        )}
        aria-invalid={Boolean(error)}
        aria-describedby={hint ? `${inputId}-hint` : undefined}
        {...props}
      />
      {hint && !error && (
        <span id={`${inputId}-hint`} className="mt-1 block text-xs text-muted">
          {hint}
        </span>
      )}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

export function Textarea({
  label,
  hint,
  error,
  id,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; hint?: string; error?: string }) {
  const generatedId = React.useId();
  const inputId = id || generatedId;
  return (
    <label htmlFor={inputId} className="block text-sm">
      {label && <span className="mb-1 block font-medium text-ink">{label}</span>}
      <textarea
        id={inputId}
        className={cx(
          "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-accent",
          error && "border-danger",
          className
        )}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {hint && !error && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

export function Select({
  label,
  hint,
  id,
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; hint?: string }) {
  const generatedId = React.useId();
  const inputId = id || generatedId;
  return (
    <label htmlFor={inputId} className="block text-sm">
      {label && <span className="mb-1 block font-medium text-ink">{label}</span>}
      <select
        id={inputId}
        className={cx("w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-accent", className)}
        {...props}
      >
        {children}
      </select>
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-line bg-white/60 px-6 py-10 text-center">
      <p className="font-medium text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ProgressBar({ value, max = 100, tone = "accent" }: { value: number; max?: number; tone?: "accent" | "warn" }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-black/5" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div
        className={cx("h-full rounded-full transition-all", tone === "accent" ? "bg-accent" : "bg-warn")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx("rounded-card border border-line bg-white p-4 shadow-sm", className)} {...props}>
      {children}
    </div>
  );
}

export function SectionHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
