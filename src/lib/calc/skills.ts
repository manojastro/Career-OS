import { Evidence, Skill, SkillLevel } from "@/lib/schema";

const STRONG_EVIDENCE_TYPES = new Set(["evaluation_result", "test_result", "deployment", "certificate", "assessment"]);

/**
 * Evidence-backed level is derived, never stored directly, so it can never be
 * hand-waved to "Demonstrated" just because a self-assessment says so.
 * Heuristic (documented, editable in code, not hidden from the user):
 *  - no linked evidence            -> Not started
 *  - linked evidence, weak proof   -> Practiced   (repo link, notes, recording only)
 *  - linked evidence, strong proof -> Demonstrated (eval/test result, deployment, certificate, assessment)
 */
export function computeSkillEvidenceLevel(skill: Skill, evidenceById: Map<string, Evidence>): SkillLevel {
  const linked = skill.evidenceIds.map((id) => evidenceById.get(id)).filter((e): e is Evidence => Boolean(e));
  if (linked.length === 0) return "not_started";
  const hasStrong = linked.some((e) => STRONG_EVIDENCE_TYPES.has(e.type));
  return hasStrong ? "demonstrated" : "practiced";
}

export function evidenceMap(evidence: Evidence[]): Map<string, Evidence> {
  return new Map(evidence.map((e) => [e.id, e]));
}

export const SKILL_LEVEL_ORDER: Record<SkillLevel, number> = {
  not_started: 0,
  learning: 1,
  practiced: 2,
  demonstrated: 3,
};
