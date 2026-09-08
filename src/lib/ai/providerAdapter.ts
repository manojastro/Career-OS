import "server-only";
import { ProviderMessage, ProviderToolSpec } from "@/lib/ai/protocol";

export type { ProviderMessage, ProviderToolSpec };

export type ProviderResult =
  | { ok: true; message: ProviderMessage }
  | { ok: false; status: number; error: string };

function getConfig() {
  const baseUrl = process.env.AI_PROVIDER_BASE_URL?.trim();
  const apiKey = process.env.AI_PROVIDER_API_KEY?.trim();
  const model = process.env.AI_PROVIDER_MODEL?.trim();
  const timeoutMs = Number(process.env.AI_REQUEST_TIMEOUT_MS ?? 30000);
  const configured = Boolean(baseUrl && apiKey && model && !apiKey.startsWith("sk-placeholder"));
  return { baseUrl, apiKey, model, timeoutMs, configured };
}

export function isProviderConfigured(): boolean {
  return getConfig().configured;
}

/**
 * Talks to exactly one, server-configured, OpenAI-compatible endpoint. The base URL
 * is never taken from the request — only from server environment variables — so a
 * client (or content reflected through one) cannot redirect this call anywhere else.
 */
export async function callProvider(messages: ProviderMessage[], tools: ProviderToolSpec[]): Promise<ProviderResult> {
  const { baseUrl, apiKey, model, timeoutMs, configured } = getConfig();
  if (!configured || !baseUrl || !apiKey || !model) {
    return { ok: false, status: 503, error: "not_configured" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? "auto" : undefined,
        temperature: 0.3,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, status: res.status, error: `Provider returned ${res.status}: ${text.slice(0, 300)}` };
    }

    const data = await res.json();
    const message = data?.choices?.[0]?.message;
    if (!message) {
      return { ok: false, status: 502, error: "Provider response did not include a message." };
    }
    return { ok: true, message };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return { ok: false, status: 504, error: `Provider request timed out after ${timeoutMs}ms.` };
    }
    return { ok: false, status: 502, error: e instanceof Error ? e.message : "Unknown provider error." };
  } finally {
    clearTimeout(timer);
  }
}

export async function testProviderConnectionLive(): Promise<ProviderResult> {
  return callProvider(
    [
      { role: "system", content: "Reply with exactly the single word: pong" },
      { role: "user", content: "ping" },
    ],
    []
  );
}

export function getConfiguredModelName(): string | undefined {
  return getConfig().model;
}
