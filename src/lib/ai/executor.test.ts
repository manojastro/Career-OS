import { describe, it, expect } from "vitest";
import { createDefaultState } from "@/lib/storage/seed";
import { createExecutor } from "@/lib/ai/executor";
import { AppState } from "@/lib/schema";
import { StoreContextValue } from "@/lib/store/StoreContext";

/** Minimal stand-in for StoreContextValue that mirrors the real run() semantics without React. */
function makeFakeStore(initial: AppState) {
  let state = initial;
  const store: Pick<StoreContextValue, "state" | "getState" | "run"> = {
    get state() {
      return state;
    },
    getState: () => state,
    run: (fn) => {
      const result = fn(state);
      state = result.state;
      return result;
    },
  };
  return store as StoreContextValue;
}

describe("AI action executor", () => {
  it("creates a task through the same path as the manual UI", () => {
    const store = makeFakeStore(createDefaultState());
    const execute = createExecutor(store);
    const result = execute("create_task", { title: "From assistant" }, "op-1");
    expect(result.ok).toBe(true);
    expect(store.getState().tasks).toHaveLength(1);
    expect(store.getState().tasks[0]!.title).toBe("From assistant");
  });

  it("does not create a duplicate task when the same tool_call id is retried", () => {
    const store = makeFakeStore(createDefaultState());
    const execute = createExecutor(store);
    execute("create_task", { title: "Retry me" }, "same-op-id");
    execute("create_task", { title: "Retry me" }, "same-op-id");
    expect(store.getState().tasks).toHaveLength(1);
  });

  it("surfaces a domain validation error as a failed result instead of throwing across the boundary", () => {
    const store = makeFakeStore(createDefaultState());
    const execute = createExecutor(store);
    const created = execute("create_task", { title: "Needs evidence", requiresEvidence: true }, "op-2");
    const taskId = (created.data as any).taskId;
    const result = execute("set_task_status", { taskId, status: "done" }, "op-3");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/evidence/i);
  });

  it("refuses an unrecognized action name outright", () => {
    const store = makeFakeStore(createDefaultState());
    const execute = createExecutor(store);
    const result = execute("delete_everything", {}, "op-x");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/unknown action/i);
  });

  it("computes a real gap-match when creating a job with JD text, not a canned answer", () => {
    const store = makeFakeStore(createDefaultState());
    const execute = createExecutor(store);
    const result = execute(
      "create_job",
      {
        company: "Acme",
        role: "AI Engineer",
        jdText: "Requirements:\n- 5+ years of Rust systems programming\n- GPU kernel optimization experience\n- Distributed consensus algorithms",
      },
      "op-4"
    );
    expect(result.ok).toBe(true);
    expect((result.data as any).recommendation).toBe("build_evidence_first");
    expect(store.getState().jobs[0]!.matchResult).toBeTruthy();
  });

  it("returns an auditId for mutations so the UI can offer Undo, and undo actually reverts it", () => {
    const store = makeFakeStore(createDefaultState());
    const execute = createExecutor(store);
    const created = execute("create_task", { title: "Undo via assistant" }, "op-5");
    const auditId = (created.data as any).auditId;
    expect(auditId).toBeTruthy();

    const undone = execute("undo_action", { auditId }, "op-6");
    expect(undone.ok).toBe(true);
    expect(store.getState().tasks).toHaveLength(0);
  });

  it("search_tasks resolves a name to an id without mutating anything", () => {
    const store = makeFakeStore(createDefaultState());
    const execute = createExecutor(store);
    execute("create_task", { title: "Docker practice" }, "op-7");
    const search = execute("search_tasks", { query: "docker" }, "op-8");
    expect(search.ok).toBe(true);
    expect((search.data as any).count).toBe(1);
    expect((search.data as any).tasks[0]!.title).toBe("Docker practice");
  });

  it("open_record returns a navigate instruction without mutating state", () => {
    const store = makeFakeStore(createDefaultState());
    const execute = createExecutor(store);
    const result = execute("open_record", { entityType: "project", entityId: "abc" }, "op-9");
    expect(result.navigate).toBe("/build");
  });
});
