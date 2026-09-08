"use client";

import { useEffect, useRef, useState } from "react";
import { X, Send, Loader2, RotateCcw, Undo2, Sparkles } from "lucide-react";
import { useAssistant } from "@/lib/assistant/AssistantContext";
import { useStore } from "@/lib/store/StoreContext";
import { useAssistantChat } from "@/lib/ai/useAssistantChat";
import { undoAudit } from "@/lib/domain/commands";
import { clearChatHistory } from "@/lib/domain/commands";
import { cx } from "@/lib/utils";

const SUGGESTIONS = [
  "What should I focus on today?",
  "What did I achieve this week?",
  "Why did my readiness score change?",
];

export function AssistantPanel() {
  const { isOpen, close, pendingPrompt, clearPendingPrompt } = useAssistant();
  const { state, run, pushToast } = useStore();
  const { send, retry, phase, errorDetail, pendingUserText, lastActions, canRetry } = useAssistantChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pendingPrompt) {
      setInput(pendingPrompt);
      clearPendingPrompt();
    }
  }, [pendingPrompt, clearPendingPrompt]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [state.chatMessages.length, phase, pendingUserText]);

  if (!isOpen) return null;

  function handleSend() {
    const text = input.trim();
    if (!text || phase === "thinking" || phase === "applying") return;
    setInput("");
    send(text);
  }

  function handleUndo(auditId: string) {
    try {
      run((s) => undoAudit(s, auditId, { actor: "user" }));
      pushToast("success", "Undone.");
    } catch {
      // store.run already surfaced a toast
    }
  }

  const busy = phase === "thinking" || phase === "applying";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20 sm:bg-transparent" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Assistant"
        className="flex h-full w-full flex-col border-l border-line bg-white shadow-xl sm:w-[400px]"
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Sparkles size={16} /> Assistant
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                run((s) => clearChatHistory(s));
                pushToast("success", "Chat history cleared.");
              }}
              className="rounded p-1.5 text-xs text-muted hover:bg-black/5"
              title="Clear chat history"
            >
              Clear
            </button>
            <button onClick={close} aria-label="Close assistant" className="rounded-lg p-1.5 text-muted hover:bg-black/5">
              <X size={18} />
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {state.chatMessages.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted">
                Ask me about your data, or tell me to add/update something. I only act through the portal's own data rules — I can't change
                the app's code or layout.
              </p>
              <div className="space-y-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="block w-full rounded-lg border border-line px-3 py-2 text-left text-sm text-ink hover:border-accent/40"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {state.chatMessages.map((m) => (
            <div key={m.id} className={cx("max-w-[90%] rounded-lg px-3 py-2 text-sm", m.role === "user" ? "ml-auto bg-accent text-white" : "bg-black/[0.04] text-ink")}>
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.actionsSummary.length > 0 && (
                <ul className="mt-1.5 space-y-0.5 border-t border-black/10 pt-1.5 text-xs opacity-90">
                  {m.actionsSummary.map((a, i) => (
                    <li key={i}>• {a}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          {pendingUserText && (
            <div className="ml-auto max-w-[90%] rounded-lg bg-accent px-3 py-2 text-sm text-white">
              <p className="whitespace-pre-wrap">{pendingUserText}</p>
            </div>
          )}

          {busy && (
            <div className="flex items-center gap-2 rounded-lg bg-black/[0.04] px-3 py-2 text-sm text-muted">
              <Loader2 size={14} className="animate-spin" />
              {phase === "thinking" ? "Thinking…" : "Applying changes…"}
            </div>
          )}

          {lastActions.length > 0 && !busy && (
            <div className="space-y-1 rounded-lg border border-line px-3 py-2 text-xs">
              {lastActions.map((a, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <span className={a.ok ? "text-ink" : "text-danger"}>{a.summary}</span>
                  {a.ok && a.auditId && (
                    <button onClick={() => handleUndo(a.auditId!)} className="flex shrink-0 items-center gap-1 text-muted hover:text-ink">
                      <Undo2 size={12} /> Undo
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {phase === "error" && errorDetail && (
            <div className="space-y-2 rounded-lg border border-danger/30 bg-dangerSoft px-3 py-2 text-sm text-danger">
              <p>{errorDetail}</p>
              {canRetry && (
                <button onClick={retry} className="flex items-center gap-1 text-xs font-medium">
                  <RotateCcw size={12} /> Retry
                </button>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-line p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask or tell the assistant to do something…"
              rows={2}
              disabled={busy}
              className="flex-1 resize-none rounded-lg border border-line px-3 py-2 text-sm focus:border-accent disabled:opacity-60"
            />
            <button
              onClick={handleSend}
              disabled={busy || !input.trim()}
              aria-label="Send"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-white disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
