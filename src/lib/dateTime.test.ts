import { describe, it, expect } from "vitest";
import { resolveRelativeDate, addDaysISO, weekdayOf } from "@/lib/dateTime";

describe("resolveRelativeDate", () => {
  it("resolves 'today' and 'tomorrow' relative to Asia/Kolkata", () => {
    const today = resolveRelativeDate("today", "Asia/Kolkata")!;
    const tomorrow = resolveRelativeDate("tomorrow", "Asia/Kolkata")!;
    expect(tomorrow).toBe(addDaysISO(today, 1));
  });

  it("resolves 'in 3 days'", () => {
    const today = resolveRelativeDate("today", "Asia/Kolkata")!;
    expect(resolveRelativeDate("in 3 days", "Asia/Kolkata")).toBe(addDaysISO(today, 3));
  });

  it("passes through an already-resolved ISO date unchanged", () => {
    expect(resolveRelativeDate("2026-05-01")).toBe("2026-05-01");
  });

  it("returns null for a phrase it cannot resolve, rather than guessing", () => {
    expect(resolveRelativeDate("sometime next quarter")).toBeNull();
  });

  it("'next <weekday>' lands strictly after this week's occurrence", () => {
    const today = resolveRelativeDate("today", "Asia/Kolkata")!;
    const todayDow = weekdayOf(today, "Asia/Kolkata");
    const resolved = resolveRelativeDate("next monday", "Asia/Kolkata")!;
    expect(resolved > today).toBe(true);
    expect(weekdayOf(resolved, "Asia/Kolkata")).toBe("mon");
  });
});
