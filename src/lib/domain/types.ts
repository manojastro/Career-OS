import { AppState, AuditEntry } from "@/lib/schema";

export interface CommandContext {
  actor: "user" | "assistant";
  /** Idempotency key. Replaying the same opId returns the cached result instead of re-applying. */
  opId?: string;
}

export interface CommandResult<T> {
  state: AppState;
  entity: T;
  audit: AuditEntry;
  /** true when this call was a replay of an already-applied opId (no new mutation happened). */
  deduped: boolean;
}

export const ENTITY_ARRAY_KEYS = {
  task: "tasks",
  project: "projects",
  skill: "skills",
  evidence: "evidence",
  job: "jobs",
  resumeVersion: "resumeVersions",
  interview: "interviews",
  contact: "contacts",
  checkIn: "checkIns",
  weeklyReview: "weeklyReviews",
  readinessSnapshot: "readinessSnapshots",
} as const;

export type EntityKey = keyof typeof ENTITY_ARRAY_KEYS;
export type EntityArrayKey = (typeof ENTITY_ARRAY_KEYS)[EntityKey];
