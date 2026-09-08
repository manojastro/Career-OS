"use client";

import { useState } from "react";
import { Plus, Trash2, Copy } from "lucide-react";
import { useStore } from "@/lib/store/StoreContext";
import { updateResumeProfile, updateResumeBullet } from "@/lib/domain/commands";
import { Button, Input, Textarea, Card, SectionHeading } from "@/components/ui/Primitives";
import { newId } from "@/lib/ids";
import { renderResumeText } from "@/lib/calc/resumeText";

export function MasterProfileEditor() {
  const { state, run, pushToast } = useStore();
  const profile = state.resumeProfile;
  const [headline, setHeadline] = useState(profile.headline);
  const [summary, setSummary] = useState(profile.summary);
  const [skillsListText, setSkillsListText] = useState(profile.skillsList.join(", "));
  const [newEmployer, setNewEmployer] = useState("");
  const [newTitle, setNewTitle] = useState("");

  function saveTopLevel() {
    run((s) =>
      updateResumeProfile(
        s,
        {
          headline,
          summary,
          skillsList: skillsListText
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean),
        },
        { actor: "user" }
      )
    );
  }

  function addExperience() {
    if (!newEmployer.trim() || !newTitle.trim()) return;
    run((s) =>
      updateResumeProfile(
        s,
        { experience: [...profile.experience, { id: newId("exp"), employer: newEmployer.trim(), title: newTitle.trim(), bullets: [] }] },
        { actor: "user" }
      )
    );
    setNewEmployer("");
    setNewTitle("");
  }

  function removeExperience(expId: string) {
    run((s) => updateResumeProfile(s, { experience: profile.experience.filter((e) => e.id !== expId) }, { actor: "user" }));
  }

  function addBullet(expId: string) {
    run((s) =>
      updateResumeProfile(
        s,
        {
          experience: profile.experience.map((e) =>
            e.id === expId ? { ...e, bullets: [...e.bullets, { id: newId("bullet"), text: "", isApprovedOriginal: false, needsMetric: true, history: [] }] } : e
          ),
        },
        { actor: "user" }
      )
    );
  }

  function removeBullet(expId: string, bulletId: string) {
    run((s) =>
      updateResumeProfile(
        s,
        { experience: profile.experience.map((e) => (e.id === expId ? { ...e, bullets: e.bullets.filter((b) => b.id !== bulletId) } : e)) },
        { actor: "user" }
      )
    );
  }

  function saveBulletText(expId: string, bulletId: string, text: string) {
    run((s) => updateResumeBullet(s, expId, bulletId, text, { actor: "user" }));
  }

  function toggleBulletFlag(expId: string, bulletId: string, flag: "isApprovedOriginal" | "needsMetric") {
    run((s) =>
      updateResumeProfile(
        s,
        {
          experience: profile.experience.map((e) =>
            e.id === expId ? { ...e, bullets: e.bullets.map((b) => (b.id === bulletId ? { ...b, [flag]: !b[flag] } : b)) } : e
          ),
        },
        { actor: "user" }
      )
    );
  }

  async function copyResume() {
    await navigator.clipboard.writeText(renderResumeText(profile));
    pushToast("success", "Copied resume text to clipboard.");
  }

  return (
    <div className="space-y-4">
      <SectionHeading
        title="Master profile"
        subtitle="Your single source of truth. Job-specific versions are built from this."
        action={
          <Button size="sm" variant="secondary" onClick={copyResume}>
            <Copy size={14} /> Copy as text
          </Button>
        }
      />
      <Card className="space-y-3">
        <Input label="Headline" value={headline} onChange={(e) => setHeadline(e.target.value)} onBlur={saveTopLevel} placeholder="e.g. IT Operations professional transitioning into AI Engineering" />
        <Textarea label="Summary" value={summary} onChange={(e) => setSummary(e.target.value)} onBlur={saveTopLevel} rows={3} />
        <Input label="Skills (comma separated)" value={skillsListText} onChange={(e) => setSkillsListText(e.target.value)} onBlur={saveTopLevel} />
      </Card>

      <div className="space-y-3">
        {profile.experience.map((exp) => (
          <Card key={exp.id}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-ink">{exp.title}</p>
                <p className="text-sm text-muted">{exp.employer}</p>
              </div>
              <button onClick={() => removeExperience(exp.id)} aria-label="Remove experience" className="text-muted hover:text-danger">
                <Trash2 size={16} />
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {exp.bullets.map((b) => (
                <div key={b.id} className="rounded-lg border border-line p-2">
                  <Textarea defaultValue={b.text} onBlur={(e) => saveBulletText(exp.id, b.id, e.target.value)} rows={2} placeholder="Describe what you did and the measured outcome" />
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <div className="flex gap-3">
                      <label className="flex items-center gap-1">
                        <input type="checkbox" checked={b.isApprovedOriginal} onChange={() => toggleBulletFlag(exp.id, b.id, "isApprovedOriginal")} className="accent-accent" />
                        Approved
                      </label>
                      <label className="flex items-center gap-1">
                        <input type="checkbox" checked={b.needsMetric} onChange={() => toggleBulletFlag(exp.id, b.id, "needsMetric")} className="accent-accent" />
                        Needs a real metric
                      </label>
                    </div>
                    <button onClick={() => removeBullet(exp.id, b.id)} className="text-muted hover:text-danger">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
              <Button size="sm" variant="ghost" onClick={() => addBullet(exp.id)}>
                <Plus size={14} /> Add bullet
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Card className="space-y-2">
        <p className="text-sm font-medium text-ink">Add experience entry</p>
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Employer" value={newEmployer} onChange={(e) => setNewEmployer(e.target.value)} />
          <Input placeholder="Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
        </div>
        <Button size="sm" onClick={addExperience} disabled={!newEmployer.trim() || !newTitle.trim()}>
          <Plus size={14} /> Add experience
        </Button>
      </Card>
    </div>
  );
}
