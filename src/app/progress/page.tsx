"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store/StoreContext";
import { computeReadiness } from "@/lib/calc/readiness";
import { Card, SectionHeading, Badge } from "@/components/ui/Primitives";
import { ReadinessCard } from "@/components/progress/ReadinessCard";
import { RoleComparisonList } from "@/components/progress/RoleComparisonList";
import { FunnelPanel } from "@/components/progress/FunnelPanel";
import { WeeklyReviewPanel } from "@/components/progress/WeeklyReviewPanel";
import { ReadinessHistoryChart } from "@/components/progress/ReadinessHistoryChart";

export default function ProgressPage() {
  const { state } = useStore();
  const primary = state.profile.primaryRole;
  const secondary = state.profile.secondaryRole;

  const milestonesCompleted = useMemo(() => {
    const projectsDone = state.projects.filter((p) => p.status === "deployed" || p.status === "validated").length;
    const skillsDemonstrated = state.skills.filter((s) => {
      const evMap = new Map(state.evidence.map((e) => [e.id, e]));
      const linked = s.evidenceIds.map((id) => evMap.get(id)).filter(Boolean);
      return linked.some((e) => ["evaluation_result", "test_result", "deployment", "certificate", "assessment"].includes(e!.type));
    }).length;
    return projectsDone + skillsDemonstrated;
  }, [state]);

  const biggestGaps = useMemo(() => {
    const primaryResult = computeReadiness(state, primary);
    const dimGaps = primaryResult.dimensions
      .filter((d) => d.status === "not_enough_evidence" || (d.score ?? 100) < 50)
      .map((d) => d.explanation);
    const jobGaps = state.jobs.flatMap((j) => j.matchResult?.topGaps ?? []);
    const combined = [...dimGaps, ...jobGaps];
    return Array.from(new Set(combined)).slice(0, 5);
  }, [state, primary]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-ink">Progress</h1>
        <p className="text-sm text-muted">What improved, what's holding you back, what changes next week.</p>
      </div>

      <ReadinessCard roleId={primary} label="Primary" />
      {secondary && <ReadinessCard roleId={secondary} label="Secondary" />}
      <RoleComparisonList excludeRoles={secondary ? [primary, secondary] : [primary]} />

      <ReadinessHistoryChart roleId={primary} />

      <Card>
        <SectionHeading title="Evidence-backed milestones & gaps" />
        <p className="text-sm text-ink">
          <span className="font-semibold">{milestonesCompleted}</span> evidence-backed milestone{milestonesCompleted === 1 ? "" : "s"} completed (projects
          deployed/validated + skills demonstrated).
        </p>
        {biggestGaps.length > 0 ? (
          <div className="mt-2">
            <p className="text-sm font-medium text-ink">Biggest remaining gaps</p>
            <ul className="mt-1 list-inside list-disc text-sm text-muted">
              {biggestGaps.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          </div>
        ) : (
          <Badge tone="neutral" className="mt-2">
            Not enough evidence yet to identify gaps
          </Badge>
        )}
      </Card>

      <FunnelPanel />
      <WeeklyReviewPanel />
    </div>
  );
}
