export const APP_TIMEZONE = "Asia/Kolkata";

/** Returns today's date as YYYY-MM-DD in the app's configured timezone. */
export function todayISO(tz: string = APP_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

let lastNowMs = 0;

/**
 * Monotonic timestamp: guaranteed strictly greater than the previous call's result,
 * even within the same millisecond. Record `updatedAt` values are compared for
 * optimistic-concurrency conflict detection (see domain/helpers.ts), so two edits
 * issued back-to-back must never produce identical timestamps.
 */
export function nowISO(): string {
  let ms = Date.now();
  if (ms <= lastNowMs) ms = lastNowMs + 1;
  lastNowMs = ms;
  return new Date(ms).toISOString();
}

/** Weekday key (mon..sun) for a given YYYY-MM-DD date, evaluated in the app timezone. */
export function weekdayOf(dateISO: string, tz: string = APP_TIMEZONE): "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun" {
  const d = new Date(`${dateISO}T12:00:00`);
  const map = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
  const weekdayName = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(d);
  const idx = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekdayName);
  return map[idx >= 0 ? idx : 0] ?? "mon";
}

export function addDaysISO(dateISO: string, days: number): string {
  const d = new Date(`${dateISO}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(aISO: string, bISO: string): number {
  const a = new Date(`${aISO}T00:00:00Z`).getTime();
  const b = new Date(`${bISO}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86400000);
}

export function formatDateDisplay(dateISO?: string): string {
  if (!dateISO) return "—";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: APP_TIMEZONE,
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(`${dateISO}T12:00:00`));
  } catch {
    return dateISO;
  }
}

export function formatDateTimeDisplay(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: APP_TIMEZONE,
      day: "2-digit",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatLPA(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `₹${rounded}L`;
}

const WEEKDAY_NAMES: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

/**
 * Resolves a small set of natural-language relative date phrases into an
 * absolute YYYY-MM-DD date in the app timezone. Used by the AI assistant so
 * "tomorrow" / "next Tuesday" / "in 3 days" behave deterministically instead
 * of relying on the model's own date arithmetic.
 */
export function resolveRelativeDate(phrase: string, tz: string = APP_TIMEZONE): string | null {
  const p = phrase.trim().toLowerCase();
  const today = todayISO(tz);
  if (p === "today") return today;
  if (p === "tomorrow") return addDaysISO(today, 1);
  if (p === "yesterday") return addDaysISO(today, -1);

  const inDaysMatch = p.match(/^in (\d+) days?$/);
  const inDaysAmount = inDaysMatch?.[1];
  if (inDaysAmount) return addDaysISO(today, parseInt(inDaysAmount, 10));

  const nextWeekdayName = p.match(/^next (\w+)$/)?.[1];
  if (nextWeekdayName && nextWeekdayName in WEEKDAY_NAMES) {
    const target = WEEKDAY_NAMES[nextWeekdayName]!;
    const todayDow = new Date(`${today}T12:00:00Z`).getUTCDay();
    let delta = target - todayDow;
    if (delta <= 0) delta += 7;
    delta += 7; // "next X" means the occurrence after this week's
    return addDaysISO(today, delta);
  }

  const thisWeekdayName = p.match(/^this (\w+)$/)?.[1] ?? (p in WEEKDAY_NAMES ? p : undefined);
  if (thisWeekdayName && thisWeekdayName in WEEKDAY_NAMES) {
    const target = WEEKDAY_NAMES[thisWeekdayName]!;
    const todayDow = new Date(`${today}T12:00:00Z`).getUTCDay();
    let delta = target - todayDow;
    if (delta < 0) delta += 7;
    return addDaysISO(today, delta);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(p)) return p;

  return null;
}
