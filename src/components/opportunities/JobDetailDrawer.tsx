"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Drawer, ConfirmDialog } from "@/components/ui/Drawer";
import { Button, Badge, Input, Select, Textarea, SectionHeading } from "@/components/ui/Primitives";
import { useStore } from "@/lib/store/StoreContext";
import { Job, JobStatus } from "@/lib/schema";
import { setJobStatus, updateJobFields, setJobMatchResult } from "@/lib/domain/commands";
import { matchJobToProfile } from "@/lib/calc/jdMatch";
import { formatDateDisplay, todayISO } from "@/lib/dateTime";
import { cx } from "@/lib/utils";

const STATUS_FLOW: JobStatus[] = ["saved", "preparing", "applied", "screening", "interview", "offer", "rejected", "withdrawn", "closed"];

const REQ_TONE: Record<string, "success" | "accent" | "danger" | "neutral"> = {
  matched: "success",
  partial: "accent",
  missing: "danger",
  unknown: "neutral",
};

export function JobDetailDrawer({ open, onClose, job }: { open: boolean; onClose: () => void; job?: Job }) {
  const { state, run, pushToast } = useStore();
  const [nextAction, setNextAction] = useState(job?.nextAction ?? "");
  const [followUpDate, setFollowUpDate] = useState(job?.followUpDate ?? "");
  const [jdText, setJdText] = useState(job?.jdText ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingJd, setEditingJd] = useState(false);

  if (!job) return null;

  function saveMeta() {
    if (!job) return;
    run((s) => updateJobFields(s, job.id, { nextAction: nextAction.trim() || undefined, followUpDate: followUpDate || undefined }, { actor: "user" }));
    pushToast("success", "Saved.");
  }

  function runMatch() {
    if (!job) return;
    const latestJob = { ...job, jdText };
    const match = matchJobToProfile(latestJob, state);
    run((s) => updateJobFields(s, job.id, { jdText }, { actor: "user" }));
    run((s) => setJobMatchResult(s, job.id, match, { actor: "user" }));
    pushToast("success", "Match updated.");
    setEditingJd(false);
  }

  function changeStatus(status: JobStatus) {
    if (!job) return;
    run((s) => setJobStatus(s, job.id, status, { actor: "user" }));
    pushToast("success", `Moved to ${status}`);
  }

  function overrideRecommendation(value: string) {
    if (!job || !job.matchResult) return;
    const updated = { ...job.matchResult, recommendationOverride: value === "" ? undefined : (value as any) };
    run((s) => setJobMatchResult(s, job.id, updated, { actor: "user" }));
  }

  const suggestedVersion = job.matchResult?.suggestedResumeVersionId
    ? state.resumeVersions.find((v) => v.id === job.matchResult!.suggestedResumeVersionId)
    : undefined;

  const grouped = job.matchResult
    ? {
        matched: job.matchResult.requirements.filter((r) => r.status === "matched"),
        partial: job.matchResult.requirements.filter((r) => r.status === "partial"),
        missing: job.matchResult.requirements.filter((r) => r.status === "missing"),
        unknown: job.matchResult.requirements.filter((r) => r.status === "unknown"),
      }
    : null;

  return (
    <Drawer open={open} onClose={onClose} title={`${job.role} — ${job.company}`} wide>
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {STATUS_FLOW.map((s) => (
            <Button key={s} size="sm" variant={job.status === s ? "primary" : "secondary"} onClick={() => changeStatus(s)}>
              {s}
            </Button>
          ))}
        </div>

        <div className="text-sm text-muted">
          Saved {formatDateDisplay(job.savedAt)} {job.appliedAt && `· Applied ${formatDateDisplay(job.appliedAt)}`}
          {job.location && ` · ${job.location}`}
          {job.workMode && ` · ${job.workMode}`}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Next action" value={nextAction} onChange={(e) => setNextAction(e.target.value)} onBlur={saveMeta} />
          <Input label="Follow-up date" type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} onBlur={saveMeta} min={todayISO()} />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <p className="text-sm font-medium text-ink">Job description</p>
            <Button size="sm" variant="ghost" onClick={() => setEditingJd((v) => !v)}>
              {editingJd ? "Cancel edit" : "Edit"}
            </Button>
          </div>
          {editingJd ? (
            <div className="space-y-2">
              <Textarea value={jdText} onChange={(e) => setJdText(e.target.value)} rows={8} />
              <Button size="sm" onClick={runMatch}>
                <RefreshCw size={14} /> Save &amp; re-run match
              </Button>
            </div>
          ) : (
            <p className="max-h-32 overflow-y-auto whitespace-pre-wrap rounded-lg border border-line bg-white p-3 text-sm text-muted">
              {job.jdText || "No JD text saved — matching is not possible until you paste it."}
            </p>
          )}
        </div>

        <div>
          <SectionHeading
            title="Match to your profile"
            action={
              !editingJd && (
                <Button size="sm" variant="secondary" onClick={runMatch}>
                  <RefreshCw size={14} /> Re-run match
                </Button>
              )
            }
          />
          {!job.matchResult ? (
            <p className="text-sm text-muted">Not matched yet. Click &quot;Re-run match&quot; once the JD text is saved.</p>
          ) : (
            <div className="space-y-3">
              {job.matchResult.jdCompleteness !== "complete" && (
                <Badge tone="warn">
                  {job.matchResult.jdCompleteness === "insufficient" ? "JD text too short — assessment is incomplete" : "JD text is brief — assessment may be partial"}
                </Badge>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted">Recommendation:</span>
                <Badge tone="accent">{job.matchResult.recommendation.replace(/_/g, " ")}</Badge>
                {job.matchResult.recommendationOverride && (
                  <Badge tone="warn">Your override: {job.matchResult.recommendationOverride.replace(/_/g, " ")}</Badge>
                )}
                <div className="ml-auto max-w-[220px]">
                  <Select value={job.matchResult.recommendationOverride ?? ""} onChange={(e) => overrideRecommendation(e.target.value)}>
                    <option value="">Use system recommendation</option>
                    <option value="apply_now">Override: Apply now</option>
                    <option value="tailor_then_apply">Override: Tailor then apply</option>
                    <option value="build_evidence_first">Override: Build evidence first</option>
                  </Select>
                </div>
              </div>

              {suggestedVersion && <p className="text-sm text-ink">Suggested resume version: {suggestedVersion.name}</p>}

              {job.matchResult.topGaps.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-ink">Top gaps</p>
                  <ul className="mt-1 list-inside list-disc text-sm text-muted">
                    {job.matchResult.topGaps.map((g, i) => (
                      <li key={i}>{g}</li>
                    ))}
                  </ul>
                </div>
              )}

              {(["matched", "partial", "missing", "unknown"] as const).map((key) => {
                const items = grouped![key];
                if (items.length === 0) return null;
                return (
                  <div key={key}>
                    <p className="text-sm font-medium capitalize text-ink">
                      {key} ({items.length})
                    </p>
                    <div className="mt-1 space-y-1.5">
                      {items.map((r, i) => (
                        <div key={i} className="rounded-lg border border-line px-2.5 py-1.5 text-sm">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-ink">{r.excerpt}</span>
                            <div className="flex shrink-0 gap-1">
                              {r.isHardConstraint && <Badge tone="warn">hard</Badge>}
                              <Badge tone={REQ_TONE[r.status]}>{r.status}</Badge>
                            </div>
                          </div>
                          {r.evidenceRefs.length > 0 && (
                            <p className="mt-1 text-xs text-muted">Evidence: {r.evidenceRefs.map((e) => e.label).join(", ")}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-line pt-3">
          <Button size="sm" variant="danger" onClick={() => setConfirmDelete(true)}>
            Withdraw / remove
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          changeStatus("withdrawn");
          setConfirmDelete(false);
          onClose();
        }}
        title="Mark this application withdrawn?"
        description="It stays in your history but moves out of active tracking."
        confirmLabel="Withdraw"
        danger
      />
    </Drawer>
  );
}
