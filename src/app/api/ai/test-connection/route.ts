import { NextResponse } from "next/server";
import { isRequestUnlocked } from "@/lib/ai/ownerAuth";
import { isProviderConfigured, testProviderConnectionLive, getConfiguredModelName } from "@/lib/ai/providerAdapter";

export async function POST() {
  if (!isRequestUnlocked()) {
    return NextResponse.json({ reason: "locked", message: "Enter the owner passphrase first." }, { status: 401 });
  }
  if (!isProviderConfigured()) {
    return NextResponse.json(
      { reason: "not_configured", message: "AI not connected. Set AI_PROVIDER_BASE_URL, AI_PROVIDER_API_KEY, and AI_PROVIDER_MODEL in your server environment." },
      { status: 200 }
    );
  }
  const result = await testProviderConnectionLive();
  if (!result.ok) {
    return NextResponse.json({ reason: "error", message: result.error }, { status: 502 });
  }
  return NextResponse.json({ reason: "connected", model: getConfiguredModelName(), message: "Connected successfully." });
}
