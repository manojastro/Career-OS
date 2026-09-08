/** Shared wire types between the client chat orchestrator and the server route. No "server-only" import here — this file is safe on both sides. */

export interface ProviderMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
  name?: string;
}

export interface ProviderToolSpec {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

export type ChatApiResponse =
  | { type: "message"; content: string }
  | { type: "tool_calls"; assistantMessage: ProviderMessage; toolCalls: { id: string; name: string; arguments: string }[] }
  | { type: "error"; reason: "locked" | "not_configured" | "provider_error" | "bad_request" | "too_large"; message: string };
