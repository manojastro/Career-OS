import { AppState, RoleId, RUBRIC_WEIGHTS, RUBRIC_VERSION } from "@/lib/schema";
import { computeSkillEvidenceLevel, evidenceMap } from "@/lib/calc/skills";
import { daysBetween, todayISO } from "@/lib/dateTime";

export type DimensionKey = "skills" | "projects" | "jdMatch" | "interviewPractice";

export interface DimensionResult {
  key: DimensionKey;
  label: string;
  weight: number;
  score: number | null;
  status: "assessed" | "not_enough_evidence";
  evidenceRefs: string[];
  explanation: string;
}

export interface ReadinessResult {
  roleId: RoleId;
  rubricVersion: string;
  overallScore: number | null;
  overallStatus: "assessed" | "not_enough_evidence";
  dimensions: DimensionResult[];
  datasetCounts: Record<string, number>;
}

const PROJECT_STATUS_SCORE: Record<string, number> = {
  idea: 0,
  planned: 10,
  building: 30,
  deployed: 70,
  validated: 100,
  archived: 0,
};

function skillsDimension(state: AppState, roleId: RoleId): DimensionResult {
  const linked = state.skills.filter((s) => s.linkedRoles.includes(roleId));
  const label = "Role-relevant skills backed by evidence";
  const weight = RUBRIC_WEIGHTS.skills;
  if (linked.length === 0) {
    return {
      key: "skills",
      label,
      weight,
      score: null,
      status: "not_enough_evidence",
      evidenceRefs: [],
      explanation: `No skills are linked to this role yet. Link at least one skill to "${roleId}" and add evidence to it.`,
    };
  }
  const eMap = evidenceMap(state.evidence);
  let points = 0;
  const evidenceRefs: string[] = [];
  for (const skill of linked) {
    const level = computeSkillEvidenceLevel(skill, eMap);
    if (level === "demonstrated") {
      points += 1;
      evidenceRefs.push(skill.id);
    } else if (level === "practiced") {
      points += 0.5;
      evidenceRefs.push(skill.id);
    }
  }
  const score = Math.round((points / linked.length) * 100);
  return {
    key: "skills",
    label,
    weight,
    score,
    status: "assessed",
    evidenceRefs,
    explanation: `Based on ${linked.length} skill${linked.length === 1 ? "" : "s"} linked to this role. Demonstrated counts full, Practiced counts half, Learning/Not started count zero.`,
  };
}

function projectsDimension(state: AppState, roleId: RoleId): DimensionResult {
  const label = "Project deployment and validation evidence";
  const weight = RUBRIC_WEIGHTS.projects;
  const active = state.projects.filter((p) => p.status !== "archived");
  const relevant = active.filter((p) => p.linkedRoles.length === 0 || p.linkedRoles.includes(roleId));
  if (relevant.length === 0) {
    return {
      key: "projects",
      label,
      weight,
      score: null,
      status: "not_enough_evidence",
      evidenceRefs: [],
      explanation: "No active projects yet. Add a project and move it from Idea toward Deployed/Validated.",
    };
  }
  const total = relevant.reduce((sum, p) => sum + (PROJECT_STATUS_SCORE[p.status] ?? 0), 0);
  const score = Math.round(total / relevant.length);
  return {
    key: "projects",
    label,
    weight,
    score,
    status: "assessed",
    evidenceRefs: relevant.map((p) => p.id),
    explanation: `Based on ${relevant.length} project${relevant.length === 1 ? "" : "s"}: Idea=0, Planned=10, Building=30, Deployed=70, Validated=100, averaged.`,
  };
}

function jdMatchDimension(state: AppState): DimensionResult {
  const label = "Match to saved relevant job descriptions";
  const weight = RUBRIC_WEIGHTS.jdMatch;
  if (state.jobs.length === 0) {
    return {
      key: "jdMatch",
      label,
      weight,
      score: null,
      status: "not_enough_evidence",
      evidenceRefs: [],
      explanation: "No jobs saved yet. Paste a JD in Opportunities to compare it against your profile.",
    };
  }
  const matched = state.jobs.filter((j) => j.matchResult);
  if (matched.length === 0) {
    return {
      key: "jdMatch",
      label,
      weight,
      score: null,
      status: "not_enough_evidence",
      evidenceRefs: [],
      explanation: `${state.jobs.length} job(s) saved but none matched against your profile yet. Open a job to run the match.`,
    };
  }
  let sum = 0;
  for (const job of matched) {
    const reqs = job.matchResult!.requirements;
    const known = reqs.filter((r) => r.status !== "unknown");
    if (known.length === 0) continue;
    const matchedCount = known.filter((r) => r.status === "matched").length;
    const partialCount = known.filter((r) => r.status === "partial").length;
    sum += ((matchedCount + 0.5 * partialCount) / known.length) * 100;
  }
  const score = Math.round(sum / matched.length);
  return {
    key: "jdMatch",
    label,
    weight,
    score,
    status: "assessed",
    evidenceRefs: matched.map((j) => j.id),
    explanation: `Based on ${matched.length} matched job description${matched.length === 1 ? "" : "s"} out of ${state.jobs.length} saved.`,
  };
}

function interviewPracticeDimension(state: AppState): DimensionResult {
  const label = "Interview practice and feedback";
  const weight = RUBRIC_WEIGHTS.interviewPractice;
  if (state.interviews.length === 0) {
    return {
      key: "interviewPractice",
      label,
      weight,
      score: null,
      status: "not_enough_evidence",
      evidenceRefs: [],
      explanation: "No interviews or practice sessions logged yet.",
    };
  }
  let totalPrep = 0;
  let donePrep = 0;
  let questionCount = 0;
  for (const iv of state.interviews) {
    totalPrep += iv.prepTasks.length;
    donePrep += iv.prepTasks.filter((p) => p.done).length;
    questionCount += iv.questions.length;
  }
  const completionRatio = totalPrep > 0 ? donePrep / totalPrep : 0;
  const questionScore = Math.min(questionCount, 10) / 10;
  const score = Math.round(completionRatio * 60 + questionScore * 40);
  return {
    key: "interviewPractice",
    label,
    weight,
    score,
    status: "assessed",
    evidenceRefs: state.interviews.map((i) => i.id),
    explanation: `Based on ${state.interviews.length} interview record(s): ${donePrep}/${totalPrep} prep tasks done, ${questionCount} practice question(s) logged.`,
  };
}

export function computeReadiness(state: AppState, roleId: RoleId): ReadinessResult {
  const dimensions = [
    skillsDimension(state, roleId),
    projectsDimension(state, roleId),
    jdMatchDimension(state),
    interviewPracticeDimension(state),
  ];
  const allAssessed = dimensions.every((d) => d.status === "assessed");
  const overallScore = allAssessed
    ? Math.round(dimensions.reduce((sum, d) => sum + (d.score ?? 0) * d.weight, 0))
    : null;
  return {
    roleId,
    rubricVersion: RUBRIC_VERSION,
    overallScore,
    overallStatus: allAssessed ? "assessed" : "not_enough_evidence",
    dimensions,
    datasetCounts: {
      skills: state.skills.length,
      projects: state.projects.filter((p) => p.status !== "archived").length,
      jobs: state.jobs.length,
      jobsMatched: state.jobs.filter((j) => j.matchResult).length,
      interviews: state.interviews.length,
    },
  };
}

export interface FunnelSummary {
  periodLabel: string;
  saved: number;
  applied: number;
  screening: number;
  interview: number;
  offer: number;
  rejected: number;
  responseRate: string;
  interviewRate: string;
}

export function computeFunnel(state: AppState, sinceDaysAgo = 30): FunnelSummary {
  const today = todayISO();
  const jobs = state.jobs.filter((j) => daysBetween(j.savedAt.slice(0, 10), today) <= sinceDaysAgo);
  const applied = jobs.filter((j) => j.appliedAt).length;
  const screening = jobs.filter((j) => j.statusHistory.some((h) => h.status === "screening")).length;
  const interview = jobs.filter((j) => j.statusHistory.some((h) => h.status === "interview")).length;
  const offer = jobs.filter((j) => j.status === "offer").length;
  const rejected = jobs.filter((j) => j.status === "rejected").length;
  const responded = jobs.filter((j) =>
    j.statusHistory.some((h) => ["screening", "interview", "offer", "rejected"].includes(h.status))
  ).length;
  return {
    periodLabel: `Last ${sinceDaysAgo} days`,
    saved: jobs.length,
    applied,
    screening,
    interview,
    offer,
    rejected,
    responseRate: applied > 0 ? `${responded} of ${applied} applications` : "No applications yet",
    interviewRate: applied > 0 ? `${interview} of ${applied} applications` : "No applications yet",
  };
}
