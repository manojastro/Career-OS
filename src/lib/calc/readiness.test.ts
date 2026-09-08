import { describe, it, expect } from "vitest";
import { createDefaultState } from "@/lib/storage/seed";
import { computeReadiness } from "@/lib/calc/readiness";
import { createSkill, createEvidence, linkEvidence, createProject, setProjectStatus } from "@/lib/domain/commands";

describe("computeReadiness", () => {
  it("reports not_enough_evidence for a brand-new profile with no data", () => {
    const state = createDefaultState();
    const result = computeReadiness(state, state.profile.primaryRole);
    expect(result.overallStatus).toBe("not_enough_evidence");
    expect(result.overallScore).toBeNull();
    expect(result.dimensions.every((d) => d.status === "not_enough_evidence")).toBe(true);
  });

  it("does not let a demonstrated skill inflate a dimension it isn't linked to", () => {
    let state = createDefaultState();
    const role = state.profile.primaryRole;
    const other = state.profile.secondaryRole!;
    const created = createSkill(state, { name: "Docker", linkedRoles: [other] }, { actor: "user" });
    state = created.state;
    const evidence = createEvidence(state, { title: "Cert", type: "certificate" }, { actor: "user" });
    state = evidence.state;
    state = linkEvidence(state, evidence.entity.id, { skillId: created.entity.id }, { actor: "user" }).state;

    const primaryResult = computeReadiness(state, role);
    expect(primaryResult.dimensions.find((d) => d.key === "skills")!.status).toBe("not_enough_evidence");
  });

  it("computes a weighted overall score only once every dimension has evidence", () => {
    let state = createDefaultState();
    const role = state.profile.primaryRole;

    // Skills: one demonstrated skill linked to the role
    const skill = createSkill(state, { name: "LLM evaluation", linkedRoles: [role] }, { actor: "user" });
    state = skill.state;
    const skillEvidence = createEvidence(state, { title: "Eval results", type: "evaluation_result" }, { actor: "user" });
    state = skillEvidence.state;
    state = linkEvidence(state, skillEvidence.entity.id, { skillId: skill.entity.id }, { actor: "user" }).state;

    // Projects: one validated project
    const project = createProject(state, { name: "RAG bot", deploymentRecorded: true, validationRecorded: true, linkedRoles: [role] }, { actor: "user" });
    state = project.state;
    state = setProjectStatus(state, project.entity.id, "deployed", { actor: "user" }).state;
    state = setProjectStatus(state, project.entity.id, "validated", { actor: "user" }).state;

    const result = computeReadiness(state, role);
    // jdMatch and interviewPractice still have no data, so overall must remain unassessed
    expect(result.overallStatus).toBe("not_enough_evidence");
    expect(result.dimensions.find((d) => d.key === "skills")!.score).toBe(100);
    expect(result.dimensions.find((d) => d.key === "projects")!.score).toBe(100);
  });
});
