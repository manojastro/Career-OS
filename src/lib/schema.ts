import { z } from "zod";

/**
 * Single source of truth for the persisted data shape.
 * Every record kept in browser storage is validated against these schemas
 * on read and write so malformed or tampered data never silently corrupts state.
 */

export const CURRENT_SCHEMA_VERSION = 1;

export const RoleIdSchema = z.enum([
  "ai_genai_engineer",
  "agentic_ai_engineer",
  "aiops_engineer",
  "forward_deployed_engineer",
  "cloud_ai_engineer",
  "ai_security_engineer",
  "ai_solutions_engineer",
  "ai_solutions_architect",
]);
export type RoleId = z.infer<typeof RoleIdSchema>;

export const ROLE_LABELS: Record<RoleId, string> = {
  ai_genai_engineer: "AI / GenAI Engineer",
  agentic_ai_engineer: "Agentic AI Engineer",
  aiops_engineer: "AIOps Engineer",
  forward_deployed_engineer: "Forward-Deployed / AI Deployment Engineer",
  cloud_ai_engineer: "Cloud AI Engineer",
  ai_security_engineer: "AI Security Engineer",
  ai_solutions_engineer: "AI Solutions Engineer",
  ai_solutions_architect: "AI Solutions Architect",
};

export const WeekdaySchema = z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
export type Weekday = z.infer<typeof WeekdaySchema>;

export const DayAvailabilitySchema = z.object({
  hours: z.number().min(0).max(16),
  dayType: z.enum(["office", "wfh", "weekend"]),
});
export type DayAvailability = z.infer<typeof DayAvailabilitySchema>;

export const ProfileSchema = z.object({
  name: z.string().default(""),
  background: z
    .string()
    .default("Experienced IT Operations / Service Desk professional transitioning into AI engineering."),
  totalYearsExperience: z.number().min(0).default(8.5),
  aiYearsExperience: z.number().min(0).default(0),
  currentCompensationLPA: z.number().min(0).default(11),
  targetCompensationMinLPA: z.number().min(0).default(20),
  targetCompensationMaxLPA: z.number().min(0).default(35),
  planningHorizonDays: z.number().min(1).default(80),
  planStartDate: z.string().default(() => new Date().toISOString().slice(0, 10)),
  preferredLocations: z
    .array(z.string())
    .default(["Coimbatore", "Kochi", "Bengaluru", "Hyderabad", "Chennai", "Remote"]),
  timezone: z.string().default("Asia/Kolkata"),
  weeklyAvailability: z
    .record(WeekdaySchema, DayAvailabilitySchema)
    .default({
      mon: { hours: 5, dayType: "office" },
      tue: { hours: 5, dayType: "office" },
      wed: { hours: 5, dayType: "office" },
      thu: { hours: 5, dayType: "office" },
      fri: { hours: 5, dayType: "office" },
      sat: { hours: 5, dayType: "weekend" },
      sun: { hours: 5, dayType: "weekend" },
    }),
  primaryRole: RoleIdSchema.default("ai_genai_engineer"),
  secondaryRole: RoleIdSchema.nullable().default("agentic_ai_engineer"),
  portfolioLimit: z.number().min(1).default(3),
  onboardingComplete: z.boolean().default(false),
});
export type Profile = z.infer<typeof ProfileSchema>;

export const TaskStatusSchema = z.enum(["todo", "in_progress", "done", "blocked"]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskItemSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  estimateMinutes: z.number().min(5).default(30),
  dueDate: z.string().optional(),
  status: TaskStatusSchema.default("todo"),
  priority: z.number().min(1).max(5).default(3),
  linkedSkillId: z.string().optional(),
  linkedProjectId: z.string().optional(),
  linkedJobId: z.string().optional(),
  linkedInterviewId: z.string().optional(),
  requiresEvidence: z.boolean().default(false),
  evidenceIds: z.array(z.string()).default([]),
  blockerNote: z.string().optional(),
  loggedMinutes: z.number().min(0).default(0),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().optional(),
  source: z.enum(["manual", "ai", "system"]).default("manual"),
});
export type TaskItem = z.infer<typeof TaskItemSchema>;

export const ProjectStatusSchema = z.enum([
  "idea",
  "planned",
  "building",
  "deployed",
  "validated",
  "archived",
]);
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

export const MilestoneSchema = z.object({
  id: z.string(),
  title: z.string(),
  done: z.boolean().default(false),
  dueDate: z.string().optional(),
});

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  problem: z.string().default(""),
  targetUser: z.string().default(""),
  businessValue: z.string().default(""),
  scope: z.enum(["flagship", "scoped", "personal"]).default("scoped"),
  architectureNotes: z.string().default(""),
  stack: z.array(z.string()).default([]),
  linkedRoles: z.array(RoleIdSchema).default([]),
  status: ProjectStatusSchema.default("idea"),
  milestones: z.array(MilestoneSchema).default([]),
  nextAction: z.string().default(""),
  blockers: z.string().optional(),
  evidenceIds: z.array(z.string()).default([]),
  deploymentRecorded: z.boolean().default(false),
  validationRecorded: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
  archivedAt: z.string().optional(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const SkillLevelSchema = z.enum(["not_started", "learning", "practiced", "demonstrated"]);
export type SkillLevel = z.infer<typeof SkillLevelSchema>;

export const SkillResourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(["course", "certification", "resource"]),
  url: z.string().optional(),
  deadline: z.string().optional(),
  completed: z.boolean().default(false),
});

export const SkillSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  category: z.string().optional(),
  selfLevel: SkillLevelSchema.default("not_started"),
  linkedRoles: z.array(RoleIdSchema).default([]),
  resources: z.array(SkillResourceSchema).default([]),
  evidenceIds: z.array(z.string()).default([]),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Skill = z.infer<typeof SkillSchema>;

export const EvidenceTypeSchema = z.enum([
  "repository",
  "deployment",
  "demo_recording",
  "evaluation_result",
  "test_result",
  "performance_measurement",
  "cost_measurement",
  "architecture_note",
  "case_study",
  "certificate",
  "assessment",
  "other",
]);
export type EvidenceType = z.infer<typeof EvidenceTypeSchema>;

export const EvidenceSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  type: EvidenceTypeSchema,
  url: z.string().optional(),
  description: z.string().optional(),
  verification: z.enum(["self_reported", "machine_checked"]).default("self_reported"),
  linkedProjectIds: z.array(z.string()).default([]),
  linkedSkillIds: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Evidence = z.infer<typeof EvidenceSchema>;

export const JobStatusSchema = z.enum([
  "saved",
  "preparing",
  "applied",
  "screening",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
  "closed",
]);
export type JobStatus = z.infer<typeof JobStatusSchema>;

export const RequirementMatchSchema = z.object({
  requirement: z.string(),
  excerpt: z.string(),
  status: z.enum(["matched", "partial", "missing", "unknown"]),
  isHardConstraint: z.boolean().default(false),
  evidenceRefs: z
    .array(
      z.object({
        type: z.enum(["skill", "project", "evidence"]),
        id: z.string(),
        label: z.string(),
      })
    )
    .default([]),
});

export const JdMatchResultSchema = z.object({
  computedAt: z.string(),
  jdCompleteness: z.enum(["complete", "partial", "insufficient"]),
  requirements: z.array(RequirementMatchSchema),
  topGaps: z.array(z.string()),
  suggestedResumeVersionId: z.string().optional(),
  recommendation: z.enum(["apply_now", "tailor_then_apply", "build_evidence_first"]),
  recommendationOverride: z.enum(["apply_now", "tailor_then_apply", "build_evidence_first"]).optional(),
});
export type JdMatchResult = z.infer<typeof JdMatchResultSchema>;

export const JobSchema = z.object({
  id: z.string(),
  company: z.string().min(1),
  role: z.string().min(1),
  location: z.string().optional(),
  workMode: z.enum(["remote", "hybrid", "onsite"]).optional(),
  sourceUrl: z.string().optional(),
  savedAt: z.string(),
  postingDate: z.string().optional(),
  salaryText: z.string().optional(),
  jdText: z.string().default(""),
  status: JobStatusSchema.default("saved"),
  statusHistory: z.array(z.object({ status: JobStatusSchema, at: z.string() })).default([]),
  appliedAt: z.string().optional(),
  nextAction: z.string().optional(),
  followUpDate: z.string().optional(),
  matchResult: JdMatchResultSchema.optional(),
  resumeVersionId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Job = z.infer<typeof JobSchema>;

export const ResumeBulletSchema = z.object({
  id: z.string(),
  text: z.string(),
  isApprovedOriginal: z.boolean().default(false),
  needsMetric: z.boolean().default(false),
  history: z.array(z.object({ text: z.string(), at: z.string() })).default([]),
});

export const ExperienceEntrySchema = z.object({
  id: z.string(),
  employer: z.string(),
  title: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  bullets: z.array(ResumeBulletSchema).default([]),
});

export const ResumeMasterProfileSchema = z.object({
  headline: z.string().default(""),
  summary: z.string().default(""),
  experience: z.array(ExperienceEntrySchema).default([]),
  educationCerts: z.array(z.string()).default([]),
  skillsList: z.array(z.string()).default([]),
  updatedAt: z.string(),
});
export type ResumeMasterProfile = z.infer<typeof ResumeMasterProfileSchema>;

export const ResumeVersionSchema = z.object({
  id: z.string(),
  name: z.string(),
  targetRoleId: RoleIdSchema.optional(),
  targetJobId: z.string().optional(),
  summary: z.string().default(""),
  bulletsSnapshot: z
    .array(z.object({ employer: z.string(), title: z.string(), bullets: z.array(z.string()) }))
    .default([]),
  linkedEvidenceIds: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ResumeVersion = z.infer<typeof ResumeVersionSchema>;

export const InterviewRoundSchema = z.enum([
  "phone_screen",
  "technical",
  "system_design",
  "behavioral",
  "onsite",
  "final",
  "other",
]);

export const InterviewSchema = z.object({
  id: z.string(),
  jobId: z.string().optional(),
  company: z.string().min(1),
  roundType: InterviewRoundSchema.default("other"),
  scheduledAt: z.string().optional(),
  prepTasks: z.array(z.object({ id: z.string(), text: z.string(), done: z.boolean().default(false) })).default([]),
  questions: z
    .array(
      z.object({
        id: z.string(),
        question: z.string(),
        practiceAnswer: z.string().optional(),
        source: z.enum(["self", "ai_practice", "real_interviewer"]).default("self"),
        feedback: z.string().optional(),
      })
    )
    .default([]),
  weaknesses: z.array(z.string()).default([]),
  feedback: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Interview = z.infer<typeof InterviewSchema>;

export const ContactSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  relationship: z.string().default(""),
  company: z.string().optional(),
  role: z.string().optional(),
  profileUrl: z.string().optional(),
  notes: z.string().optional(),
  lastContactDate: z.string().optional(),
  followUpDate: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Contact = z.infer<typeof ContactSchema>;

export const DailyCheckInSchema = z.object({
  id: z.string(),
  date: z.string(),
  completedWork: z.string(),
  blocker: z.string().optional(),
  nextStep: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type DailyCheckIn = z.infer<typeof DailyCheckInSchema>;

export const WeeklyReviewSchema = z.object({
  id: z.string(),
  weekStart: z.string(),
  summary: z.string(),
  nextWeekPriorities: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type WeeklyReview = z.infer<typeof WeeklyReviewSchema>;

export const ReadinessDimensionResultSchema = z.object({
  key: z.enum(["skills", "projects", "jdMatch", "interviewPractice"]),
  label: z.string(),
  weight: z.number(),
  score: z.number().nullable(),
  status: z.enum(["assessed", "not_enough_evidence"]),
  evidenceRefs: z.array(z.string()).default([]),
  explanation: z.string(),
});

export const ReadinessSnapshotSchema = z.object({
  id: z.string(),
  date: z.string(),
  roleId: RoleIdSchema,
  rubricVersion: z.string(),
  overallScore: z.number().nullable(),
  overallStatus: z.enum(["assessed", "not_enough_evidence"]),
  dimensions: z.array(ReadinessDimensionResultSchema),
  datasetCounts: z.record(z.string(), z.number()).default({}),
});
export type ReadinessSnapshot = z.infer<typeof ReadinessSnapshotSchema>;

export const AuditEntrySchema = z.object({
  id: z.string(),
  at: z.string(),
  actor: z.enum(["user", "assistant"]),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  before: z.unknown().nullable(),
  after: z.unknown().nullable(),
  opId: z.string().optional(),
  summary: z.string(),
  undone: z.boolean().default(false),
  undoneAt: z.string().optional(),
  /** True once before/after snapshots were dropped to reclaim storage; the entry stays
   * readable as history but can no longer be auto-undone. */
  trimmed: z.boolean().default(false),
});
export type AuditEntry = z.infer<typeof AuditEntrySchema>;

export const ChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  actionsSummary: z.array(z.string()).default([]),
  status: z.enum(["pending", "success", "error"]).optional(),
  createdAt: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const RUBRIC_WEIGHTS = {
  skills: 0.25,
  projects: 0.35,
  jdMatch: 0.2,
  interviewPractice: 0.2,
} as const;
export const RUBRIC_VERSION = "v1";

export const AppStateSchema = z.object({
  schemaVersion: z.number().default(CURRENT_SCHEMA_VERSION),
  profile: ProfileSchema,
  tasks: z.array(TaskItemSchema).default([]),
  projects: z.array(ProjectSchema).default([]),
  skills: z.array(SkillSchema).default([]),
  evidence: z.array(EvidenceSchema).default([]),
  jobs: z.array(JobSchema).default([]),
  resumeProfile: ResumeMasterProfileSchema,
  resumeVersions: z.array(ResumeVersionSchema).default([]),
  interviews: z.array(InterviewSchema).default([]),
  contacts: z.array(ContactSchema).default([]),
  checkIns: z.array(DailyCheckInSchema).default([]),
  weeklyReviews: z.array(WeeklyReviewSchema).default([]),
  readinessSnapshots: z.array(ReadinessSnapshotSchema).default([]),
  auditLog: z.array(AuditEntrySchema).default([]),
  chatMessages: z.array(ChatMessageSchema).default([]),
  meta: z
    .object({
      createdAt: z.string(),
      lastOpenedAt: z.string(),
      lastWriteId: z.string().optional(),
    })
    .default({ createdAt: new Date().toISOString(), lastOpenedAt: new Date().toISOString() }),
});
export type AppState = z.infer<typeof AppStateSchema>;
