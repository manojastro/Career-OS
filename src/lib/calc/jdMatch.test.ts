import { describe, it, expect } from "vitest";
import { createDefaultState } from "@/lib/storage/seed";
import { matchJobToProfile } from "@/lib/calc/jdMatch";
import { createSkill, createEvidence, linkEvidence, createJob } from "@/lib/domain/commands";
import { Job } from "@/lib/schema";

function makeJob(state: ReturnType<typeof createDefaultState>, jdText: string): Job {
  const result = createJob(
    state,
    { company: "Acme", role: "GenAI Engineer", jdText, savedAt: "2026-01-01", status: "saved", statusHistory: [] },
    { actor: "user" }
  );
  return result.entity;
}

describe("matchJobToProfile", () => {
  it("flags an insufficient JD instead of producing a confident score", () => {
    const state = createDefaultState();
    const job = makeJob(state, "Short JD.");
    const result = matchJobToProfile(job, state);
    expect(result.jdCompleteness).toBe("insufficient");
    expect(result.topGaps[0]).toMatch(/too short/i);
  });

  it("classifies a skill with strong evidence as matched, not just partial", () => {
    let state = createDefaultState();
    const skill = createSkill(state, { name: "Docker" }, { actor: "user" });
    state = skill.state;
    const evidence = createEvidence(state, { title: "Deployed with Docker", type: "deployment" }, { actor: "user" });
    state = evidence.state;
    state = linkEvidence(state, evidence.entity.id, { skillId: skill.entity.id }, { actor: "user" }).state;

    const jdText =
      "We need someone with the following:\n" +
      "- Strong experience with Docker and containerization\n" +
      "- Experience with Kubernetes at scale\n" +
      "- Background in distributed systems architecture\n";
    const job = makeJob(state, jdText);
    const result = matchJobToProfile(job, state);
    const dockerReq = result.requirements.find((r) => r.requirement.toLowerCase().includes("docker"));
    expect(dockerReq?.status).toBe("matched");
    expect(dockerReq?.evidenceRefs.length).toBeGreaterThan(0);
  });

  it("classifies a requirement with no profile overlap as missing, not invented as matched", () => {
    const state = createDefaultState();
    const jdText =
      "Requirements:\n" +
      "- 5+ years of experience with Rust systems programming\n" +
      "- Deep knowledge of GPU kernel optimization\n" +
      "- Experience with distributed consensus algorithms\n";
    const job = makeJob(state, jdText);
    const result = matchJobToProfile(job, state);
    expect(result.requirements.every((r) => r.status === "missing" || r.status === "unknown")).toBe(true);
    expect(result.recommendation).toBe("build_evidence_first");
  });

  it("treats IT-ops transferable language as partial rather than a hard miss", () => {
    const state = createDefaultState();
    const jdText =
      "What you'll do:\n" +
      "- Own incident management and on-call rotations\n" +
      "- Communicate with stakeholders across teams\n" +
      "- Drive root cause analysis for production issues\n";
    const job = makeJob(state, jdText);
    const result = matchJobToProfile(job, state);
    expect(result.requirements.some((r) => r.status === "partial")).toBe(true);
  });
});
