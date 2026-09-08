import { NextRequest, NextResponse } from "next/server";
import { isOwnerGateConfigured, isRequestUnlocked, checkPassphrase, OWNER_COOKIE_NAME, tokenValue } from "@/lib/ai/ownerAuth";
import { isProviderConfigured } from "@/lib/ai/providerAdapter";

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
