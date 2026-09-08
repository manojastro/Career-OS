import { describe, it, expect } from "vitest";
import { createDefaultState } from "@/lib/storage/seed";
import {
  createTask,
  setTaskStatus,
  createProject,
  setProjectStatus,
  createEvidence,
  linkEvidence,
  undoAudit,
  updateTaskFields,
} from "@/lib/domain/commands";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/domain/errors";

describe("task commands", () => {
  it("creates a task and persists it in state", () => {
    const state = createDefaultState();
    const result = createTask(state, { title: "Practice Docker" }, { actor: "user" });
    expect(result.entity.title).toBe("Practice Docker");
    expect(result.state.tasks).toHaveLength(1);
    expect(result.state.auditLog).toHaveLength(1);
    expect(result.state.auditLog[0]!.action).toBe("task.create");
  });

  it("refuses to mark a task done when it requires evidence and has none", () => {
    let state = createDefaultState();
    state = createTask(state, { title: "Deploy API", requiresEvidence: true }, { actor: "user" }).state;
    const taskId = state.tasks[0]!.id;
    expect(() => setTaskStatus(state, taskId, "done", { actor: "user" })).toThrow(ValidationError);
  });

  it("allows marking done once evidence is linked", () => {
    let state = createDefaultState();
    state = createTask(state, { title: "Deploy API", requiresEvidence: true }, { actor: "user" }).state;
    const taskId = state.tasks[0]!.id;
    state = updateTaskFields(state, taskId, { evidenceIds: ["ev1"] }, { actor: "user" }).state;
    const result = setTaskStatus(state, taskId, "done", { actor: "user" });
    expect(result.entity.status).toBe("done");
    expect(result.entity.completedAt).toBeTruthy();
  });

  it("is idempotent when the same opId is replayed (retry safety)", () => {
    let state = createDefaultState();
    const opId = "retry-op-1";
    const first = createTask(state, { title: "Idempotent task" }, { actor: "assistant", opId });
    const second = createTask(first.state, { title: "Idempotent task" }, { actor: "assistant", opId });
    expect(second.deduped).toBe(true);
    expect(second.state.tasks).toHaveLength(1);
    expect(second.entity.id).toBe(first.entity.id);
  });

  it("rejects an update against a stale expectedUpdatedAt (conflict detection)", () => {
    let state = createDefaultState();
    state = createTask(state, { title: "Task A" }, { actor: "user" }).state;
    const task = state.tasks[0]!;
    // Someone else updates it first
    const afterFirstEdit = updateTaskFields(state, task.id, { title: "Task A (edited)" }, { actor: "user" }).state;
    // Now a stale client tries to update using the old revision
    expect(() =>
      updateTaskFields(afterFirstEdit, task.id, { title: "Task A (stale edit)" }, { actor: "user", expectedUpdatedAt: task.updatedAt })
    ).toThrow(ConflictError);
  });

  it("throws NotFoundError for an unknown task id", () => {
    const state = createDefaultState();
    expect(() => setTaskStatus(state, "does-not-exist", "done", { actor: "user" })).toThrow(NotFoundError);
  });
});

describe("undo", () => {
  it("undoes a task creation, removing it from state", () => {
    let state = createDefaultState();
    const created = createTask(state, { title: "Undo me" }, { actor: "user" });
    state = created.state;
    const undone = undoAudit(state, created.audit.id, { actor: "user" });
    expect(undone.state.tasks).toHaveLength(0);
    expect(undone.state.auditLog.find((a) => a.id === created.audit.id)?.undone).toBe(true);
  });

  it("restores the previous value when undoing an update", () => {
    let state = createDefaultState();
    state = createTask(state, { title: "Original title" }, { actor: "user" }).state;
    const task = state.tasks[0]!;
    const updated = updateTaskFields(state, task.id, { title: "Changed title" }, { actor: "user" });
    const undone = undoAudit(updated.state, updated.audit.id, { actor: "user" });
    expect(undone.state.tasks[0]!.title).toBe("Original title");
  });

  it("refuses to undo when a later change to the same entity would be silently overwritten", () => {
    let state = createDefaultState();
    state = createTask(state, { title: "Original" }, { actor: "user" }).state;
    const task = state.tasks[0]!;
    const firstEdit = updateTaskFields(state, task.id, { title: "Edit 1" }, { actor: "user" });
    const secondEdit = updateTaskFields(firstEdit.state, task.id, { title: "Edit 2" }, { actor: "user" });
    expect(() => undoAudit(secondEdit.state, firstEdit.audit.id, { actor: "user" })).toThrow(ConflictError);
  });

  it("refuses to double-undo the same audit entry", () => {
    let state = createDefaultState();
    const created = createTask(state, { title: "Once" }, { actor: "user" });
    const undone = undoAudit(created.state, created.audit.id, { actor: "user" });
    expect(() => undoAudit(undone.state, created.audit.id, { actor: "user" })).toThrow(ValidationError);
  });
});

describe("project status evidence gating", () => {
  it("refuses Deployed without a deployment record or evidence", () => {
    let state = createDefaultState();
    state = createProject(state, { name: "RAG bot" }, { actor: "user" }).state;
    const projectId = state.projects[0]!.id;
    expect(() => setProjectStatus(state, projectId, "deployed", { actor: "user" })).toThrow(ValidationError);
  });

  it("allows Deployed once deployment evidence is linked", () => {
    let state = createDefaultState();
    state = createProject(state, { name: "RAG bot" }, { actor: "user" }).state;
    const projectId = state.projects[0]!.id;
    const evidence = createEvidence(state, { title: "Render deploy", type: "deployment" }, { actor: "user" });
    state = evidence.state;
    state = linkEvidence(state, evidence.entity.id, { projectId }, { actor: "user" }).state;
    const result = setProjectStatus(state, projectId, "deployed", { actor: "user" });
    expect(result.entity.status).toBe("deployed");
  });

  it("refuses Validated without test/evaluation evidence even if deployed", () => {
    let state = createDefaultState();
    state = createProject(state, { name: "RAG bot", deploymentRecorded: true }, { actor: "user" }).state;
    const projectId = state.projects[0]!.id;
    state = setProjectStatus(state, projectId, "deployed", { actor: "user" }).state;
    expect(() => setProjectStatus(state, projectId, "validated", { actor: "user" })).toThrow(ValidationError);
  });
});

describe("evidence linking", () => {
  it("links evidence bidirectionally to a project", () => {
    let state = createDefaultState();
    state = createProject(state, { name: "Proj" }, { actor: "user" }).state;
    const projectId = state.projects[0]!.id;
    const evidence = createEvidence(state, { title: "Repo", type: "repository" }, { actor: "user" });
    state = evidence.state;
    const linked = linkEvidence(state, evidence.entity.id, { projectId }, { actor: "user" });
    expect(linked.entity.linkedProjectIds).toContain(projectId);
    expect(linked.state.projects[0]!.evidenceIds).toContain(evidence.entity.id);
  });
});
