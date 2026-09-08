"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store/StoreContext";
import { Card } from "@/components/ui/Primitives";
import { daysBetween, formatDateDisplay, todayISO } from "@/lib/dateTime";
import { computeReadiness } from "@/lib/calc/readiness";

export function ProgressStrip() {
  const { state } = useStore();
  const today = todayISO();

  const metrics = useMemo(() => {
    const evidenceThisWeek = state.evidence.filter((e) => daysBetween(e.createdAt.slice(0, 10), today) <= 7).length;
    const applicationsThisWeek = state.jobs.filter((j) => j.appliedAt && daysBetween(j.appliedAt.slice(0, 10), today) <= 7).length;

    const upcoming: { label: string; date: string }[] = [];
    for (const iv of state.interviews) {
      if (iv.scheduledAt && iv.scheduledAt.slice(0, 10) >= today) {
        upcoming.push({ label: `Interview: ${iv.company}`, date: iv.scheduledAt });
      }
    }
    for (const j of state.jobs) {
      if (j.followUpDate && j.followUpDate >= today) {
        upcoming.push({ label: `Follow up: ${j.company}`, date: j.followUpDate });
      }
    }
    for (const c of state.contacts) {
      if (c.followUpDate && c.followUpDate >= today) {
        upcoming.push({ label: `Follow up: ${c.name}`, date: c.followUpDate });
      }
    }
    upcoming.sort((a, b) => (a.date < b.date ? -1 : 1));
    const next = upcoming[0];

    const readiness = computeReadiness(state, state.profile.primaryRole);
    const priorSnapshots = state.readinessSnapshots
      .filter((s) => s.roleId === state.profile.primaryRole)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    let trend = "Not enough evidence yet";
    if (readiness.overallScore !== null && priorSnapshots[0]?.overallScore != null) {
      const delta = readiness.overallScore - priorSnapshots[0].overallScore;
      trend = delta === 0 ? "No change since last snapshot" : `${delta > 0 ? "+" : ""}${delta} pts since last snapshot`;
    } else if (readiness.overallScore !== null) {
      trend = `${readiness.overallScore}/100 (no history yet)`;
    }

    return { evidenceThisWeek, applicationsThisWeek, next, trend };
  }, [state, today]);

  return (
    <Card className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div>
        <p className="text-xs text-muted">Evidence added this week</p>
        <p className="text-lg font-semibold text-ink">{metrics.evidenceThisWeek}</p>
      </div>
      <div>
        <p className="text-xs text-muted">Applications this week</p>
        <p className="text-lg font-semibold text-ink">{metrics.applicationsThisWeek}</p>
      </div>
      <div>
        <p className="text-xs text-muted">Next interview / follow-up</p>
        <p className="text-sm font-semibold text-ink">
          {metrics.next ? `${metrics.next.label} — ${formatDateDisplay(metrics.next.date.slice(0, 10))}` : "None scheduled"}
        </p>
      </div>
      <div>
        <p className="text-xs text-muted">Readiness trend ({state.profile.primaryRole.replace(/_/g, " ")})</p>
        <p className="text-sm font-semibold text-ink">{metrics.trend}</p>
      </div>
    </Card>
  );
}
