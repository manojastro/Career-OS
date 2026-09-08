"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store/StoreContext";
import { computeFunnel } from "@/lib/calc/readiness";
import { Card, SectionHeading, Select } from "@/components/ui/Primitives";

export function FunnelPanel() {
  const { state } = useStore();
  const [days, setDays] = useState(30);
  const funnel = useMemo(() => computeFunnel(state, days), [state, days]);

  return (
    <Card>
      <SectionHeading
        title="Application funnel"
        subtitle={funnel.periodLabel}
        action={
          <Select value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-32">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </Select>
        }
      />
      <div className="grid grid-cols-3 gap-3 text-center sm:grid-cols-6">
        {(
          [
            ["Saved", funnel.saved],
            ["Applied", funnel.applied],
            ["Screening", funnel.screening],
            ["Interview", funnel.interview],
            ["Offer", funnel.offer],
            ["Rejected", funnel.rejected],
          ] as const
        ).map(([label, count]) => (
          <div key={label} className="rounded-lg border border-line py-2">
            <p className="text-lg font-semibold text-ink">{count}</p>
            <p className="text-xs text-muted">{label}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-1 text-sm text-muted">
        <p>Response rate: {funnel.responseRate}</p>
        <p>Interview rate: {funnel.interviewRate}</p>
      </div>
      <p className="mt-2 text-xs text-muted">Small numbers don't support strong conclusions — treat early trends as directional, not predictive.</p>
    </Card>
  );
}
