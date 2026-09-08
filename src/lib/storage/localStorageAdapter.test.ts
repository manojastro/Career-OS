import { describe, it, expect, beforeEach, vi } from "vitest";

function makeFakeLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
    get size() {
      return store.size;
    },
  };
}

beforeEach(() => {
  vi.resetModules();
  (globalThis as any).window = {
    localStorage: makeFakeLocalStorage(),
    addEventListener: () => {},
    removeEventListener: () => {},
  };
});

describe("loadState / saveState", () => {
  it("returns a fresh default state on first run with no warning", async () => {
    const { loadState } = await import("@/lib/storage/localStorageAdapter");
    const result = loadState();
    expect(result.isNew).toBe(true);
    expect(result.warning).toBeUndefined();
    expect(result.state.tasks).toEqual([]);
  });

  it("round-trips a saved state through save then load", async () => {
    const { loadState, saveState } = await import("@/lib/storage/localStorageAdapter");
    const { createDefaultState } = await import("@/lib/storage/seed");
    const { createTask } = await import("@/lib/domain/commands");

    const state = createTask(createDefaultState(), { title: "Persisted task" }, { actor: "user" }).state;
    const saveResult = saveState(state);
    expect(saveResult.ok).toBe(true);

    const reloaded = loadState();
    expect(reloaded.state.tasks).toHaveLength(1);
    expect(reloaded.state.tasks[0]!.title).toBe("Persisted task");
  });

  it("preserves corrupted data as a backup instead of silently discarding it", async () => {
    const { STORAGE_KEY, loadState } = await import("@/lib/storage/localStorageAdapter");
    (globalThis as any).window.localStorage.setItem(STORAGE_KEY, "{ not valid json");

    const result = loadState();
    expect(result.warning).toMatch(/corrupted/i);
    expect(result.state.tasks).toEqual([]);
    // A backup of the unreadable payload should have been written alongside the original key
    expect((globalThis as any).window.localStorage.size).toBeGreaterThanOrEqual(2);
  });

  it("rejects a schema-invalid payload and starts fresh rather than crashing", async () => {
    const { STORAGE_KEY, loadState } = await import("@/lib/storage/localStorageAdapter");
    (globalThis as any).window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 1, profile: { primaryRole: "not_a_real_role" } }));

    const result = loadState();
    expect(result.warning).toBeTruthy();
    expect(result.state.profile.primaryRole).toBe("ai_genai_engineer");
  });
});

describe("import/export backup", () => {
  it("previews duplicate counts without mutating current state", async () => {
    const { previewImport, exportBackup } = await import("@/lib/storage/localStorageAdapter");
    const { createDefaultState } = await import("@/lib/storage/seed");
    const { createTask } = await import("@/lib/domain/commands");

    const current = createTask(createDefaultState(), { title: "Existing" }, { actor: "user" }).state;
    const backup = exportBackup(current);
    const preview = previewImport(JSON.stringify(backup), current);

    expect(preview.valid).toBe(true);
    expect(preview.counts!.tasks!.incoming).toBe(1);
    expect(preview.counts!.tasks!.duplicates).toBe(1);
    expect(current.tasks).toHaveLength(1); // unchanged
  });

  it("merge keeps existing records and adds only genuinely new ones", async () => {
    const { applyImport } = await import("@/lib/storage/localStorageAdapter");
    const { createDefaultState } = await import("@/lib/storage/seed");
    const { createTask } = await import("@/lib/domain/commands");

    const current = createTask(createDefaultState(), { title: "Mine" }, { actor: "user" }).state;
    const incoming = createTask(createDefaultState(), { title: "Backup task" }, { actor: "user" }).state;

    const merged = applyImport(incoming, current, "merge");
    expect(merged.tasks.map((t) => t.title).sort()).toEqual(["Backup task", "Mine"]);
  });
});
