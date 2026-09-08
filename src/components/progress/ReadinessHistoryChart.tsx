"use client";

import { useStore } from "@/lib/store/StoreContext";
import { RoleId, ROLE_LABELS } from "@/lib/schema";
import { Card, SectionHeading } from "@/components/ui/Primitives";
import { formatDateDisplay } from "@/lib/dateTime";

export function ReadinessHistoryChart({ roleId }: { roleId: RoleId }) {
  const { state } = useStore();
  const snapshots = state.readinessSnapshots
    .filter((s) => s.roleId === roleId && s.overallScore !== null)
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  if (snapshots.length < 2) return null;

  const max = 100;

  return (
    <Card>
      <SectionHeading title={`Readiness history — ${ROLE_LABELS[roleId]}`} subtitle="Only shown once at least two snapshots exist, so trends are comparable." />
      <div className="flex items-end gap-2 overflow-x-auto pb-2" style={{ height: 140 }}>
        {snapshots.map((s) => (
          <div key={s.id} className="flex w-12 shrink-0 flex-col items-center justify-end gap-1" style={{ height: "100%" }}>
            <span className="text-xs font-medium text-ink">{s.overallScore}</span>
            <div className="w-6 rounded-t bg-accent" style={{ height: `${((s.overallScore ?? 0) / max) * 100}px` }} />
            <span className="text-[10px] text-muted">{formatDateDisplay(s.date.slice(0, 10))}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
