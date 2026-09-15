import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { checkRateLimit, resetRateLimits, clientKeyFrom, CHAT_RATE_LIMIT, UNLOCK_RATE_LIMIT } from "@/lib/ai/rateLimit";

beforeEach(() => {
  resetRateLimits();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("checkRateLimit", () => {
  it("allows requests up to the limit and blocks the one after", () => {
    const rule = { name: "t1", limit: 3, windowMs: 60_000 };
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit(rule, "1.2.3.4").allowed).toBe(true);
    }
    const blocked = checkRateLimit(rule, "1.2.3.4");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("keeps separate budgets per caller", () => {
    const rule = { name: "t2", limit: 1, windowMs: 60_000 };
    expect(checkRateLimit(rule, "caller-a").allowed).toBe(true);
    expect(checkRateLimit(rule, "caller-a").allowed).toBe(false);
    expect(checkRateLimit(rule, "caller-b").allowed).toBe(true);
  });

  it("keeps separate budgets per rule, so chat traffic can't lock out unlocking", () => {
    const chatRule = { name: "chat-x", limit: 1, windowMs: 60_000 };
    const unlockRule = { name: "unlock-x", limit: 1, windowMs: 60_000 };
    expect(checkRateLimit(chatRule, "same-ip").allowed).toBe(true);
    expect(checkRateLimit(chatRule, "same-ip").allowed).toBe(false);
    expect(checkRateLimit(unlockRule, "same-ip").allowed).toBe(true);
  });

  it("frees the budget again once the window has passed", () => {
    vi.useFakeTimers();
    const rule = { name: "t3", limit: 2, windowMs: 1_000 };
    expect(checkRateLimit(rule, "ip").allowed).toBe(true);
    expect(checkRateLimit(rule, "ip").allowed).toBe(true);
    expect(checkRateLimit(rule, "ip").allowed).toBe(false);

    vi.advanceTimersByTime(1_500);
    expect(checkRateLimit(rule, "ip").allowed).toBe(true);
  });

  it("throttles passphrase guessing far more aggressively than normal chat use", () => {
    expect(UNLOCK_RATE_LIMIT.limit).toBeLessThan(CHAT_RATE_LIMIT.limit);
  });
});

describe("clientKeyFrom", () => {
  it("uses the first x-forwarded-for hop when present", () => {
    const req = new Request("http://localhost/api/ai/chat", {
      headers: { "x-forwarded-for": "203.0.113.5, 70.41.3.18" },
    });
    expect(clientKeyFrom(req)).toBe("203.0.113.5");
  });

  it("falls back to a constant key when no proxy headers exist (local use)", () => {
    const req = new Request("http://localhost/api/ai/chat");
    expect(clientKeyFrom(req)).toBe("local");
  });
});
