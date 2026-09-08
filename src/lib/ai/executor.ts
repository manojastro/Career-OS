import { AppState } from "@/lib/schema";
import { StoreContextValue } from "@/lib/store/StoreContext";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/domain/errors";
import { buildDailyPlan } from "@/lib/calc/planner";
import { computeReadiness } from "@/lib/calc/readiness";
import { matchJobToProfile } from "@/lib/calc/jdMatch";
import { daysBetween, todayISO, resolveRelativeDate } from "@/lib/dateTime";
import {
  createTask,
  updateTaskFields,
  setTaskStatus,
  logTaskTime,
  moveTaskDate,
  createProject,
  updateProjectFields,
  setProjectStatus,
  createSkill,
  updateSkillFields,
  createEvidence,
  linkEvidence,
  createJob,
  setJobMatchResult,
  setJobStatus,
  updateJobFields,
  createInterview,
  addPrepTask,
  addInterviewQuestion,
  createContact,
  scheduleFollowUp,
  createCheckIn,
  createWeeklyReview,
  createResumeVersion,
  undoAudit,
} from "@/lib/domain/commands";

export interface ExecResult {
  ok: boolean;
  data?: unknown;
  error?: string;
  navigate?: string;
}

function deriveOpId(base: string, suffix: string): string {
  return `${base}:${suffix}`;
}

function normalizeDate(input: unknown, tz: string): string | undefined {
  if (typeof input !== "string" || !input.trim()) return undefined;
  if (/^\d{4}-\d{2}-\d{2}/.test(input)) return input;
  return resolveRelativeDate(input, tz) ?? input;
}

function withErrorHandling(fn: () => unknown): ExecResult {
  try {
    const data = fn();
    return { ok: true, data };
  } catch (e) {
    if (e instanceof ConflictError || e instanceof ValidationError || e instanceof NotFoundError) {
      return { ok: false, error: e.message };
    }
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error." };
  }
}

/**
 * Maps allowlisted action names to real domain-service calls against the live store.
 * This is the ONLY place model output is allowed to touch app state, and it is a
 * closed switch — an unrecognized action name is refused, never dynamically dispatched.
 */
export function createExecutor(store: StoreContextValue) {
  function q<T>(fn: (state: AppState) => T): ExecResult {
    return withErrorHandling(() => fn(store.getState()));
  }

  return function execute(name: string, args: Record<string, unknown>, opId: string): ExecResult {
    const tz = store.getState().profile.timezone;
    let lastAuditId: string | undefined;
    const trackedRun: StoreContextValue["run"] = (fn) => {
      const r = store.run(fn);
      lastAuditId = (r as any)?.audit?.id;
      return r;
    };
    function mutate(fn: () => unknown): ExecResult {
      const result = withErrorHandling(fn);
      if (result.ok && lastAuditId && result.data && typeof result.data === "object") {
        result.data = { ...(result.data as object), auditId: lastAuditId };
      }
      return result;
    }

    switch (name) {
      case "search_tasks":
        return q((s) => {
          const query = (args.query as string | undefined)?.toLowerCase();
          const results = s.tasks.filter(
            (t) =>
              (!query || t.title.toLowerCase().includes(query)) &&
              (!args.status || t.status === args.status) &&
              (!args.dueOn || t.dueDate === args.dueOn)
          );
          return { count: results.length, tasks: results.map((t) => ({ id: t.id, title: t.title, status: t.status, dueDate: t.dueDate, priority: t.priority })) };
        });

      case "search_projects":
        return q((s) => {
          const query = (args.query as string | undefined)?.toLowerCase();
          const results = s.projects.filter((p) => (!query || p.name.toLowerCase().includes(query)) && (!args.status || p.status === args.status));
          return { count: results.length, projects: results.map((p) => ({ id: p.id, name: p.name, status: p.status })) };
        });

      case "search_skills":
        return q((s) => {
          const query = (args.query as string | undefined)?.toLowerCase();
          const results = s.skills.filter((sk) => !query || sk.name.toLowerCase().includes(query));
          return { count: results.length, skills: results.map((sk) => ({ id: sk.id, name: sk.name, selfLevel: sk.selfLevel })) };
        });

      case "search_jobs":
        return q((s) => {
          const query = (args.query as string | undefined)?.toLowerCase();
          const results = s.jobs.filter(
            (j) => (!query || `${j.company} ${j.role}`.toLowerCase().includes(query)) && (!args.status || j.status === args.status)
          );
          return { count: results.length, jobs: results.map((j) => ({ id: j.id, company: j.company, role: j.role, status: j.status })) };
        });

      case "search_interviews":
        return q((s) => {
          const query = (args.query as string | undefined)?.toLowerCase();
          const results = s.interviews.filter((i) => !query || i.company.toLowerCase().includes(query));
          return { count: results.length, interviews: results.map((i) => ({ id: i.id, company: i.company, roundType: i.roundType, scheduledAt: i.scheduledAt })) };
        });

      case "search_contacts":
        return q((s) => {
          const query = (args.query as string | undefined)?.toLowerCase();
          const results = s.contacts.filter((c) => !query || `${c.name} ${c.company ?? ""}`.toLowerCase().includes(query));
          return { count: results.length, contacts: results.map((c) => ({ id: c.id, name: c.name, company: c.company })) };
        });

      case "get_today_plan":
        return q((s) => {
          const plan = buildDailyPlan(s, todayISO(tz));
          return {
            availableMinutes: plan.availableMinutes,
            overdueCount: plan.overdueCount,
            priorityTasks: plan.priorityTasks.map((t) => ({ id: t.id, title: t.title, estimateMinutes: t.estimateMinutes, reason: t.urgencyReason })),
          };
        });

      case "get_readiness":
        return q((s) => {
          const roleId = (args.roleId as any) ?? s.profile.primaryRole;
          const result = computeReadiness(s, roleId);
          const prior = s.readinessSnapshots.filter((sn) => sn.roleId === roleId).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
          return { current: result, previousSnapshot: prior ?? null };
        });

      case "get_weekly_summary":
        return q((s) => {
          const today = todayISO(tz);
          const within7 = (iso?: string) => Boolean(iso) && daysBetween(iso!.slice(0, 10), today) <= 7;
          return {
            tasksCompleted: s.tasks.filter((t) => t.status === "done" && within7(t.completedAt)).length,
            checkIns: s.checkIns.filter((c) => within7(c.date)).length,
            evidenceAdded: s.evidence.filter((e) => within7(e.createdAt)).length,
            applicationsMade: s.jobs.filter((j) => within7(j.appliedAt)).length,
          };
        });

      case "list_recent_actions":
        return q((s) => {
          const limit = Math.min(Number(args.limit) || 10, 25);
          return [...s.auditLog]
            .reverse()
            .slice(0, limit)
            .map((a) => ({ id: a.id, at: a.at, actor: a.actor, action: a.action, summary: a.summary, undone: a.undone }));
        });

      case "create_task":
        return mutate(() => {
          const result = trackedRun((s) =>
            createTask(
              s,
              {
                title: args.title,
                description: args.description,
                estimateMinutes: args.estimateMinutes,
                dueDate: normalizeDate(args.dueDate, tz),
                priority: args.priority,
                linkedProjectId: args.linkedProjectId,
                linkedSkillId: args.linkedSkillId,
                requiresEvidence: args.requiresEvidence,
              },
              { actor: "assistant", opId }
            )
          );
          return { taskId: result.entity.id, title: result.entity.title, dueDate: result.entity.dueDate };
        });

      case "update_task":
        return mutate(() => {
          const { taskId, ...patch } = args as any;
          const result = trackedRun((s) => updateTaskFields(s, taskId, patch, { actor: "assistant", opId }));
          return { taskId: result.entity.id };
        });

      case "set_task_status":
        return mutate(() => {
          const result = trackedRun((s) => setTaskStatus(s, args.taskId as string, args.status as any, { actor: "assistant", opId }, { blockerNote: args.blockerNote as string }));
          return { taskId: result.entity.id, status: result.entity.status };
        });

      case "log_task_time":
        return mutate(() => {
          const result = trackedRun((s) => logTaskTime(s, args.taskId as string, Number(args.minutes), { actor: "assistant", opId }));
          return { taskId: result.entity.id, loggedMinutes: result.entity.loggedMinutes };
        });

      case "move_task_date":
        return mutate(() => {
          const date = normalizeDate(args.date, tz)!;
          const result = trackedRun((s) => moveTaskDate(s, args.taskId as string, date, { actor: "assistant", opId }));
          return { taskId: result.entity.id, resolvedDate: date };
        });

      case "create_project":
        return mutate(() => {
          const result = trackedRun((s) =>
            createProject(s, { name: args.name, problem: args.problem, scope: args.scope, stack: args.stack, linkedRoles: args.linkedRoles, nextAction: args.nextAction, status: "idea" }, { actor: "assistant", opId })
          );
          return { projectId: result.entity.id, name: result.entity.name };
        });

      case "update_project":
        return mutate(() => {
          const { projectId, ...patch } = args as any;
          const result = trackedRun((s) => updateProjectFields(s, projectId, patch, { actor: "assistant", opId }));
          return { projectId: result.entity.id };
        });

      case "set_project_status":
        return mutate(() => {
          const result = trackedRun((s) => setProjectStatus(s, args.projectId as string, args.status as any, { actor: "assistant", opId }));
          return { projectId: result.entity.id, status: result.entity.status };
        });

      case "create_skill":
        return mutate(() => {
          const result = trackedRun((s) => createSkill(s, { name: args.name, category: args.category, selfLevel: args.selfLevel, linkedRoles: args.linkedRoles }, { actor: "assistant", opId }));
          return { skillId: result.entity.id, name: result.entity.name };
        });

      case "update_skill":
        return mutate(() => {
          const { skillId, ...patch } = args as any;
          const result = trackedRun((s) => updateSkillFields(s, skillId, patch, { actor: "assistant", opId }));
          return { skillId: result.entity.id };
        });

      case "create_evidence":
        return mutate(() => {
          const created = trackedRun((s) => createEvidence(s, { title: args.title, type: args.type, url: args.url, description: args.description }, { actor: "assistant", opId }));
          if (args.linkToProjectId || args.linkToSkillId) {
            trackedRun((s) =>
              linkEvidence(s, created.entity.id, { projectId: args.linkToProjectId as string, skillId: args.linkToSkillId as string }, { actor: "assistant", opId: deriveOpId(opId, "link") })
            );
          }
          return { evidenceId: created.entity.id, title: created.entity.title };
        });

      case "create_job":
        return mutate(() => {
          const created = trackedRun((s) =>
            createJob(
              s,
              {
                company: args.company,
                role: args.role,
                location: args.location,
                sourceUrl: args.sourceUrl,
                jdText: args.jdText ?? "",
                savedAt: todayISO(tz),
                status: "saved",
                statusHistory: [{ status: "saved" as const, at: new Date().toISOString() }],
              },
              { actor: "assistant", opId }
            )
          );
          let match = null;
          if (args.jdText && String(args.jdText).trim().length > 0) {
            match = matchJobToProfile(created.entity, store.getState());
            trackedRun((s) => setJobMatchResult(s, created.entity.id, match!, { actor: "assistant", opId: deriveOpId(opId, "match") }));
          }
          return {
            jobId: created.entity.id,
            company: created.entity.company,
            role: created.entity.role,
            jdCompleteness: match?.jdCompleteness,
            topGaps: match?.topGaps ?? [],
            recommendation: match?.recommendation,
          };
        });

      case "run_job_match":
        return mutate(() => {
          const job = store.getState().jobs.find((j) => j.id === args.jobId);
          if (!job) throw new NotFoundError("job", args.jobId as string);
          const match = matchJobToProfile(job, store.getState());
          trackedRun((s) => setJobMatchResult(s, job.id, match, { actor: "assistant", opId }));
          return { jobId: job.id, jdCompleteness: match.jdCompleteness, topGaps: match.topGaps, recommendation: match.recommendation };
        });

      case "set_job_status":
        return mutate(() => {
          const result = trackedRun((s) => setJobStatus(s, args.jobId as string, args.status as any, { actor: "assistant", opId }));
          return { jobId: result.entity.id, status: result.entity.status };
        });

      case "schedule_job_follow_up":
        return mutate(() => {
          const date = normalizeDate(args.date, tz)!;
          const result = trackedRun((s) => updateJobFields(s, args.jobId as string, { followUpDate: date }, { actor: "assistant", opId }));
          return { jobId: result.entity.id, resolvedDate: date };
        });

      case "create_interview":
        return mutate(() => {
          const scheduledAt = typeof args.scheduledAt === "string" ? args.scheduledAt : undefined;
          const result = trackedRun((s) => createInterview(s, { company: args.company, jobId: args.jobId, roundType: args.roundType, scheduledAt }, { actor: "assistant", opId }));
          return { interviewId: result.entity.id, company: result.entity.company, scheduledAt: result.entity.scheduledAt };
        });

      case "add_prep_task":
        return mutate(() => {
          const result = trackedRun((s) => addPrepTask(s, args.interviewId as string, args.text as string, { actor: "assistant", opId }));
          return { interviewId: result.entity.id };
        });

      case "add_interview_question":
        return mutate(() => {
          const result = trackedRun((s) =>
            addInterviewQuestion(s, args.interviewId as string, args.question as string, (args.source as any) ?? "self", { actor: "assistant", opId })
          );
          return { interviewId: result.entity.id };
        });

      case "create_contact":
        return mutate(() => {
          const result = trackedRun((s) => createContact(s, { name: args.name, relationship: args.relationship ?? "", company: args.company, role: args.role }, { actor: "assistant", opId }));
          return { contactId: result.entity.id, name: result.entity.name };
        });

      case "schedule_contact_follow_up":
        return mutate(() => {
          const date = normalizeDate(args.date, tz)!;
          const result = trackedRun((s) => scheduleFollowUp(s, args.contactId as string, date, { actor: "assistant", opId }));
          return { contactId: result.entity.id, resolvedDate: date };
        });

      case "create_check_in":
        return mutate(() => {
          const result = trackedRun((s) =>
            createCheckIn(s, { date: todayISO(tz), completedWork: args.completedWork, blocker: args.blocker, nextStep: args.nextStep }, { actor: "assistant", opId })
          );
          return { checkInId: result.entity.id };
        });

      case "create_weekly_review":
        return mutate(() => {
          const result = trackedRun((s) =>
            createWeeklyReview(s, { weekStart: todayISO(tz), summary: args.summary as string, nextWeekPriorities: (args.nextWeekPriorities as string[]) ?? [] }, { actor: "assistant", opId })
          );
          return { weeklyReviewId: result.entity.id };
        });

      case "create_resume_version":
        return mutate(() => {
          const profile = store.getState().resumeProfile;
          const bulletsSnapshot = profile.experience.map((exp) => {
            const approved = exp.bullets.filter((b) => b.isApprovedOriginal);
            const chosen = approved.length > 0 ? approved : exp.bullets;
            return { employer: exp.employer, title: exp.title, bullets: chosen.map((b) => b.text).filter(Boolean) };
          });
          const result = trackedRun((s) =>
            createResumeVersion(
              s,
              { name: args.name, targetRoleId: args.targetRoleId, targetJobId: args.targetJobId, summary: profile.summary, bulletsSnapshot, linkedEvidenceIds: [] },
              { actor: "assistant", opId }
            )
          );
          return { resumeVersionId: result.entity.id, name: result.entity.name };
        });

      case "undo_action":
        return mutate(() => {
          const result = trackedRun((s) => undoAudit(s, args.auditId as string, { actor: "assistant" }));
          return { summary: result.summary };
        });

      case "open_record":
        return { ok: true, data: { entityType: args.entityType, entityId: args.entityId }, navigate: routeFor(args.entityType as string, args.entityId as string | undefined) };

      default:
        return { ok: false, error: `Unknown action "${name}".` };
    }
  };
}

function routeFor(entityType: string, _entityId?: string): string {
  switch (entityType) {
    case "task":
      return "/";
    case "project":
    case "skill":
      return "/build";
    case "job":
    case "resume":
    case "interview":
    case "contact":
      return "/opportunities";
    default:
      return "/";
  }
}
