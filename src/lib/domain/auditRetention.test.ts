import { describe, it, expect } from "vitest";
import { createDefaultState } from "@/lib/storage/seed";
import { pruneAuditLog, UNDOABLE_HISTORY_LIMIT, MAX_AUDIT_ENTRIES } from "@/lib/domain/helpers";
import { createTask, updateTaskFields, undoAudit } from "@/lib/domain/commands";
import { AppState } from "@/lib/schema";
import { ValidationError } from "@/lib/domain/errors";

function stateWithNAudits(n: number): AppState {
  let state = createDefaultState();
  state = createTask(state, { title: "Subject" }, { actor: "user" }).state;
  const taskId = state.tasks[0]!.id;
  for (let i = 0; i < n - 1; i++) {
    state = updateTaskFields(state, taskId, { title: `Edit ${i}` }, { actor: "user" }).state;
  }
  return state;
}

describe("pruneAuditLog", () => {
  it("leaves a short log completely untouched", () => {
    const state = stateWithNAudits(5);
    expect(pruneAuditLog(state)).toBe(state);
    expect(state.auditLog.every((a) => !a.trimmed)).toBe(true);
  });

  it("keeps the most recent entries fully undoable", () => {
    const pruned = pruneAuditLog(stateWithNAudits(UNDOABLE_HISTORY_LIMIT + 20));
    const recent = pruned.auditLog.slice(-UNDOABLE_HISTORY_LIMIT);
    expect(recent.every((a) => !a.trimmed)).toBe(true);
    expect(recent.every((a) => a.after !== null)).toBe(true);
  });

  it("drops the heavy snapshots on older entries but keeps them readable as history", () => {
    const pruned = pruneAuditLog(stateWithNAudits(UNDOABLE_HISTORY_LIMIT + 20));
    const old = pruned.auditLog.slice(0, 20);
    expect(old.every((a) => a.trimmed)).toBe(true);
    expect(old.every((a) => a.before === null && a.after === null)).toBe(true);
    expect(old.every((a) => a.summary.length > 0)).toBe(true);
  });

  it("caps total entries so the log cannot grow without bound", () => {
    const pruned = pruneAuditLog(stateWithNAudits(MAX_AUDIT_ENTRIES + 60));
    expect(pruned.auditLog.length).toBe(MAX_AUDIT_ENTRIES);
  });

  it("shrinks the serialized payload substantially", () => {
    const before = stateWithNAudits(UNDOABLE_HISTORY_LIMIT + 60);
    const after = pruneAuditLog(before);
    const beforeSize = JSON.stringify(before.auditLog).length;
    const afterSize = JSON.stringify(after.auditLog).length;
    expect(afterSize).toBeLessThan(beforeSize);
  });

  it("refuses to undo a trimmed entry rather than restoring a null snapshot", () => {
    const pruned = pruneAuditLog(stateWithNAudits(UNDOABLE_HISTORY_LIMIT + 20));
    const trimmedEntry = pruned.auditLog.find((a) => a.trimmed)!;
    expect(() => undoAudit(pruned, trimmedEntry.id, { actor: "user" })).toThrow(ValidationError);
    // and the task itself is untouched by the failed attempt
    expect(pruned.tasks).toHaveLength(1);
  });

  it("is idempotent — pruning an already-pruned log changes nothing further", () => {
    const once = pruneAuditLog(stateWithNAudits(UNDOABLE_HISTORY_LIMIT + 20));
    const twice = pruneAuditLog(once);
    expect(twice).toBe(once);
  });
});
