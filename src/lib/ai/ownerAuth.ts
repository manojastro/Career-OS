import "server-only";
import { cookies } from "next/headers";
import { timingSafeEqual } from "crypto";

export const OWNER_COOKIE_NAME = "career_os_owner";

function configuredToken(): string | undefined {
  const token = process.env.AI_ENDPOINT_ACCESS_TOKEN?.trim();
  if (!token || token === "change-me-to-a-long-random-string") return undefined;
  return token;
}

/** Whether the deployment has opted into the owner-passphrase gate at all. */
export function isOwnerGateConfigured(): boolean {
  return Boolean(configuredToken());
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** True when the AI endpoints may be used: gate not configured, or the owner cookie matches. */
export function isRequestUnlocked(): boolean {
  const token = configuredToken();
  if (!token) return true;
  const cookie = cookies().get(OWNER_COOKIE_NAME)?.value;
  if (!cookie) return false;
  return safeEqual(cookie, token);
}

export function checkPassphrase(candidate: string): boolean {
  const token = configuredToken();
  if (!token) return false;
  return safeEqual(candidate, token);
}

export function tokenValue(): string | undefined {
  return configuredToken();
}
