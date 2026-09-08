"use client";

import { useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Button, Input, Select, Textarea } from "@/components/ui/Primitives";
import { useStore } from "@/lib/store/StoreContext";
import { createJob, setJobMatchResult } from "@/lib/domain/commands";
import { matchJobToProfile } from "@/lib/calc/jdMatch";
import { todayISO } from "@/lib/dateTime";

export function AddJobModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved?: (jobId: string) => void }) {
  const { state, run, pushToast } = useStore();
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [workMode, setWorkMode] = useState<"remote" | "hybrid" | "onsite" | "">("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [jdText, setJdText] = useState("");

  function reset() {
    setCompany("");
    setRole("");
    setLocation("");
    setWorkMode("");
    setSourceUrl("");
    setJdText("");
  }

  function handleSave() {
    if (!company.trim() || !role.trim()) return;
    const result = run((s) =>
      createJob(
        s,
        {
          company: company.trim(),
          role: role.trim(),
          location: location.trim() || undefined,
          workMode: workMode || undefined,
          sourceUrl: sourceUrl.trim() || undefined,
          jdText: jdText.trim(),
          savedAt: todayISO(),
          status: "saved",
          statusHistory: [{ status: "saved" as const, at: new Date().toISOString() }],
        },
        { actor: "user" }
      )
    );
    if (jdText.trim().length > 0) {
      const match = matchJobToProfile(result.entity, state);
      run((s) => setJobMatchResult(s, result.entity.id, match, { actor: "user" }));
    }
    pushToast("success", `Saved "${role}" at ${company}`);
    onSaved?.(result.entity.id);
    reset();
    onClose();
  }

  return (
    <Drawer open={open} onClose={onClose} title="Save a job" wide>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Company" value={company} onChange={(e) => setCompany(e.target.value)} />
          <Input label="Role title" value={role} onChange={(e) => setRole(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Location (optional)" value={location} onChange={(e) => setLocation(e.target.value)} />
          <Select label="Work mode (optional)" value={workMode} onChange={(e) => setWorkMode(e.target.value as any)}>
            <option value="">Unspecified</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">On-site</option>
          </Select>
        </div>
        <Input label="Source link (optional)" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://..." hint="A pasted link is only a reference — paste the JD text below so gap analysis is possible." />
        <Textarea
          label="Job description text"
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          rows={10}
          placeholder="Paste the full job description here so gap analysis and resume suggestions are accurate..."
          hint={jdText.trim().length > 0 && jdText.trim().length < 200 ? "This looks short — paste the full posting for a reliable match." : undefined}
        />
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={!company.trim() || !role.trim()}>
          Save job
        </Button>
      </div>
    </Drawer>
  );
}
