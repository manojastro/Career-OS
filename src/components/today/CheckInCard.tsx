"use client";

import { useState } from "react";
import { useStore } from "@/lib/store/StoreContext";
import { createCheckIn } from "@/lib/domain/commands";
import { Card, Button, Textarea, SectionHeading } from "@/components/ui/Primitives";
import { todayISO } from "@/lib/dateTime";

export function CheckInCard() {
  const { state, run, pushToast } = useStore();
  const today = todayISO();
  const todaysCheckIns = state.checkIns.filter((c) => c.date === today);
  const [showForm, setShowForm] = useState(todaysCheckIns.length === 0);
  const [completedWork, setCompletedWork] = useState("");
  const [blocker, setBlocker] = useState("");
  const [nextStep, setNextStep] = useState("");

  function handleSave() {
    if (!completedWork.trim()) return;
    run((s) =>
      createCheckIn(
        s,
        { date: today, completedWork: completedWork.trim(), blocker: blocker.trim() || undefined, nextStep: nextStep.trim() || undefined },
        { actor: "user" }
      )
    );
    pushToast("success", "Check-in saved.");
    setCompletedWork("");
    setBlocker("");
    setNextStep("");
    setShowForm(false);
  }

  return (
    <Card>
      <SectionHeading title="End-of-day check-in" subtitle="Two minutes: what happened, what's in the way, what's next." />
      {todaysCheckIns.length > 0 && (
        <div className="mb-3 space-y-2">
          {todaysCheckIns.map((c) => (
            <div key={c.id} className="rounded-lg bg-accentSoft/60 px-3 py-2 text-sm">
              <p className="text-ink">{c.completedWork}</p>
              {c.blocker && <p className="mt-1 text-warn">Blocker: {c.blocker}</p>}
              {c.nextStep && <p className="mt-1 text-muted">Next: {c.nextStep}</p>}
            </div>
          ))}
        </div>
      )}
      {showForm ? (
        <div className="space-y-3">
          <Textarea label="What did you complete?" value={completedWork} onChange={(e) => setCompletedWork(e.target.value)} rows={2} />
          <Textarea label="Any blocker? (optional)" value={blocker} onChange={(e) => setBlocker(e.target.value)} rows={1} />
          <Textarea label="What's the next step? (optional)" value={nextStep} onChange={(e) => setNextStep(e.target.value)} rows={1} />
          <div className="flex justify-end gap-2">
            {todaysCheckIns.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            )}
            <Button size="sm" onClick={handleSave} disabled={!completedWork.trim()}>
              Save check-in
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="secondary" onClick={() => setShowForm(true)}>
          Log another update
        </Button>
      )}
    </Card>
  );
}
