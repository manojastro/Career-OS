"use client";

import { Sparkles } from "lucide-react";
import { useAssistant } from "@/lib/assistant/AssistantContext";

export function AssistantLauncher() {
  const { toggle, isOpen } = useAssistant();
  return (
    <button
      onClick={toggle}
      aria-expanded={isOpen}
      aria-label="Open assistant"
      className="fixed bottom-20 right-4 z-30 flex items-center gap-2 rounded-full bg-ink px-4 py-3 text-sm font-medium text-white shadow-lg hover:bg-ink/90 sm:bottom-6 sm:right-6"
    >
      <Sparkles size={18} />
      <span className="hidden sm:inline">Assistant</span>
    </button>
  );
}
