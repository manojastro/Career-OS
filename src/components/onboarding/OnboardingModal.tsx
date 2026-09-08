"use client";

import { useState } from "react";
import { useStore } from "@/lib/store/StoreContext";
import { updateProfile, createProject } from "@/lib/domain/commands";
import { Button, Input, Select } from "@/components/ui/Primitives";
import { RoleId, ROLE_LABELS, Weekday } from "@/lib/schema";
import { todayISO } from "@/lib/dateTime";

const WEEKDAYS: { key: Weekday; label: string; dayType: "office" | "wfh" | "weekend" }[] = [
  { key: "mon", label: "Mon", dayType: "office" },
  { key: "tue", label: "Tue", dayType: "office" },
  { key: "wed", label: "Wed", dayType: "office" },
  { key: "thu", label: "Thu", dayType: "office" },
  { key: "fri", label: "Fri", dayType: "office" },
  { key: "sat", label: "Sat", dayType: "weekend" },
  { key: "sun", label: "Sun", dayType: "weekend" },
];

export function OnboardingModal() {
  const { state, run, pushToast } = useStore();
  const [step, setStep] = useState(0);
  const [primaryRole, setPrimaryRole] = useState<RoleId>(state.profile.primaryRole);
  const [secondaryRole, setSecondaryRole] = useState<string>(state.profile.secondaryRole ?? "");
  const [startDate, setStartDate] = useState(todayISO());
  const [hours, setHours] = useState<Record<Weekday, number>>(() => {
    const h: Record<string, number> = {};
    WEEKDAYS.forEach((d) => (h[d.key] = state.profile.weeklyAvailability[d.key]?.hours ?? 5));
    return h as Record<Weekday, number>;
  });
  const [projectName, setProjectName] = useState("");

  if (state.profile.onboardingComplete) return null;

  const totalSteps = 4;

  function finish(addProject: boolean) {
    const weeklyAvailability = { ...state.profile.weeklyAvailability };
    WEEKDAYS.forEach((d) => {
      weeklyAvailability[d.key] = { hours: hours[d.key] ?? 5, dayType: d.dayType };
    });
    run((s) =>
      updateProfile(
        s,
        {
          primaryRole,
          secondaryRole: secondaryRole ? (secondaryRole as RoleId) : null,
          planStartDate: startDate,
          weeklyAvailability,
          onboardingComplete: true,
        },
        { actor: "user" }
      )
    );
    if (addProject && projectName.trim()) {
      run((s) => createProject(s, { name: projectName.trim(), status: "idea", scope: "flagship" }, { actor: "user" }));
    }
    pushToast("success", "You're set up. Let's get to work.");
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-card bg-white p-6 shadow-xl">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">
          Setup {step + 1} of {totalSteps}
        </p>

        {step === 0 && (
          <div className="mt-3 space-y-4">
            <h2 className="text-lg font-semibold text-ink">Welcome to Career Transition OS</h2>
            <p className="text-sm text-muted">
              One place to know your next step, do the work, record the proof, and move toward the right AI role. Let's set a few basics —
              everything here is editable later in Settings.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Primary target role" value={primaryRole} onChange={(e) => setPrimaryRole(e.target.value as RoleId)}>
                {(Object.keys(ROLE_LABELS) as RoleId[]).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </Select>
              <Select label="Secondary target role (optional)" value={secondaryRole} onChange={(e) => setSecondaryRole(e.target.value)}>
                <option value="">None</option>
                {(Object.keys(ROLE_LABELS) as RoleId[]).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="mt-3 space-y-4">
            <h2 className="text-lg font-semibold text-ink">When are you starting?</h2>
            <Input label="Plan start date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <p className="text-xs text-muted">Your 80-day horizon (editable later) counts from this date.</p>
          </div>
        )}

        {step === 2 && (
          <div className="mt-3 space-y-4">
            <h2 className="text-lg font-semibold text-ink">Roughly how many hours can you give each day?</h2>
            <p className="text-xs text-muted">A starting guess is fine — change this anytime without guilt.</p>
            <div className="grid grid-cols-7 gap-2">
              {WEEKDAYS.map((d) => (
                <div key={d.key} className="text-center">
                  <p className="text-xs text-muted">{d.label}</p>
                  <input
                    type="number"
                    min={0}
                    max={16}
                    step="0.5"
                    value={hours[d.key]}
                    onChange={(e) => setHours((prev) => ({ ...prev, [d.key]: Number(e.target.value) }))}
                    className="mt-1 w-full rounded-lg border border-line px-1 py-1.5 text-center text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mt-3 space-y-4">
            <h2 className="text-lg font-semibold text-ink">Have an existing project?</h2>
            <p className="text-xs text-muted">Optional — add your flagship project now, or skip and add it anytime in Build &amp; Learn.</p>
            <Input label="Project name (optional)" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="e.g. Deployed RAG support assistant" />
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            Back
          </Button>
          {step < totalSteps - 1 ? (
            <Button variant="primary" onClick={() => setStep((s) => s + 1)}>
              Next
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => finish(false)}>
                Skip
              </Button>
              <Button variant="primary" onClick={() => finish(true)}>
                Finish setup
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
