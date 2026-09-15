import { NextRequest, NextResponse } from "next/server";
import { isOwnerGateConfigured, isRequestUnlocked, checkPassphrase, OWNER_COOKIE_NAME, tokenValue } from "@/lib/ai/ownerAuth";
import { isProviderConfigured } from "@/lib/ai/providerAdapter";
import { UNLOCK_RATE_LIMIT, checkRateLimit, clientKeyFrom } from "@/lib/ai/rateLimit";

export async function GET() {
  return NextResponse.json({
    gateConfigured: isOwnerGateConfigured(),
    unlocked: isRequestUnlocked(),
    providerConfigured: isProviderConfigured(),
  });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const passphrase = typeof (body as any)?.passphrase === "string" ? (body as any).passphrase : "";
  if (!passphrase || passphrase.length > 500) {
    return NextResponse.json({ error: "Passphrase required." }, { status: 400 });
  }

  // Throttle before checking, so the gate can't be brute-forced by guessing in a loop.
  const rate = checkRateLimit(UNLOCK_RATE_LIMIT, clientKeyFrom(req));
  if (!rate.allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in about ${rate.retryAfterSeconds}s.` },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
    );
  }

  if (!checkPassphrase(passphrase)) {
    return NextResponse.json({ error: "Incorrect passphrase." }, { status: 401 });
  }
  const res = NextResponse.json({ unlocked: true });
  res.cookies.set(OWNER_COOKIE_NAME, tokenValue()!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ unlocked: false });
  res.cookies.set(OWNER_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return res;
}
