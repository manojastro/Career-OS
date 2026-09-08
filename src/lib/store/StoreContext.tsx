"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "@/lib/schema";
import { loadState, saveState, subscribeExternalChanges } from "@/lib/storage/localStorageAdapter";
import { nowISO } from "@/lib/dateTime";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/domain/errors";
import { newId } from "@/lib/ids";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface Toast {
  id: string;
  kind: "success" | "error" | "info";
  message: string;
}

interface CommandOutcome {
  state: AppState;
}

export interface StoreContextValue {
  state: AppState;
  /** Always returns the latest committed state, even mid-async-loop before the next render lands. */
  getState: () => AppState;
  ready: boolean;
  saveStatus: SaveStatus;
  saveError?: string;
  startupWarning?: string;
  dismissStartupWarning: () => void;
  toasts: Toast[];
  pushToast: (kind: Toast["kind"], message: string) => void;
  dismissToast: (id: string) => void;
  /**
   * Runs a domain command against the current state and persists the result.
   * Every form and every AI action goes through this single choke point, so
   * both paths get identical validation, conflict detection, and persistence.
   */
  run: <R extends CommandOutcome>(fn: (state: AppState) => R) => R;
  replaceState: (next: AppState) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const [ready, setReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | undefined>(undefined);
  const [startupWarning, setStartupWarning] = useState<string | undefined>(undefined);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const stateRef = useRef<AppState | null>(null);

  const pushToast = useCallback((kind: Toast["kind"], message: string) => {
    const id = newId("toast");
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  useEffect(() => {
    const result = loadState();
    const withOpen: AppState = { ...result.state, meta: { ...result.state.meta, lastOpenedAt: nowISO() } };
    stateRef.current = withOpen;
    setState(withOpen);
    setReady(true);
    if (result.warning) setStartupWarning(result.warning);
    // Persist the lastOpenedAt bump quietly; if it fails, storage is unusable and
    // later writes will surface the same error through the normal save path.
    saveState(withOpen);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeExternalChanges((incoming) => {
      if (!incoming) return;
      const current = stateRef.current;
      if (current && incoming.meta.lastWriteId === current.meta.lastWriteId) return;
      stateRef.current = incoming;
      setState(incoming);
      pushToast("info", "Data was updated in another tab. This view now shows the latest version.");
    });
    return unsubscribe;
  }, [pushToast]);

  const run = useCallback<StoreContextValue["run"]>((fn) => {
    const current = stateRef.current;
    if (!current) throw new Error("Store not ready yet.");
    let result: CommandOutcome;
    try {
      result = fn(current);
    } catch (e) {
      if (e instanceof ConflictError) {
        pushToast("error", e.message);
      } else if (e instanceof ValidationError || e instanceof NotFoundError) {
        pushToast("error", e.message);
      } else {
        pushToast("error", e instanceof Error ? e.message : "Something went wrong.");
      }
      throw e;
    }
    setSaveStatus("saving");
    const saveResult = saveState(result.state);
    if (!saveResult.ok) {
      setSaveStatus("error");
      setSaveError(saveResult.error);
      pushToast("error", saveResult.error ?? "Could not save your change.");
      throw new Error(saveResult.error ?? "Save failed");
    }
    stateRef.current = result.state;
    setState(result.state);
    setSaveStatus("saved");
    setSaveError(undefined);
    return result as any;
  }, [pushToast]);

  const replaceState = useCallback((next: AppState) => {
    const saveResult = saveState(next);
    if (!saveResult.ok) {
      pushToast("error", saveResult.error ?? "Could not save.");
      return;
    }
    stateRef.current = next;
    setState(next);
    setSaveStatus("saved");
  }, [pushToast]);

  const dismissStartupWarning = useCallback(() => setStartupWarning(undefined), []);

  const value = useMemo<StoreContextValue | null>(() => {
    if (!state) return null;
    return {
      state,
      getState: () => stateRef.current ?? state,
      ready,
      saveStatus,
      saveError,
      startupWarning,
      dismissStartupWarning,
      toasts,
      pushToast,
      dismissToast,
      run,
      replaceState,
    };
  }, [state, ready, saveStatus, saveError, startupWarning, dismissStartupWarning, toasts, pushToast, dismissToast, run, replaceState]);

  if (!value) {
    return (
      <div className="flex h-screen items-center justify-center bg-paper text-muted">
        <p>Loading your workspace…</p>
      </div>
    );
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
