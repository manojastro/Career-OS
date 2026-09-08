import { NextRequest, NextResponse } from "next/server";
import { isRequestUnlocked } from "@/lib/ai/ownerAuth";
import { callProvider, isProviderConfigured, ProviderMessage } from "@/lib/ai/providerAdapter";
import { getToolSpecs } from "@/lib/ai/actions";
import { buildSystemPrompt } from "@/lib/ai/systemPrompt";

const MAX_MESSAGES = 40;
const MAX_PAYLOAD_BYTES = 120_000;

export async function POST(req: NextRequest) {
  if (!isRequestUnlocked()) {
    return NextResponse.json({ type: "error", reason: "locked", message: "Enter the owner passphrase in Settings first." }, { status: 401 });
  }
  if (!isProviderConfigured()) {
    return NextResponse.json({
      type: "error",
      reason: "not_configured",
      message: "AI not connected. Manual use of the portal works normally — set up a provider in Settings to enable the assistant.",
    });
  }

  const raw = await req.text();
  if (raw.length > MAX_PAYLOAD_BYTES) {
    return NextResponse.json({ type: "error", reason: "too_large", message: "That request is too large." }, { status: 413 });
  }

  let body: { context: unknown; messages: ProviderMessage[] };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ type: "error", reason: "bad_request", message: "Invalid request body." }, { status: 400 });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > MAX_MESSAGES) {
    return NextResponse.json({ type: "error", reason: "bad_request", message: "Invalid message list." }, { status: 400 });
  }

  const systemMessage: ProviderMessage = { role: "system", content: buildSystemPrompt(body.context as any) };
  const result = await callProvider([systemMessage, ...body.messages], getToolSpecs());

  if (!result.ok) {
    return NextResponse.json({ type: "error", reason: "provider_error", message: result.error }, { status: result.status });
  }

  const message = result.message;
  if (message.tool_calls && message.tool_calls.length > 0) {
    return NextResponse.json({
      type: "tool_calls",
      assistantMessage: message,
      toolCalls: message.tool_calls.map((tc) => ({ id: tc.id, name: tc.function.name, arguments: tc.function.arguments })),
    });
  }

  return NextResponse.json({ type: "message", content: message.content ?? "" });
}
