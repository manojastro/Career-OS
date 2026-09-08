import {
  TaskStatusSchema,
  ProjectStatusSchema,
  SkillLevelSchema,
  EvidenceTypeSchema,
  JobStatusSchema,
  InterviewRoundSchema,
  RoleIdSchema,
} from "@/lib/schema";

export type JSONSchema = Record<string, unknown>;

export interface ActionDefinition {
  name: string;
  description: string;
  kind: "query" | "mutation" | "navigate";
  parameters: JSONSchema;
}

const ROLE_ENUM = RoleIdSchema.options;
const TASK_STATUS_ENUM = TaskStatusSchema.options;
const PROJECT_STATUS_ENUM = ProjectStatusSchema.options;
const SKILL_LEVEL_ENUM = SkillLevelSchema.options;
const EVIDENCE_TYPE_ENUM = EvidenceTypeSchema.options;
const JOB_STATUS_ENUM = JobStatusSchema.options;
const INTERVIEW_ROUND_ENUM = InterviewRoundSchema.options;

/**
 * The full allowlist of actions the assistant may take. Nothing outside this list is
 * ever invoked, no matter what a model or untrusted pasted text suggests — the model
 * only ever returns a name + arguments from this registry, and the client-side
 * executor is a closed switch statement over these exact names.
 *
 * Every mutation here goes through the same domain command functions the manual UI
 * forms use, so validation, evidence rules, and audit/undo behave identically either way.
 * Deletion and archival are intentionally NOT exposed to the assistant — those stay
 * manual, reversible-by-hand actions.
 */
export const ACTION_REGISTRY: ActionDefinition[] = [
  // ---- Read-only ----
  {
    name: "search_tasks",
    description: "Search the user's tasks by text, status, or due date. Use this to resolve a task name to an id before mutating it.",
    kind: "query",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Text to match against task titles (case-insensitive substring)." },
        status: { type: "string", enum: TASK_STATUS_ENUM },
        dueOn: { type: "string", description: "Exact due date, YYYY-MM-DD." },
      },
    },
  },
  {
    name: "search_projects",
    description: "Search the user's projects by name or status.",
    kind: "query",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" },
        status: { type: "string", enum: PROJECT_STATUS_ENUM },
      },
    },
  },
  {
    name: "search_skills",
    description: "Search the user's tracked skills by name.",
    kind: "query",
    parameters: { type: "object", properties: { query: { type: "string" } } },
  },
  {
    name: "search_jobs",
    description: "Search saved jobs by company, role text, or status.",
    kind: "query",
    parameters: {
      type: "object",
      properties: { query: { type: "string" }, status: { type: "string", enum: JOB_STATUS_ENUM } },
    },
  },
  {
    name: "search_interviews",
    description: "Search scheduled interviews by company.",
    kind: "query",
    parameters: { type: "object", properties: { query: { type: "string" } } },
  },
  {
    name: "search_contacts",
    description: "Search saved contacts by name or company.",
    kind: "query",
    parameters: { type: "object", properties: { query: { type: "string" } } },
  },
  {
    name: "get_today_plan",
    description: "Get today's deterministic priority plan (top tasks, available minutes, overdue count).",
    kind: "query",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "get_readiness",
    description: "Get the current deterministic readiness estimate and dimension breakdown for a role, plus the most recent saved snapshot for comparison.",
    kind: "query",
    parameters: { type: "object", properties: { roleId: { type: "string", enum: ROLE_ENUM, description: "Defaults to the user's primary role if omitted." } } },
  },
  {
    name: "get_weekly_summary",
    description: "Get a factual rollup of what happened in the last 7 days: completed tasks, check-ins, evidence added, applications made.",
    kind: "query",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "list_recent_actions",
    description: "List the most recent actions taken (by the user or the assistant) with their audit ids, for explaining history or finding something to undo.",
    kind: "query",
    parameters: { type: "object", properties: { limit: { type: "number", description: "Default 10, max 25." } } },
  },

  // ---- Mutations ----
  {
    name: "create_task",
    description: "Create a new task on the Today board.",
    kind: "mutation",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        estimateMinutes: { type: "number" },
        dueDate: { type: "string", description: "YYYY-MM-DD, already resolved from the timezone-aware 'today' given in context. Never pass relative words like 'tomorrow'." },
        priority: { type: "number", description: "1 (most important) to 5 (someday)." },
        linkedProjectId: { type: "string" },
        linkedSkillId: { type: "string" },
        requiresEvidence: { type: "boolean" },
      },
      required: ["title"],
    },
  },
  {
    name: "update_task",
    description: "Edit fields on an existing task. Resolve the id via search_tasks first.",
    kind: "mutation",
    parameters: {
      type: "object",
      properties: {
        taskId: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        estimateMinutes: { type: "number" },
        dueDate: { type: "string" },
        priority: { type: "number" },
      },
      required: ["taskId"],
    },
  },
  {
    name: "set_task_status",
    description: "Change a task's status. Marking 'done' fails if the task requires evidence and has none — add evidence first in that case.",
    kind: "mutation",
    parameters: {
      type: "object",
      properties: {
        taskId: { type: "string" },
        status: { type: "string", enum: TASK_STATUS_ENUM },
        blockerNote: { type: "string" },
      },
      required: ["taskId", "status"],
    },
  },
  {
    name: "log_task_time",
    description: "Add logged minutes worked to a task.",
    kind: "mutation",
    parameters: { type: "object", properties: { taskId: { type: "string" }, minutes: { type: "number" } }, required: ["taskId", "minutes"] },
  },
  {
    name: "move_task_date",
    description: "Move a task's due date.",
    kind: "mutation",
    parameters: { type: "object", properties: { taskId: { type: "string" }, date: { type: "string", description: "YYYY-MM-DD" } }, required: ["taskId", "date"] },
  },
  {
    name: "create_project",
    description: "Create a new portfolio project.",
    kind: "mutation",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        problem: { type: "string" },
        scope: { type: "string", enum: ["flagship", "scoped", "personal"] },
        stack: { type: "array", items: { type: "string" } },
        linkedRoles: { type: "array", items: { type: "string", enum: ROLE_ENUM } },
        nextAction: { type: "string" },
      },
      required: ["name"],
    },
  },
  {
    name: "update_project",
    description: "Edit fields on an existing project. Resolve the id via search_projects first.",
    kind: "mutation",
    parameters: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        name: { type: "string" },
        problem: { type: "string" },
        nextAction: { type: "string" },
        blockers: { type: "string" },
        deploymentRecorded: { type: "boolean" },
        validationRecorded: { type: "boolean" },
      },
      required: ["projectId"],
    },
  },
  {
    name: "set_project_status",
    description: "Move a project to a new status. Deployed requires a deployment record or linked deployment evidence; Validated requires linked test/evaluation evidence — this will fail with an explanation otherwise.",
    kind: "mutation",
    parameters: {
      type: "object",
      properties: { projectId: { type: "string" }, status: { type: "string", enum: PROJECT_STATUS_ENUM } },
      required: ["projectId", "status"],
    },
  },
  {
    name: "create_skill",
    description: "Add a new skill to track.",
    kind: "mutation",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        category: { type: "string" },
        selfLevel: { type: "string", enum: SKILL_LEVEL_ENUM },
        linkedRoles: { type: "array", items: { type: "string", enum: ROLE_ENUM } },
      },
      required: ["name"],
    },
  },
  {
    name: "update_skill",
    description: "Edit an existing skill's self-assessed level or notes. Resolve the id via search_skills first. Evidence-backed level cannot be set directly — it is derived from linked evidence.",
    kind: "mutation",
    parameters: {
      type: "object",
      properties: { skillId: { type: "string" }, selfLevel: { type: "string", enum: SKILL_LEVEL_ENUM }, notes: { type: "string" } },
      required: ["skillId"],
    },
  },
  {
    name: "create_evidence",
    description: "Record a new piece of evidence (repo link, deployment, test result, etc.) and optionally link it to a project or skill in the same call.",
    kind: "mutation",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        type: { type: "string", enum: EVIDENCE_TYPE_ENUM },
        url: { type: "string" },
        description: { type: "string" },
        linkToProjectId: { type: "string" },
        linkToSkillId: { type: "string" },
      },
      required: ["title", "type"],
    },
  },
  {
    name: "create_job",
    description: "Save a job. If jdText is provided, a gap-match against the user's real profile runs automatically and the top gaps are returned.",
    kind: "mutation",
    parameters: {
      type: "object",
      properties: {
        company: { type: "string" },
        role: { type: "string" },
        location: { type: "string" },
        jdText: { type: "string" },
        sourceUrl: { type: "string" },
      },
      required: ["company", "role"],
    },
  },
  {
    name: "run_job_match",
    description: "Recompute the gap-match for a saved job against the current profile. Resolve the id via search_jobs first.",
    kind: "mutation",
    parameters: { type: "object", properties: { jobId: { type: "string" } }, required: ["jobId"] },
  },
  {
    name: "set_job_status",
    description: "Change a saved job's application status.",
    kind: "mutation",
    parameters: { type: "object", properties: { jobId: { type: "string" }, status: { type: "string", enum: JOB_STATUS_ENUM } }, required: ["jobId", "status"] },
  },
  {
    name: "schedule_job_follow_up",
    description: "Set or change the follow-up date on a saved job.",
    kind: "mutation",
    parameters: { type: "object", properties: { jobId: { type: "string" }, date: { type: "string", description: "YYYY-MM-DD" } }, required: ["jobId", "date"] },
  },
  {
    name: "create_interview",
    description: "Schedule an interview, optionally linked to a saved job.",
    kind: "mutation",
    parameters: {
      type: "object",
      properties: {
        company: { type: "string" },
        jobId: { type: "string" },
        roundType: { type: "string", enum: INTERVIEW_ROUND_ENUM },
        scheduledAt: { type: "string", description: "Full ISO 8601 datetime, already resolved from context." },
      },
      required: ["company"],
    },
  },
  {
    name: "add_prep_task",
    description: "Add a preparation checklist item to an interview.",
    kind: "mutation",
    parameters: { type: "object", properties: { interviewId: { type: "string" }, text: { type: "string" } }, required: ["interviewId", "text"] },
  },
  {
    name: "add_interview_question",
    description: "Add a practice question to an interview record.",
    kind: "mutation",
    parameters: {
      type: "object",
      properties: { interviewId: { type: "string" }, question: { type: "string" }, source: { type: "string", enum: ["self", "ai_practice", "real_interviewer"] } },
      required: ["interviewId", "question"],
    },
  },
  {
    name: "create_contact",
    description: "Add a new contact the user has actually connected with. Never invent a person.",
    kind: "mutation",
    parameters: {
      type: "object",
      properties: { name: { type: "string" }, relationship: { type: "string" }, company: { type: "string" }, role: { type: "string" } },
      required: ["name"],
    },
  },
  {
    name: "schedule_contact_follow_up",
    description: "Set a follow-up reminder date on a contact, shown on the Today screen when the portal is open (no push notifications).",
    kind: "mutation",
    parameters: { type: "object", properties: { contactId: { type: "string" }, date: { type: "string", description: "YYYY-MM-DD" } }, required: ["contactId", "date"] },
  },
  {
    name: "create_check_in",
    description: "Save today's end-of-day check-in.",
    kind: "mutation",
    parameters: {
      type: "object",
      properties: { completedWork: { type: "string" }, blocker: { type: "string" }, nextStep: { type: "string" } },
      required: ["completedWork"],
    },
  },
  {
    name: "create_weekly_review",
    description: "Save a weekly review with up to three next-week priorities.",
    kind: "mutation",
    parameters: {
      type: "object",
      properties: { summary: { type: "string" }, nextWeekPriorities: { type: "array", items: { type: "string" } } },
      required: ["summary"],
    },
  },
  {
    name: "create_resume_version",
    description: "Create a new named resume version snapshotted from the user's approved master-profile bullets.",
    kind: "mutation",
    parameters: {
      type: "object",
      properties: { name: { type: "string" }, targetRoleId: { type: "string", enum: ROLE_ENUM }, targetJobId: { type: "string" } },
      required: ["name"],
    },
  },
  {
    name: "undo_action",
    description: "Undo one previously executed action by its audit id (from list_recent_actions). Fails safely if a later change conflicts.",
    kind: "mutation",
    parameters: { type: "object", properties: { auditId: { type: "string" } }, required: ["auditId"] },
  },

  // ---- Navigation ----
  {
    name: "open_record",
    description: "Open a specific screen and record in the portal UI for the user to see.",
    kind: "navigate",
    parameters: {
      type: "object",
      properties: {
        entityType: { type: "string", enum: ["task", "project", "skill", "job", "interview", "contact", "resume"] },
        entityId: { type: "string" },
      },
      required: ["entityType"],
    },
  },
];

export function getToolSpecs() {
  return ACTION_REGISTRY.map((a) => ({
    type: "function" as const,
    function: { name: a.name, description: a.description, parameters: a.parameters },
  }));
}

export function findAction(name: string): ActionDefinition | undefined {
  return ACTION_REGISTRY.find((a) => a.name === name);
}
