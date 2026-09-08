"use client";

import { AppState, AppStateSchema, CURRENT_SCHEMA_VERSION } from "@/lib/schema";
import { createDefaultState } from "@/lib/storage/seed";
import { runMigrations } from "@/lib/storage/migrations";
import { newOpId } from "@/lib/ids";

export const STORAGE_KEY = "career-transition-os:state:v1";
const CORRUPT_BACKUP_PREFIX = "career-transition-os:corrupt-backup:";

export interface LoadResult {
  state: AppState;
  warning?: string;
  isNew: boolean;
}

function isQuotaExceeded(e: unknown): boolean {
  return (
    e instanceof DOMException &&
    (e.name === "QuotaExceededError" ||
      e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      e.code === 22)
  );
}

export function loadState(): LoadResult {
  if (typeof window === "undefined") {
    return { state: createDefaultState(), isNew: true };
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { state: createDefaultState(), isNew: true };
  }
  try {
    const parsedJson = JSON.parse(raw);
    const migrated = runMigrations(parsedJson, CURRENT_SCHEMA_VERSION);
    const result = AppStateSchema.safeParse(migrated);
    if (result.success) {
      return { state: result.data, isNew: false };
    }
    // Data exists but fails validation: never silently discard it. Preserve the
    // raw payload under a backup key and start a fresh state so the app stays usable.
    const backupKey = `${CORRUPT_BACKUP_PREFIX}${Date.now()}`;
    try {
      window.localStorage.setItem(backupKey, raw);
    } catch {
      // best effort
    }
    return {
      state: createDefaultState(),
      warning: `Saved data could not be read (${result.error.issues[0]?.message ?? "validation failed"}). A backup of the unreadable data was kept as "${backupKey}" in your browser storage. Starting from an empty state — you can inspect the backup key in DevTools if you need to recover something.`,
      isNew: false,
    };
  } catch (e) {
    const backupKey = `${CORRUPT_BACKUP_PREFIX}${Date.now()}`;
    try {
      window.localStorage.setItem(backupKey, raw);
    } catch {
      // best effort
    }
    return {
      state: createDefaultState(),
      warning: `Saved data was corrupted and could not be parsed. A backup was kept as "${backupKey}". Starting from an empty state.`,
      isNew: false,
    };
  }
}

export interface SaveResult {
  ok: boolean;
  error?: string;
}

export function saveState(state: AppState): SaveResult {
  if (typeof window === "undefined") return { ok: false, error: "No browser storage available." };
  try {
    const stamped: AppState = {
      ...state,
      meta: { ...state.meta, lastWriteId: newOpId() },
    };
    const serialized = JSON.stringify(stamped);
    window.localStorage.setItem(STORAGE_KEY, serialized);
    return { ok: true };
  } catch (e) {
    if (isQuotaExceeded(e)) {
      return {
        ok: false,
        error:
          "Browser storage is full. Export a backup and clear old chat history or archived records in Settings, then try again.",
      };
    }
    return { ok: false, error: e instanceof Error ? e.message : "Unknown storage error." };
  }
}

/**
 * Notifies when another browser tab wrote a new state, so the UI can react
 * instead of silently drifting out of sync or clobbering the newer write.
 */
export function subscribeExternalChanges(onChange: (state: AppState | null) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    if (!e.newValue) {
      onChange(null);
      return;
    }
    try {
      const parsed = JSON.parse(e.newValue);
      const result = AppStateSchema.safeParse(parsed);
      if (result.success) onChange(result.data);
    } catch {
      // ignore malformed cross-tab writes
    }
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

export interface BackupFile {
  app: "career-transition-os";
  exportedAt: string;
  schemaVersion: number;
  data: AppState;
}

export function exportBackup(state: AppState): BackupFile {
  return {
    app: "career-transition-os",
    exportedAt: new Date().toISOString(),
    schemaVersion: state.schemaVersion,
    data: state,
  };
}

export interface ImportPreview {
  valid: boolean;
  error?: string;
  parsed?: AppState;
  counts?: Record<string, { incoming: number; duplicates: number }>;
}

const LISTED_ARRAY_KEYS = [
  "tasks",
  "projects",
  "skills",
  "evidence",
  "jobs",
  "resumeVersions",
  "interviews",
  "contacts",
  "checkIns",
  "weeklyReviews",
  "readinessSnapshots",
] as const;

export function previewImport(rawJson: string, current: AppState): ImportPreview {
  let outer: unknown;
  try {
    outer = JSON.parse(rawJson);
  } catch {
    return { valid: false, error: "That file is not valid JSON." };
  }
  const candidate = (outer as any)?.data ?? outer;
  const migrated = runMigrations(candidate, CURRENT_SCHEMA_VERSION);
  const result = AppStateSchema.safeParse(migrated);
  if (!result.success) {
    return { valid: false, error: `Backup file does not match the expected format: ${result.error.issues[0]?.message ?? "invalid"}` };
  }
  const counts: Record<string, { incoming: number; duplicates: number }> = {};
  for (const key of LISTED_ARRAY_KEYS) {
    const incomingArr = (result.data as any)[key] as Array<{ id: string }>;
    const existingIds = new Set(((current as any)[key] as Array<{ id: string }>).map((r) => r.id));
    counts[key] = {
      incoming: incomingArr.length,
      duplicates: incomingArr.filter((r) => existingIds.has(r.id)).length,
    };
  }
  return { valid: true, parsed: result.data, counts };
}

export type ImportMode = "merge" | "replace";

export function applyImport(parsed: AppState, current: AppState, mode: ImportMode): AppState {
  if (mode === "replace") {
    return { ...parsed, meta: { ...current.meta } };
  }
  const merged: any = { ...current };
  for (const key of LISTED_ARRAY_KEYS) {
    const currentArr = (current as any)[key] as Array<{ id: string; updatedAt?: string }>;
    const incomingArr = (parsed as any)[key] as Array<{ id: string; updatedAt?: string }>;
    const byId = new Map(currentArr.map((r) => [r.id, r]));
    for (const incoming of incomingArr) {
      const existing = byId.get(incoming.id);
      if (!existing) {
        byId.set(incoming.id, incoming);
      } else if (incoming.updatedAt && existing.updatedAt && incoming.updatedAt > existing.updatedAt) {
        byId.set(incoming.id, incoming);
      }
    }
    merged[key] = Array.from(byId.values());
  }
  return merged as AppState;
}
