import { Evidence, Project } from "@/lib/schema";

/** The single most useful missing proof item for a project, in priority order. */
export function suggestMissingProof(project: Project, evidence: Evidence[]): string | null {
  const linked = evidence.filter((e) => project.evidenceIds.includes(e.id));
  const hasRepo = linked.some((e) => e.type === "repository");
  const hasDeployment = project.deploymentRecorded || linked.some((e) => e.type === "deployment");
  const hasValidation = project.validationRecorded || linked.some((e) => e.type === "evaluation_result" || e.type === "test_result");
  const hasCaseStudy = linked.some((e) => e.type === "case_study");
  const hasDemo = linked.some((e) => e.type === "demo_recording");

  if (project.status === "archived") return null;
  if (!hasRepo && (project.status === "building" || project.status === "planned")) {
    return "Link a repository so this project is inspectable.";
  }
  if (!hasDeployment) {
    return "Add a deployment record (URL, logs, or a screenshot with provenance) before calling this Deployed.";
  }
  if (!hasValidation) {
    return "Record test or evaluation results — deployment alone doesn't establish correctness.";
  }
  if (!hasDemo) {
    return "Record a short demo so reviewers can see it work without setup.";
  }
  if (!hasCaseStudy) {
    return "Write a concise case study summarizing the problem, approach, and measured outcome.";
  }
  return null;
}
