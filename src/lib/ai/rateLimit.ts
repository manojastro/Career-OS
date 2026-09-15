import "server-only";

/**
 * Small in-process rate limiter for the AI routes.
 *
 * This is a single-user, self-hosted portal, so an in-memory counter is the right
 * size of solution: it bounds runaway cost if the chat loop misbehaves and slows
 * passphrase guessing to a crawl. It resets on redeploy and does not coordinate
 * across serverless instances — if this is ever deployed as a multi-instance or
 * multi-tenant service, move this to a shared store.
 */

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();

export interface RateLimitRule {
  /** Distinct name so different routes don't share a budget. */
  name: string;
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export const CHAT_RATE_LIMIT: RateLimitRule = { name: "chat", limit: 30, windowMs: 60_000 };
export const UNLOCK_RATE_LIMIT: RateLimitRule = { name: "unlock", limit: 5, windowMs: 5 * 60_000 };

export function checkRateLimit(rule: RateLimitRule, clientKey: string): RateLimitResult {
  const key = `${rule.name}:${clientKey}`;
  const now = Date.now();
  const bucket = buckets.get(key) ?? { hits: [] };

  const cutoff = now - rule.windowMs;
  bucket.hits = bucket.hits.filter((t) => t > cutoff);

  if (bucket.hits.length >= rule.limit) {
    buckets.set(key, bucket);
    const oldest = bucket.hits[0] ?? now;
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((oldest + rule.windowMs - now) / 1000)) };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);

  // Opportunistic cleanup so abandoned keys don't accumulate forever.
  if (buckets.size > 500) {
    for (const [k, v] of buckets) {
      if (v.hits.every((t) => t <= cutoff)) buckets.delete(k);
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

/** Best-effort caller identity for rate limiting. Not an auth signal — spoofable by design. */
export function clientKeyFrom(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "local";
}

/** Test-only: clears accumulated counters between cases. */
export function resetRateLimits(): void {
  buckets.clear();
}
