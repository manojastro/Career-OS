"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store/StoreContext";
import { computeReadiness } from "@/lib/calc/readiness";
import { RoleId, ROLE_LABELS } from "@/lib/schema";
import { Card, Badge, Button, ProgressBar, SectionHeading } from "@/components/ui/Primitives";
import { saveReadinessSnapshot } from "@/lib/domain/commands";
import { formatDateDisplay } from "@/lib/dateTime";

export function ReadinessCard({ roleId, label }: { roleId: RoleId; label: string }) {
  const { state, run, pushToast } = useStore();
  const result = useMemo(() => computeReadiness(state, roleId), [state, roleId]);
  const priorSnapshots = state.readinessSnapshots.filter((s) => s.roleId === roleId).sort((a, b) => (a.date < b.date ? 1 : -1));
  const lastSaved = priorSnapshots[0];

  function saveSnapshot() {
    run((s) =>
      saveReadinessSnapshot(
        s,
        {
          roleId,
          rubricVersion: result.rubricVersion,
          overallScore: result.overallScore,
          overallStatus: result.overallStatus,
          dimensions: result.dimensions,
          datasetCounts: result.datasetCounts,
        },
        { actor: "user" }
      )
    );
    pushToast("success", "Readiness snapshot saved.");
  }

  return (
    <Card>
      <SectionHeading
        title={`${label}: ${ROLE_LABELS[roleId]}`}
        subtitle={lastSaved ? `Last snapshot saved ${formatDateDisplay(lastSaved.date.slice(0, 10))}` : "No snapshot saved yet"}
        action={
          <Button size="sm" onClick={saveSnapshot}>
            Save snapshot
          </Button>
        }
      />

      <div className="mb-4">
        {result.overallStatus === "not_enough_evidence" ? (
          <Badge tone="warn">Not enough evidence for an overall readiness estimate yet</Badge>
        ) : (
          <p className="text-2xl font-semibold text-ink">{result.overallScore}/100 readiness estimate</p>
        )}
        <p className="mt-1 text-xs text-muted">
          A product heuristic based on your own recorded evidence — not a probability of getting hired or a salary predictor.
        </p>
      </div>

      <div className="space-y-3">
        {result.dimensions.map((d) => (
          <div key={d.key}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-ink">
                {d.label} <span className="text-muted">({Math.round(d.weight * 100)}%)</span>
              </span>
              <span className="text-muted">{d.status === "assessed" ? `${d.score}/100` : "Not enough evidence"}</span>
            </div>
            <div className="mt-1">
              <ProgressBar value={d.status === "assessed" ? d.score ?? 0 : 0} />
            </div>
            <p className="mt-1 text-xs text-muted">{d.explanation}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
