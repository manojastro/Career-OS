"use client";

import { Job, JobStatus } from "@/lib/schema";
import { Card, Badge } from "@/components/ui/Primitives";
import { formatDateDisplay } from "@/lib/dateTime";

const STATUS_TONE: Record<JobStatus, "neutral" | "accent" | "warn" | "danger" | "success"> = {
  saved: "neutral",
  preparing: "neutral",
  applied: "accent",
  screening: "accent",
  interview: "success",
  offer: "success",
  rejected: "danger",
  withdrawn: "neutral",
  closed: "neutral",
};

export function JobCard({ job, onOpen }: { job: Job; onOpen: () => void }) {
  return (
    <Card className="cursor-pointer hover:border-accent/40" onClick={onOpen}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-ink">{job.role}</p>
          <p className="text-sm text-muted">
            {job.company}
            {job.location ? ` · ${job.location}` : ""}
          </p>
        </div>
        <Badge tone={STATUS_TONE[job.status]}>{job.status}</Badge>
      </div>
      {job.matchResult && (
        <p className="mt-2 text-sm text-ink">
          {job.matchResult.requirements.filter((r) => r.status === "matched").length} matched ·{" "}
          {job.matchResult.requirements.filter((r) => r.status === "missing").length} missing ·{" "}
          <span className="capitalize">{job.matchResult.recommendation.replace(/_/g, " ")}</span>
        </p>
      )}
      {job.followUpDate && <p className="mt-1 text-xs text-warn">Follow up by {formatDateDisplay(job.followUpDate)}</p>}
    </Card>
  );
}
