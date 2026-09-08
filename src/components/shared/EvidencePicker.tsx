"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useStore } from "@/lib/store/StoreContext";
import { createEvidence } from "@/lib/domain/commands";
import { EvidenceType } from "@/lib/schema";
import { Button, Input, Select, Textarea } from "@/components/ui/Primitives";

const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  repository: "Repository",
  deployment: "Deployment",
  demo_recording: "Demo recording",
  evaluation_result: "Evaluation result",
  test_result: "Test result",
  performance_measurement: "Performance measurement",
  cost_measurement: "Cost measurement",
  architecture_note: "Architecture note",
  case_study: "Case study",
  certificate: "Certificate",
  assessment: "Assessment",
  other: "Other",
};

export function EvidencePicker({
  selectedIds,
  onChange,
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const { state, run, pushToast } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<EvidenceType>("repository");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  }

  function submitNew() {
    if (!title.trim()) return;
    const result = run((s) => createEvidence(s, { title: title.trim(), type, url: url.trim() || undefined, description: description.trim() || undefined }, { actor: "user" }));
    onChange([...selectedIds, result.entity.id]);
    pushToast("success", `Added evidence "${result.entity.title}"`);
    setTitle("");
    setUrl("");
    setDescription("");
    setShowForm(false);
  }

  return (
    <div className="space-y-2">
      {state.evidence.length === 0 && !showForm && <p className="text-sm text-muted">No evidence recorded yet.</p>}
      <div className="max-h-40 space-y-1.5 overflow-y-auto">
        {state.evidence.map((e) => (
          <label key={e.id} className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-sm">
            <input type="checkbox" checked={selectedIds.includes(e.id)} onChange={() => toggle(e.id)} className="accent-accent" />
            <span className="flex-1 truncate">{e.title}</span>
            <span className="shrink-0 text-xs text-muted">{EVIDENCE_TYPE_LABELS[e.type]}</span>
          </label>
        ))}
      </div>
      {!showForm ? (
        <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(true)}>
          <Plus size={14} /> Add new evidence
        </Button>
      ) : (
        <div className="space-y-2 rounded-lg border border-line p-3">
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
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={submitNew} disabled={!title.trim()}>
              Save evidence
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export { EVIDENCE_TYPE_LABELS };
