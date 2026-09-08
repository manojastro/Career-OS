"use client";

import { useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Button, Input, Select, Textarea } from "@/components/ui/Primitives";
import { useStore } from "@/lib/store/StoreContext";
import { createEvidence, linkEvidence } from "@/lib/domain/commands";
import { EvidenceType } from "@/lib/schema";
import { EVIDENCE_TYPE_LABELS } from "@/components/shared/EvidencePicker";

export function QuickAddEvidenceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, run, pushToast } = useStore();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<EvidenceType>("repository");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [skillId, setSkillId] = useState("");

  function reset() {
    setTitle("");
    setUrl("");
    setDescription("");
    setProjectId("");
    setSkillId("");
  }

  function handleSave() {
    if (!title.trim()) return;
    const result = run((s) =>
      createEvidence(s, { title: title.trim(), type, url: url.trim() || undefined, description: description.trim() || undefined }, { actor: "user" })
    );
    if (projectId || skillId) {
      run((s) => linkEvidence(s, result.entity.id, { projectId: projectId || undefined, skillId: skillId || undefined }, { actor: "user" }));
    }
    pushToast("success", `Added evidence "${result.entity.title}"`);
    reset();
    onClose();
  }

  return (
    <Drawer open={open} onClose={onClose} title="Add evidence">
      <div className="space-y-4">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Deployed RAG API on Render" />
        <Select label="Type" value={type} onChange={(e) => setType(e.target.value as EvidenceType)}>
          {Object.entries(EVIDENCE_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Input label="Link (optional)" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
        <Textarea label="Notes (optional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Link to project (optional)" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">None</option>
            {state.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Select label="Link to skill (optional)" value={skillId} onChange={(e) => setSkillId(e.target.value)}>
            <option value="">None</option>
            {state.skills.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={!title.trim()}>
          Save evidence
        </Button>
      </div>
    </Drawer>
  );
}
