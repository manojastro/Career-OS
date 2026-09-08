"use client";

import { useState } from "react";
import { Plus, Copy, Printer } from "lucide-react";
import { useStore } from "@/lib/store/StoreContext";
import { createResumeVersion, updateResumeVersion } from "@/lib/domain/commands";
import { Button, Card, Input, Select, Textarea, SectionHeading, EmptyState, Badge } from "@/components/ui/Primitives";
import { RoleId, ROLE_LABELS } from "@/lib/schema";
import { renderResumeText } from "@/lib/calc/resumeText";

export function ResumeVersionsPanel() {
  const { state, run, pushToast } = useStore();
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [targetRoleId, setTargetRoleId] = useState<RoleId | "">("");
  const [targetJobId, setTargetJobId] = useState("");
  const [openVersionId, setOpenVersionId] = useState<string | null>(null);

  function createVersion() {
    if (!name.trim()) return;
    const bulletsSnapshot = state.resumeProfile.experience.map((exp) => {
      const approved = exp.bullets.filter((b) => b.isApprovedOriginal);
      const chosen = approved.length > 0 ? approved : exp.bullets;
      return { employer: exp.employer, title: exp.title, bullets: chosen.map((b) => b.text).filter(Boolean) };
    });
    const result = run((s) =>
      createResumeVersion(
        s,
        {
          name: name.trim(),
          targetRoleId: targetRoleId || undefined,
          targetJobId: targetJobId || undefined,
          summary: state.resumeProfile.summary,
          bulletsSnapshot,
          linkedEvidenceIds: [],
        },
        { actor: "user" }
      )
    );
    pushToast("success", `Created resume version "${result.entity.name}"`);
    setName("");
    setTargetRoleId("");
    setTargetJobId("");
    setShowNew(false);
    setOpenVersionId(result.entity.id);
  }

  async function copyVersion(id: string) {
    const v = state.resumeVersions.find((x) => x.id === id);
    if (!v) return;
    await navigator.clipboard.writeText(renderResumeText(state.resumeProfile, v));
    pushToast("success", "Copied to clipboard.");
  }

  function printVersion(id: string) {
    setOpenVersionId(id);
    setTimeout(() => window.print(), 50);
  }

  return (
    <div className="space-y-4">
      <SectionHeading
        title="Resume versions"
        subtitle="Named, role or job-specific versions built from your master profile."
        action={
          <Button size="sm" onClick={() => setShowNew((v) => !v)}>
            <Plus size={14} /> New version
          </Button>
        }
      />

      {showNew && (
        <Card className="space-y-3">
          <Input label="Version name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. AI Engineer — Bengaluru roles" />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Target role (optional)" value={targetRoleId} onChange={(e) => setTargetRoleId(e.target.value as RoleId | "")}>
              <option value="">Unspecified</option>
              {(Object.keys(ROLE_LABELS) as RoleId[]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
            <Select label="Target job (optional)" value={targetJobId} onChange={(e) => setTargetJobId(e.target.value)}>
              <option value="">None</option>
              {state.jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.role} — {j.company}
                </option>
              ))}
            </Select>
          </div>
          <Button size="sm" onClick={createVersion} disabled={!name.trim()}>
            Create
          </Button>
        </Card>
      )}

      {state.resumeVersions.length === 0 ? (
        <EmptyState title="No versions yet" description="Create one from your approved master-profile bullets." />
      ) : (
        <div className="space-y-2">
          {state.resumeVersions.map((v) => (
            <Card key={v.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-ink">{v.name}</p>
                  <p className="text-xs text-muted">
                    {v.targetRoleId ? ROLE_LABELS[v.targetRoleId] : "No target role"}
                    {v.targetJobId && ` · ${state.jobs.find((j) => j.id === v.targetJobId)?.company ?? ""}`}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => copyVersion(v.id)}>
                    <Copy size={14} />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => printVersion(v.id)}>
                    <Printer size={14} />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setOpenVersionId(openVersionId === v.id ? null : v.id)}>
                    {openVersionId === v.id ? "Hide" : "Preview"}
                  </Button>
                </div>
              </div>
              {openVersionId === v.id && (
                <pre id="resume-print" className="mt-3 whitespace-pre-wrap rounded-lg border border-line bg-white p-3 font-sans text-sm text-ink">
                  {renderResumeText(state.resumeProfile, v)}
                </pre>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
