"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store/StoreContext";
import { buildContext } from "@/lib/ai/context";
import { createExecutor } from "@/lib/ai/executor";
import { appendChatMessages } from "@/lib/domain/commands";
import { newId } from "@/lib/ids";
import { nowISO } from "@/lib/dateTime";
import { ChatApiResponse, ProviderMessage } from "@/lib/ai/protocol";

const MAX_ITERATIONS = 6;

export type AssistantPhase = "idle" | "thinking" | "applying" | "error";

export interface ActionOutcome {
  name: string;
  ok: boolean;
  summary: string;
  auditId?: string;
  error?: string;
}

export function useAssistantChat() {
  const store = useStore();
  const router = useRouter();
  const [phase, setPhase] = useState<AssistantPhase>("idle");
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [pendingUserText, setPendingUserText] = useState<string | null>(null);
  const [lastActions, setLastActions] = useState<ActionOutcome[]>([]);
  const [retryPayload, setRetryPayload] = useState<{ text: string; protocol: ProviderMessage[] } | null>(null);

  const send = useCallback(
    async (userText: string, resumeProtocol?: ProviderMessage[]) => {
      setPhase("thinking");
      setErrorDetail(null);
      setPendingUserText(userText);
      setLastActions([]);

      const executor = createExecutor(store);
      let protocol: ProviderMessage[] = resumeProtocol ?? [{ role: "user", content: userText }];
      const actionsThisTurn: ActionOutcome[] = [];
      let navigateTo: string | null = null;

      for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
        const context = buildContext(store.getState(), userText);
        let res: Response;
        try {
          res = await fetch("/api/ai/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ context, messages: protocol }),
          });
        } catch (e) {
          setPhase("error");
          setErrorDetail("Network error reaching the assistant. Your data was not changed by this failed request.");
          setRetryPayload({ text: userText, protocol });
          return;
        }

        let data: ChatApiResponse;
        try {
          data = await res.json();
        } catch {
          setPhase("error");
          setErrorDetail("The assistant returned an unreadable response.");
          setRetryPayload({ text: userText, protocol });
          return;
        }

        if (data.type === "error") {
          if (data.reason === "not_configured") {
            setPhase("idle");
            setErrorDetail(null);
            finalizeTurn(userText, data.message, actionsThisTurn, navigateTo);
            return;
          }
          setPhase("error");
          setErrorDetail(data.message);
          setRetryPayload({ text: userText, protocol });
          return;
        }

        if (data.type === "message") {
          setPhase("idle");
          finalizeTurn(userText, data.content, actionsThisTurn, navigateTo);
          return;
        }

        // tool_calls: execute each locally against the real store, then continue the loop
        setPhase("applying");
        protocol = [...protocol, data.assistantMessage];
        for (const call of data.toolCalls) {
          let args: Record<string, unknown> = {};
          try {
            args = call.arguments ? JSON.parse(call.arguments) : {};
          } catch {
            // malformed arguments from the model — treat as empty and let the action's own validation reject it
          }
          const result = executor(call.name, args, call.id);
          const outcome: ActionOutcome = {
            name: call.name,
            ok: result.ok,
            summary: result.ok ? summarizeAction(call.name, result.data) : result.error ?? "Failed",
            auditId: (result.data as any)?.auditId,
            error: result.ok ? undefined : result.error,
          };
          actionsThisTurn.push(outcome);
          if (result.navigate) navigateTo = result.navigate;

          protocol.push({
            role: "tool",
            tool_call_id: call.id,
            name: call.name,
            content: JSON.stringify(result.ok ? result.data : { error: result.error }),
          });
        }
        setLastActions([...actionsThisTurn]);
        // loop continues so the model can see tool results and respond
      }

      setPhase("idle");
      finalizeTurn(userText, "I stopped after several automatic steps to avoid looping. Here's what happened so far.", actionsThisTurn, navigateTo);

      function finalizeTurn(userMsg: string, assistantText: string, actions: ActionOutcome[], navigate: string | null) {
        const now = nowISO();
        store.run((s) =>
          appendChatMessages(s, [
            { id: newId("chat"), role: "user", content: userMsg, actionsSummary: [], status: "success", createdAt: now },
            {
              id: newId("chat"),
              role: "assistant",
              content: assistantText,
              actionsSummary: actions.map((a) => a.summary),
              status: actions.some((a) => !a.ok) ? "error" : "success",
              createdAt: now,
            },
          ])
        );
        setPendingUserText(null);
        setRetryPayload(null);
        if (navigate) router.push(navigate);
      }
    },
    [store, router]
  );

  const retry = useCallback(() => {
    if (retryPayload) {
      send(retryPayload.text, retryPayload.protocol);
    }
  }, [retryPayload, send]);

  return { send, retry, phase, errorDetail, pendingUserText, lastActions, canRetry: Boolean(retryPayload) };
}

function summarizeAction(name: string, data: unknown): string {
  const d = (data ?? {}) as Record<string, unknown>;
  switch (name) {
    case "create_task":
      return `Added task "${d.title}"${d.dueDate ? ` for ${d.dueDate}` : ""}`;
    case "set_task_status":
      return `Marked task ${d.status}`;
    case "log_task_time":
      return `Logged time (${d.loggedMinutes}m total)`;
    case "move_task_date":
      return `Moved task to ${d.resolvedDate}`;
    case "create_project":
      return `Added project "${d.name}"`;
    case "set_project_status":
      return `Moved project to ${d.status}`;
    case "create_skill":
      return `Added skill "${d.name}"`;
    case "create_evidence":
      return `Added evidence "${d.title}"`;
    case "create_job":
      return `Saved job "${d.role}" at ${d.company}`;
    case "run_job_match":
      return `Re-ran match (${d.jdCompleteness})`;
    case "set_job_status":
      return `Moved application to ${d.status}`;
    case "schedule_job_follow_up":
      return `Follow-up set for ${d.resolvedDate}`;
    case "create_interview":
      return `Scheduled interview with ${d.company}`;
    case "add_prep_task":
      return "Added a prep checklist item";
    case "add_interview_question":
      return "Added a practice question";
    case "create_contact":
      return `Added contact "${d.name}"`;
    case "schedule_contact_follow_up":
      return `Follow-up set for ${d.resolvedDate}`;
    case "create_check_in":
      return "Saved today's check-in";
    case "create_weekly_review":
      return "Saved weekly review";
    case "create_resume_version":
      return `Created resume version "${d.name}"`;
    case "undo_action":
      return String(d.summary ?? "Undid the last action");
    default:
      return `Ran ${name}`;
  }
}
