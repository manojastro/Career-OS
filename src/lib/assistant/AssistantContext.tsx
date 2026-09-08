"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface AssistantContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  pendingPrompt: string | null;
  askAbout: (prompt: string) => void;
  clearPendingPrompt: () => void;
}

const AssistantContext = createContext<AssistantContextValue | null>(null);

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);
  const askAbout = useCallback((prompt: string) => {
    setPendingPrompt(prompt);
    setIsOpen(true);
  }, []);
  const clearPendingPrompt = useCallback(() => setPendingPrompt(null), []);

  return (
    <AssistantContext.Provider value={{ isOpen, open, close, toggle, pendingPrompt, askAbout, clearPendingPrompt }}>
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistant(): AssistantContextValue {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error("useAssistant must be used within AssistantProvider");
  return ctx;
}
