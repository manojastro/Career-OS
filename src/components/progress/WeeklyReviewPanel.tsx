"use client";

import { useState } from "react";
import { useStore } from "@/lib/store/StoreContext";
import { createWeeklyReview } from "@/lib/domain/commands";
import { Card, SectionHeading, Textarea, Input, Button } from "@/components/ui/Primitives";
import { todayISO, formatDateDisplay } from "@/lib/dateTime";

export function WeeklyReviewPanel() {
  const { state, run, pushToast } = useStore();
  const [summary, setSummary] = useState("");
  const [priorities, setPriorities] = useState(["", "", ""]);

  function save() {
    if (!summary.trim()) return;
    run((s) =>
      createWeeklyReview(
        s,
        { weekStart: todayISO(), summary: summary.trim(), nextWeekPriorities: priorities.map((p) => p.trim()).filter(Boolean) },
        { actor: "user" }
      )
    );
    pushToast("success", "Weekly review saved.");
    setSummary("");
    setPriorities(["", "", ""]);
  }

  const recent = [...state.weeklyReviews].sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1)).slice(0, 4);

  return (
    <Card>
      <SectionHeading title="Weekly review" subtitle="What improved, what's holding you back, three priorities for next week." />
      <div className="space-y-3">
        <Textarea label="What improved / what's holding you back" value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} />
        <div>
          <p className="mb-1 text-sm font-medium text-ink">Next week's three priorities</p>
          <div className="space-y-2">
            {priorities.map((p, i) => (
              <Input
                key={i}
                value={p}
                onChange={(e) => setPriorities((prev) => prev.map((x, idx) => (idx === i ? e.target.value : x)))}
                placeholder={`Priority ${i + 1}`}
              />
            ))}
          </div>
        </div>
        <Button size="sm" onClick={save} disabled={!summary.trim()}>
          Save weekly review
        </Button>
      </div>

      {recent.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-line pt-3">
          {recent.map((r) => (
            <div key={r.id} className="rounded-lg bg-black/[0.03] p-2.5 text-sm">
              <p className="text-xs text-muted">Week of {formatDateDisplay(r.weekStart)}</p>
              <p className="mt-1 text-ink">{r.summary}</p>
              {r.nextWeekPriorities.length > 0 && (
                <ul className="mt-1 list-inside list-disc text-muted">
                  {r.nextWeekPriorities.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
