import {
  AppState,
  TaskItem,
  TaskItemSchema,
  TaskStatus,
  Project,
  ProjectSchema,
  ProjectStatus,
  Skill,
  SkillSchema,
  Evidence,
  EvidenceSchema,
  Job,
  JobSchema,
  JobStatus,
  ResumeVersion,
  ResumeVersionSchema,
  Interview,
  InterviewSchema,
  Contact,
  ContactSchema,
  DailyCheckIn,
  DailyCheckInSchema,
  WeeklyReview,
  WeeklyReviewSchema,
  Profile,
  ProfileSchema,
  ResumeMasterProfile,
  JdMatchResult,
  ReadinessSnapshot,
  ReadinessSnapshotSchema,
} from "@/lib/schema";
import { nowISO } from "@/lib/dateTime";
import { newId } from "@/lib/ids";
import { CommandContext, CommandResult, ENTITY_ARRAY_KEYS } from "@/lib/domain/types";
import { buildAudit, findEntity, makeCreate, makeUpdate, tryDedupe } from "@/lib/domain/helpers";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/domain/errors";

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export const createTask = makeCreate<TaskItem>("task", TaskItemSchema, "task", (t) => `Created task "${t.title}"`);
export const updateTaskFields = makeUpdate<TaskItem>(
  "task",
  TaskItemSchema,
  "task",
  (before, after) => `Updated task "${after.title}"`
);

export function setTaskStatus(
  state: AppState,
  id: string,
  status: TaskStatus,
  ctx: CommandContext,
  opts?: { blockerNote?: string }
): CommandResult<TaskItem> {
  const dedup = tryDedupe<TaskItem>(state, ctx, "tasks");
  if (dedup) return dedup;
  const existing = findEntity<TaskItem>(state, "tasks", id);
  if (status === "done" && existing.requiresEvidence && existing.evidenceIds.length === 0) {
    throw new ValidationError(
      `"${existing.title}" needs at least one evidence link before it can be marked done. Add evidence first.`
    );
  }
  const patch: Partial<TaskItem> = { status };
  if (status === "done") patch.completedAt = nowISO();
  if (status !== "done") patch.completedAt = undefined;
  if (status === "blocked") patch.blockerNote = opts?.blockerNote ?? existing.blockerNote;
  const updated = TaskItemSchema.parse({ ...existing, ...patch, updatedAt: nowISO() });
  const audit = buildAudit(ctx, "task.status", "task", id, existing, updated, `Marked "${existing.title}" as ${status.replace("_", " ")}`);
  const tasks = state.tasks.map((t) => (t.id === id ? updated : t));
  return { state: { ...state, tasks, auditLog: [...state.auditLog, audit] }, entity: updated, audit, deduped: false };
}

export function logTaskTime(state: AppState, id: string, minutes: number, ctx: CommandContext): CommandResult<TaskItem> {
  const dedup = tryDedupe<TaskItem>(state, ctx, "tasks");
  if (dedup) return dedup;
  const existing = findEntity<TaskItem>(state, "tasks", id);
  const updated = TaskItemSchema.parse({ ...existing, loggedMinutes: existing.loggedMinutes + minutes, updatedAt: nowISO() });
  const audit = buildAudit(ctx, "task.logTime", "task", id, existing, updated, `Logged ${minutes}m on "${existing.title}"`);
  const tasks = state.tasks.map((t) => (t.id === id ? updated : t));
  return { state: { ...state, tasks, auditLog: [...state.auditLog, audit] }, entity: updated, audit, deduped: false };
}

export function moveTaskDate(state: AppState, id: string, newDate: string, ctx: CommandContext): CommandResult<TaskItem> {
  return updateTaskFields(state, id, { dueDate: newDate }, ctx);
}

export function deleteTask(state: AppState, id: string, ctx: CommandContext): CommandResult<TaskItem> {
  const dedup = tryDedupe<TaskItem>(state, ctx, "tasks");
  if (dedup) return dedup;
  const existing = findEntity<TaskItem>(state, "tasks", id);
  const audit = buildAudit(ctx, "task.delete", "task", id, existing, null, `Deleted task "${existing.title}"`);
  const tasks = state.tasks.filter((t) => t.id !== id);
  return { state: { ...state, tasks, auditLog: [...state.auditLog, audit] }, entity: existing, audit, deduped: false };
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export const createProject = makeCreate<Project>("project", ProjectSchema, "project", (p) => `Created project "${p.name}"`);
export const updateProjectFields = makeUpdate<Project>(
  "project",
  ProjectSchema,
  "project",
  (before, after) => `Updated project "${after.name}"`
);

export function setProjectStatus(state: AppState, id: string, status: ProjectStatus, ctx: CommandContext): CommandResult<Project> {
  const dedup = tryDedupe<Project>(state, ctx, "projects");
  if (dedup) return dedup;
  const existing = findEntity<Project>(state, "projects", id);
  const linkedEvidence = state.evidence.filter((e) => existing.evidenceIds.includes(e.id));
  if (status === "deployed") {
    const hasDeployment = existing.deploymentRecorded || linkedEvidence.some((e) => e.type === "deployment");
    if (!hasDeployment) {
      throw new ValidationError(
        `Mark "${existing.name}" Deployed only after adding a deployment record or linking deployment evidence.`
      );
    }
  }
  if (status === "validated") {
    const hasValidation =
      existing.validationRecorded || linkedEvidence.some((e) => e.type === "evaluation_result" || e.type === "test_result");
    if (!hasValidation) {
      throw new ValidationError(
        `Mark "${existing.name}" Validated only after linking recorded test or evaluation evidence.`
      );
    }
  }
  const updated = ProjectSchema.parse({ ...existing, status, updatedAt: nowISO() });
  const audit = buildAudit(ctx, "project.status", "project", id, existing, updated, `Moved "${existing.name}" to ${status}`);
  const projects = state.projects.map((p) => (p.id === id ? updated : p));
  return { state: { ...state, projects, auditLog: [...state.auditLog, audit] }, entity: updated, audit, deduped: false };
}

export function archiveProject(state: AppState, id: string, ctx: CommandContext): CommandResult<Project> {
  return updateProjectFields(state, id, { status: "archived", archivedAt: nowISO() }, ctx);
}

export function restoreProject(state: AppState, id: string, ctx: CommandContext): CommandResult<Project> {
  return updateProjectFields(state, id, { status: "building", archivedAt: undefined }, ctx);
}

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

export const createSkill = makeCreate<Skill>("skill", SkillSchema, "skill", (s) => `Added skill "${s.name}"`);
export const updateSkillFields = makeUpdate<Skill>(
  "skill",
  SkillSchema,
  "skill",
  (before, after) => `Updated skill "${after.name}"`
);

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

export const createEvidence = makeCreate<Evidence>("evidence", EvidenceSchema, "evidence", (e) => `Added evidence "${e.title}"`);
export const updateEvidenceFields = makeUpdate<Evidence>(
  "evidence",
  EvidenceSchema,
  "evidence",
  (before, after) => `Updated evidence "${after.title}"`
);

export function linkEvidence(
  state: AppState,
  evidenceId: string,
  target: { projectId?: string; skillId?: string },
  ctx: CommandContext
): CommandResult<Evidence> {
  const dedup = tryDedupe<Evidence>(state, ctx, "evidence");
  if (dedup) return dedup;
  const evidence = findEntity<Evidence>(state, "evidence", evidenceId);
  let projects = state.projects;
  let skills = state.skills;
  const updatedEvidence: Evidence = { ...evidence, updatedAt: nowISO() };

  if (target.projectId) {
    const project = findEntity<Project>(state, "projects", target.projectId);
    if (!updatedEvidence.linkedProjectIds.includes(target.projectId)) {
      updatedEvidence.linkedProjectIds = [...updatedEvidence.linkedProjectIds, target.projectId];
    }
    if (!project.evidenceIds.includes(evidenceId)) {
      projects = projects.map((p) =>
        p.id === project.id ? { ...p, evidenceIds: [...p.evidenceIds, evidenceId], updatedAt: nowISO() } : p
      );
    }
  }
  if (target.skillId) {
    const skill = findEntity<Skill>(state, "skills", target.skillId);
    if (!updatedEvidence.linkedSkillIds.includes(target.skillId)) {
      updatedEvidence.linkedSkillIds = [...updatedEvidence.linkedSkillIds, target.skillId];
    }
    if (!skill.evidenceIds.includes(evidenceId)) {
      skills = skills.map((s) =>
        s.id === skill.id ? { ...s, evidenceIds: [...s.evidenceIds, evidenceId], updatedAt: nowISO() } : s
      );
    }
  }
  const evidenceArr = state.evidence.map((e) => (e.id === evidenceId ? updatedEvidence : e));
  const audit = buildAudit(
    ctx,
    "evidence.link",
    "evidence",
    evidenceId,
    evidence,
    updatedEvidence,
    `Linked evidence "${evidence.title}"`
  );
  return {
    state: { ...state, evidence: evidenceArr, projects, skills, auditLog: [...state.auditLog, audit] },
    entity: updatedEvidence,
    audit,
    deduped: false,
  };
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

export const createJob = makeCreate<Job>("job", JobSchema, "job", (j) => `Saved job "${j.role}" at ${j.company}`);
export const updateJobFields = makeUpdate<Job>(
  "job",
  JobSchema,
  "job",
  (before, after) => `Updated job "${after.role}" at ${after.company}`
);

export function setJobStatus(state: AppState, id: string, status: JobStatus, ctx: CommandContext): CommandResult<Job> {
  const dedup = tryDedupe<Job>(state, ctx, "jobs");
  if (dedup) return dedup;
  const existing = findEntity<Job>(state, "jobs", id);
  const patch: Partial<Job> = {
    status,
    statusHistory: [...existing.statusHistory, { status, at: nowISO() }],
  };
  if (status === "applied" && !existing.appliedAt) patch.appliedAt = nowISO();
  const updated = JobSchema.parse({ ...existing, ...patch, updatedAt: nowISO() });
  const audit = buildAudit(
    ctx,
    "job.status",
    "job",
    id,
    existing,
    updated,
    `Moved "${existing.role}" at ${existing.company} to ${status}`
  );
  const jobs = state.jobs.map((j) => (j.id === id ? updated : j));
  return { state: { ...state, jobs, auditLog: [...state.auditLog, audit] }, entity: updated, audit, deduped: false };
}

export function setJobMatchResult(state: AppState, id: string, matchResult: JdMatchResult, ctx: CommandContext): CommandResult<Job> {
  return updateJobFields(state, id, { matchResult }, ctx);
}

// ---------------------------------------------------------------------------
// Resume
// ---------------------------------------------------------------------------

export function updateResumeProfile(state: AppState, patch: Partial<ResumeMasterProfile>, ctx: CommandContext): { state: AppState } {
  const before = state.resumeProfile;
  const after = { ...before, ...patch, updatedAt: nowISO() };
  const audit = buildAudit(ctx, "resumeProfile.update", "resumeVersion", "master", before, after, "Updated master resume profile");
  return { state: { ...state, resumeProfile: after, auditLog: [...state.auditLog, audit] } };
}

export function updateResumeBullet(
  state: AppState,
  experienceId: string,
  bulletId: string,
  newText: string,
  ctx: CommandContext
): { state: AppState } {
  const before = state.resumeProfile;
  const experience = before.experience.find((e) => e.id === experienceId);
  if (!experience) throw new NotFoundError("experience", experienceId);
  const bullet = experience.bullets.find((b) => b.id === bulletId);
  if (!bullet) throw new NotFoundError("bullet", bulletId);
  const updatedBullet = {
    ...bullet,
    text: newText,
    history: [...bullet.history, { text: bullet.text, at: nowISO() }],
  };
  const after = {
    ...before,
    experience: before.experience.map((e) =>
      e.id === experienceId ? { ...e, bullets: e.bullets.map((b) => (b.id === bulletId ? updatedBullet : b)) } : e
    ),
    updatedAt: nowISO(),
  };
  const audit = buildAudit(ctx, "resumeProfile.bullet", "resumeVersion", "master", before, after, "Edited a resume bullet");
  return { state: { ...state, resumeProfile: after, auditLog: [...state.auditLog, audit] } };
}

export const createResumeVersion = makeCreate<ResumeVersion>(
  "resumeVersion",
  ResumeVersionSchema,
  "resume",
  (r) => `Created resume version "${r.name}"`
);
export const updateResumeVersion = makeUpdate<ResumeVersion>(
  "resumeVersion",
  ResumeVersionSchema,
  "resume",
  (before, after) => `Updated resume version "${after.name}"`
);

// ---------------------------------------------------------------------------
// Interviews
// ---------------------------------------------------------------------------

export const createInterview = makeCreate<Interview>(
  "interview",
  InterviewSchema,
  "interview",
  (i) => `Scheduled ${i.roundType.replace("_", " ")} interview with ${i.company}`
);
export const updateInterviewFields = makeUpdate<Interview>(
  "interview",
  InterviewSchema,
  "interview",
  (before, after) => `Updated interview with ${after.company}`
);

export function addPrepTask(state: AppState, interviewId: string, text: string, ctx: CommandContext): CommandResult<Interview> {
  const existing = findEntity<Interview>(state, "interviews", interviewId);
  const prepTasks = [...existing.prepTasks, { id: newId("prep"), text, done: false }];
  return updateInterviewFields(state, interviewId, { prepTasks }, ctx);
}

export function togglePrepTask(state: AppState, interviewId: string, prepTaskId: string, ctx: CommandContext): CommandResult<Interview> {
  const existing = findEntity<Interview>(state, "interviews", interviewId);
  const prepTasks = existing.prepTasks.map((p) => (p.id === prepTaskId ? { ...p, done: !p.done } : p));
  return updateInterviewFields(state, interviewId, { prepTasks }, ctx);
}

export function addInterviewQuestion(
  state: AppState,
  interviewId: string,
  question: string,
  source: "self" | "ai_practice" | "real_interviewer",
  ctx: CommandContext
): CommandResult<Interview> {
  const existing = findEntity<Interview>(state, "interviews", interviewId);
  const questions = [...existing.questions, { id: newId("q"), question, source }];
  return updateInterviewFields(state, interviewId, { questions }, ctx);
}

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

export const createContact = makeCreate<Contact>("contact", ContactSchema, "contact", (c) => `Added contact "${c.name}"`);
export const updateContactFields = makeUpdate<Contact>(
  "contact",
  ContactSchema,
  "contact",
  (before, after) => `Updated contact "${after.name}"`
);

export function scheduleFollowUp(state: AppState, contactId: string, date: string, ctx: CommandContext): CommandResult<Contact> {
  return updateContactFields(state, contactId, { followUpDate: date }, ctx);
}

// ---------------------------------------------------------------------------
// Check-ins / weekly reviews
// ---------------------------------------------------------------------------

export const createCheckIn = makeCreate<DailyCheckIn>("checkIn", DailyCheckInSchema, "checkin", (c) => `Logged check-in for ${c.date}`);
export const createWeeklyReview = makeCreate<WeeklyReview>(
  "weeklyReview",
  WeeklyReviewSchema,
  "review",
  (r) => `Saved weekly review for week of ${r.weekStart}`
);

// ---------------------------------------------------------------------------
// Readiness snapshots (immutable historical records, no update/undo)
// ---------------------------------------------------------------------------

export function saveReadinessSnapshot(
  state: AppState,
  input: Omit<ReadinessSnapshot, "id" | "date">,
  ctx: CommandContext
): CommandResult<ReadinessSnapshot> {
  const dedup = tryDedupe<ReadinessSnapshot>(state, ctx, "readinessSnapshots");
  if (dedup) return dedup;
  const snapshot = ReadinessSnapshotSchema.parse({ ...input, id: newId("snap"), date: nowISO() });
  const audit = buildAudit(
    ctx,
    "readinessSnapshot.create",
    "readinessSnapshot",
    snapshot.id,
    null,
    snapshot,
    `Saved readiness snapshot for ${snapshot.roleId}`
  );
  return {
    state: {
      ...state,
      readinessSnapshots: [...state.readinessSnapshots, snapshot],
      auditLog: [...state.auditLog, audit],
    },
    entity: snapshot,
    audit,
    deduped: false,
  };
}

// ---------------------------------------------------------------------------
// Profile (singleton)
// ---------------------------------------------------------------------------

export function updateProfile(state: AppState, patch: Partial<Profile>, ctx: CommandContext): { state: AppState } {
  const before = state.profile;
  const after = ProfileSchema.parse({ ...before, ...patch });
  // Profile audit entries are recorded for the trail but intentionally excluded from
  // generic undo (see undoAudit) since the singleton has no stable per-field revision.
  const audit = buildAudit(ctx, "profile.update", "profile" as any, "profile", before, after, "Updated profile settings");
  return { state: { ...state, profile: after, auditLog: [...state.auditLog, audit] } };
}

// ---------------------------------------------------------------------------
// AI chat history (separate from the audit/action history)
// ---------------------------------------------------------------------------

export function clearChatHistory(state: AppState): { state: AppState } {
  return { state: { ...state, chatMessages: [] } };
}

const MAX_STORED_CHAT_MESSAGES = 200;

export function appendChatMessages(state: AppState, messages: import("@/lib/schema").ChatMessage[]): { state: AppState } {
  const combined = [...state.chatMessages, ...messages];
  const bounded = combined.length > MAX_STORED_CHAT_MESSAGES ? combined.slice(combined.length - MAX_STORED_CHAT_MESSAGES) : combined;
  return { state: { ...state, chatMessages: bounded } };
}

// ---------------------------------------------------------------------------
// Undo
// ---------------------------------------------------------------------------

export function undoAudit(state: AppState, auditId: string, ctx: CommandContext): { state: AppState; summary: string } {
  const entry = state.auditLog.find((a) => a.id === auditId);
  if (!entry) throw new NotFoundError("audit", auditId);
  if (entry.undone) throw new ValidationError("This action was already undone.");
  if (entry.trimmed) {
    throw new ValidationError(
      "This change is too far back in your history to undo automatically — its saved snapshot was cleared to free up storage. Edit the record directly instead."
    );
  }
  if (entry.entityType === ("profile" as any) || entry.entityId === "master") {
    throw new ValidationError("This kind of change can't be auto-undone. Edit the field back manually.");
  }
  const idx = state.auditLog.indexOf(entry);
  const laterConflict = state.auditLog
    .slice(idx + 1)
    .find((a) => a.entityType === entry.entityType && a.entityId === entry.entityId && !a.undone);
  if (laterConflict) {
    throw new ConflictError(entry.entityType, entry.entityId, laterConflict.after);
  }
  const arrayKey = ENTITY_ARRAY_KEYS[entry.entityType as keyof typeof ENTITY_ARRAY_KEYS];
  if (!arrayKey) throw new ValidationError(`Cannot undo changes to ${entry.entityType}.`);
  let arr = [...((state as any)[arrayKey] as Array<{ id: string }>)];
  if (entry.action.endsWith(".create")) {
    arr = arr.filter((r) => r.id !== entry.entityId);
  } else if (entry.after === null) {
    arr = arr.filter((r) => r.id !== entry.entityId);
    if (entry.before) arr = [...arr, entry.before as any];
  } else {
    arr = arr.map((r) => (r.id === entry.entityId ? (entry.before as any) : r));
  }
  const undoEntry = buildAudit(
    ctx,
    `${entry.action}.undo`,
    entry.entityType as any,
    entry.entityId,
    entry.after,
    entry.before,
    `Undid: ${entry.summary}`
  );
  const markedLog = state.auditLog.map((a) => (a.id === entry.id ? { ...a, undone: true, undoneAt: nowISO() } : a));
  return {
    state: { ...state, [arrayKey]: arr, auditLog: [...markedLog, undoEntry] },
    summary: undoEntry.summary,
  };
}
