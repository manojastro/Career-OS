import { AppState, ROLE_LABELS } from "@/lib/schema";
import { buildDailyPlan } from "@/lib/calc/planner";
import { todayISO, weekdayOf, formatDateDisplay } from "@/lib/dateTime";

const COMP_KEYWORDS = /compensation|salary|pay\b|ctc|package|negotiat/i;

function matchesQuery(text: string, tokens: string[]): boolean {
  const lower = text.toLowerCase();
  return tokens.some((t) => t.length > 2 && lower.includes(t));
}

/**
 * Builds the minimum relevant slice of the user's data to send to the LLM for one turn.
 * Deliberately excludes private fields (compensation, contact notes) unless the message
 * is actually about them, per the "send only the minimum relevant information" rule.
 */
export function buildContext(state: AppState, userMessage: string) {
  const today = todayISO(state.profile.timezone);
  const tokens = userMessage
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const plan = buildDailyPlan(state, today);
  const mentionsComp = COMP_KEYWORDS.test(userMessage);

  const relevantTasks = state.tasks.filter((t) => matchesQuery(t.title, tokens)).slice(0, 5);
  const relevantProjects = state.projects.filter((p) => matchesQuery(p.name, tokens)).slice(0, 5);
  const relevantSkills = state.skills.filter((s) => matchesQuery(s.name, tokens)).slice(0, 5);
  const relevantJobs = state.jobs.filter((j) => matchesQuery(`${j.company} ${j.role}`, tokens)).slice(0, 5);
  const relevantContacts = state.contacts.filter((c) => matchesQuery(`${c.name} ${c.company ?? ""}`, tokens)).slice(0, 5);

  return {
    today,
    todayWeekday: weekdayOf(today, state.profile.timezone),
    todayDisplay: formatDateDisplay(today),
    timezone: state.profile.timezone,
    profile: {
      name: state.profile.name || undefined,
      background: state.profile.background,
      totalYearsExperience: state.profile.totalYearsExperience,
      aiYearsExperience: state.profile.aiYearsExperience,
      targetCompensationRange: `₹${state.profile.targetCompensationMinLPA}-${state.profile.targetCompensationMaxLPA} LPA (personal aspiration, not guaranteed)`,
      currentCompensationLPA: mentionsComp ? state.profile.currentCompensationLPA : undefined,
      primaryRole: ROLE_LABELS[state.profile.primaryRole],
      secondaryRole: state.profile.secondaryRole ? ROLE_LABELS[state.profile.secondaryRole] : undefined,
      preferredLocations: state.profile.preferredLocations,
      planningHorizonDays: state.profile.planningHorizonDays,
      planStartDate: state.profile.planStartDate,
    },
    todayPlan: {
      availableMinutes: plan.availableMinutes,
      priorityTasks: plan.priorityTasks.map((t) => ({ id: t.id, title: t.title, status: t.status, estimateMinutes: t.estimateMinutes, dueDate: t.dueDate, reason: t.urgencyReason })),
      overdueCount: plan.overdueCount,
    },
    counts: {
      tasksOpen: state.tasks.filter((t) => t.status !== "done").length,
      projectsActive: state.projects.filter((p) => p.status !== "archived").length,
      skills: state.skills.length,
      jobsSaved: state.jobs.length,
      jobsApplied: state.jobs.filter((j) => j.appliedAt).length,
      interviewsUpcoming: state.interviews.filter((i) => i.scheduledAt && i.scheduledAt.slice(0, 10) >= today).length,
      contactsWithFollowUpDue: state.contacts.filter((c) => c.followUpDate && c.followUpDate <= today).length,
    },
    possiblyRelevantRecords: {
      tasks: relevantTasks.map((t) => ({ id: t.id, title: t.title, status: t.status })),
      projects: relevantProjects.map((p) => ({ id: p.id, name: p.name, status: p.status })),
      skills: relevantSkills.map((s) => ({ id: s.id, name: s.name, selfLevel: s.selfLevel })),
      jobs: relevantJobs.map((j) => ({ id: j.id, company: j.company, role: j.role, status: j.status })),
      contacts: relevantContacts.map((c) => ({ id: c.id, name: c.name, company: c.company, notes: matchesQuery(userMessage, [c.name.toLowerCase()]) ? c.notes : undefined })),
    },
  };
}

export type AssistantContextPayload = ReturnType<typeof buildContext>;
