import { AppState, Job, JdMatchResult, RequirementMatchSchema } from "@/lib/schema";
import { computeSkillEvidenceLevel, evidenceMap } from "@/lib/calc/skills";
import { nowISO } from "@/lib/dateTime";
import { z } from "zod";

type RequirementMatch = z.infer<typeof RequirementMatchSchema>;

const HARD_CONSTRAINT_HINTS = [
  "must be located",
  "on-site",
  "onsite",
  "citizenship",
  "work visa",
  "security clearance",
  "notice period",
  "immediate joiner",
  "years of experience",
  "bachelor",
  "b.tech",
  "b.e.",
  "master's degree",
];

const TRANSFERABLE_HINTS = [
  "incident management",
  "itil",
  "ticketing",
  "on-call",
  "sla",
  "stakeholder",
  "root cause",
  "monitoring",
  "escalation",
  "service desk",
  "change management",
  "documentation",
  "cross-functional",
  "communication",
];

const BULLET_PATTERN = /^\s*[-•*•]\s+/;

function extractRequirementLines(jdText: string): string[] {
  const lines = jdText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const bulletLines = lines.filter((l) => BULLET_PATTERN.test(l)).map((l) => l.replace(BULLET_PATTERN, ""));
  const candidateLines = bulletLines.length >= 3 ? bulletLines : lines;
  return candidateLines
    .filter((l) => l.length >= 12 && l.length <= 300)
    .filter((l) => !/^(about|company|apply|role overview|job title|title)[:\s]/i.test(l))
    .slice(0, 30);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\+\#\.\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

export function matchJobToProfile(job: Job, state: AppState): JdMatchResult {
  const jdText = job.jdText ?? "";
  const trimmedLen = jdText.trim().length;
  const requirementLines = extractRequirementLines(jdText);

  let jdCompleteness: JdMatchResult["jdCompleteness"] = "complete";
  if (trimmedLen < 200 || requirementLines.length === 0) jdCompleteness = "insufficient";
  else if (trimmedLen < 500 || requirementLines.length < 3) jdCompleteness = "partial";

  const eMap = evidenceMap(state.evidence);
  const requirements: RequirementMatch[] = requirementLines.map((line) => {
    const isHardConstraint = HARD_CONSTRAINT_HINTS.some((hint) => line.toLowerCase().includes(hint));
    const tokens = tokenize(line);
    if (tokens.length < 2) {
      return RequirementMatchSchema.parse({
        requirement: line,
        excerpt: line,
        status: "unknown",
        isHardConstraint,
        evidenceRefs: [],
      });
    }

    const evidenceRefs: RequirementMatch["evidenceRefs"] = [];
    let bestStatus: RequirementMatch["status"] = "missing";

    for (const skill of state.skills) {
      const skillTokens = tokenize(skill.name);
      const overlap = skillTokens.some((t) => tokens.includes(t)) || tokens.some((t) => skill.name.toLowerCase().includes(t) && t.length > 3);
      if (!overlap) continue;
      const level = computeSkillEvidenceLevel(skill, eMap);
      if (level === "demonstrated" || level === "practiced") {
        bestStatus = "matched";
        evidenceRefs.push({ type: "skill", id: skill.id, label: skill.name });
      } else if (bestStatus !== "matched") {
        bestStatus = "partial";
        evidenceRefs.push({ type: "skill", id: skill.id, label: skill.name });
      }
    }

    for (const project of state.projects) {
      if (project.status === "archived") continue;
      const stackTokens = project.stack.flatMap((s) => tokenize(s));
      const overlap = stackTokens.some((t) => tokens.includes(t));
      if (!overlap) continue;
      if (project.status === "deployed" || project.status === "validated") {
        bestStatus = "matched";
      } else if (bestStatus !== "matched") {
        bestStatus = "partial";
      }
      evidenceRefs.push({ type: "project", id: project.id, label: project.name });
    }

    if (bestStatus === "missing") {
      const isTransferable = TRANSFERABLE_HINTS.some((hint) => line.toLowerCase().includes(hint));
      if (isTransferable) {
        bestStatus = "partial";
      }
    }

    return RequirementMatchSchema.parse({
      requirement: line,
      excerpt: line.length > 160 ? `${line.slice(0, 157)}...` : line,
      status: bestStatus,
      isHardConstraint,
      evidenceRefs,
    });
  });

  const known = requirements.filter((r) => r.status !== "unknown");
  const missingHard = requirements.filter((r) => r.status === "missing" && r.isHardConstraint);
  const matchedRatio = known.length > 0 ? known.filter((r) => r.status === "matched").length / known.length : 0;

  let recommendation: JdMatchResult["recommendation"] = "build_evidence_first";
  if (jdCompleteness !== "insufficient") {
    if (matchedRatio >= 0.7 && missingHard.length === 0) recommendation = "apply_now";
    else if (matchedRatio >= 0.4) recommendation = "tailor_then_apply";
    else recommendation = "build_evidence_first";
  }

  const missingSorted = [...requirements.filter((r) => r.status === "missing")].sort(
    (a, b) => Number(b.isHardConstraint) - Number(a.isHardConstraint)
  );
  const topGaps = missingSorted.slice(0, 3).map((r) => r.excerpt);
  if (jdCompleteness === "insufficient") {
    topGaps.unshift("The saved JD text is too short to reliably extract requirements — paste the full posting for a real assessment.");
  }

  const versionForThisJob = state.resumeVersions.find((v) => v.targetJobId === job.id);
  const mostRecentVersion = [...state.resumeVersions].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0];
  const suggestedVersion = versionForThisJob ?? mostRecentVersion;

  return {
    computedAt: nowISO(),
    jdCompleteness,
    requirements,
    topGaps,
    suggestedResumeVersionId: suggestedVersion?.id,
    recommendation,
  };
}
