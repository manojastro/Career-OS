"use client";

import { useState } from "react";
import { Plus, Trash2, Sparkles } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { Button, Input, Select, Textarea, Badge } from "@/components/ui/Primitives";
import { useStore } from "@/lib/store/StoreContext";
import { createInterview, updateInterviewFields, addPrepTask, togglePrepTask, addInterviewQuestion } from "@/lib/domain/commands";
import { Interview, InterviewRoundSchema } from "@/lib/schema";
import { newId } from "@/lib/ids";

const ROUND_OPTIONS = InterviewRoundSchema.options;

const STARTER_PREP_TEMPLATE = [
  "Review the JD requirements marked Partial or Missing and prepare a response for each",
  "Prepare a 2-minute walkthrough of your flagship project (problem, architecture, outcome)",
  "Prepare an answer on deployment and observability for your projects",
  "Prepare an answer on evaluation approach — how you know your system works",
  "Prepare an answer on security considerations in your projects",
  "Prepare an answer on cost trade-offs in your architecture choices",
  "Prepare 2-3 questions to ask the interviewer",
];

export function InterviewDrawer({ open, onClose, interview }: { open: boolean; onClose: () => void; interview?: Interview }) {
  const { state, run, pushToast } = useStore();
  const isNew = !interview;
  const [company, setCompany] = useState(interview?.company ?? "");
  const [jobId, setJobId] = useState(interview?.jobId ?? "");
  const [roundType, setRoundType] = useState(interview?.roundType ?? "technical");
  const [scheduledAt, setScheduledAt] = useState(interview?.scheduledAt?.slice(0, 16) ?? "");
  const [feedback, setFeedback] = useState(interview?.feedback ?? "");
  const [weaknessInput, setWeaknessInput] = useState("");
  const [weaknesses, setWeaknesses] = useState(interview?.weaknesses ?? []);
  const [newQuestion, setNewQuestion] = useState("");

  function handleCreate() {
    if (!company.trim()) return;
    const result = run((s) =>
      createInterview(
        s,
        {
          company: company.trim(),
          jobId: jobId || undefined,
          roundType,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        },
        { actor: "user" }
      )
    );
    pushToast("success", `Scheduled interview with ${company}`);
    onClose();
  }

  function saveMeta() {
    if (!interview) return;
    run((s) =>
      updateInterviewFields(
        s,
        interview.id,
        { company: company.trim(), jobId: jobId || undefined, roundType, scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined, feedback: feedback.trim() || undefined, weaknesses },
        { actor: "user" }
      )
    );
  }

  function generatePrep() {
    if (!interview) return;
    const existingTexts = new Set(interview.prepTasks.map((p) => p.text));
    for (const text of STARTER_PREP_TEMPLATE) {
      if (!existingTexts.has(text)) {
        run((s) => addPrepTask(s, interview.id, text, { actor: "user" }));
      }
    }
    pushToast("success", "Added starter prep checklist.");
  }

  function addQuestion() {
    if (!interview || !newQuestion.trim()) return;
    run((s) => addInterviewQuestion(s, interview.id, newQuestion.trim(), "self", { actor: "user" }));
    setNewQuestion("");
  }

  function persistWeaknesses(next: string[]) {
    setWeaknesses(next);
    if (interview) {
      run((s) => updateInterviewFields(s, interview.id, { weaknesses: next }, { actor: "user" }));
    }
  }

  function addWeakness() {
    if (!weaknessInput.trim()) return;
    persistWeaknesses([...weaknesses, weaknessInput.trim()]);
    setWeaknessInput("");
  }

  return (
    <Drawer open={open} onClose={onClose} title={isNew ? "Schedule interview" : `${interview!.company} — ${interview!.roundType.replace("_", " ")}`} wide>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Company" value={company} onChange={(e) => setCompany(e.target.value)} onBlur={saveMeta} />
          <Select label="Round type" value={roundType} onChange={(e) => setRoundType(e.target.value as any)} onBlur={saveMeta}>
            {ROUND_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Linked job (optional)" value={jobId} onChange={(e) => setJobId(e.target.value)} onBlur={saveMeta}>
            <option value="">None</option>
            {state.jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.role} — {j.company}
              </option>
            ))}
          </Select>
          <Input label="Scheduled at" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} onBlur={saveMeta} />
        </div>

        {isNew ? (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate} disabled={!company.trim()}>
              Schedule
            </Button>
          </div>
        ) : (
          <>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-sm font-medium text-ink">Preparation checklist</p>
                <Button size="sm" variant="ghost" onClick={generatePrep}>
                  <Sparkles size={14} /> Generate starter checklist
                </Button>
              </div>
              <div className="space-y-1.5">
                {interview!.prepTasks.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={p.done} onChange={() => run((s) => togglePrepTask(s, interview!.id, p.id, { actor: "user" }))} className="accent-accent" />
                    <span className={p.done ? "text-muted line-through" : ""}>{p.text}</span>
                  </label>
                ))}
                {interview!.prepTasks.length === 0 && <p className="text-sm text-muted">No prep tasks yet.</p>}
              </div>
            </div>

            <div>
              <p className="mb-1 text-sm font-medium text-ink">Practice questions</p>
              <div className="space-y-2">
                {interview!.questions.map((q) => (
                  <div key={q.id} className="rounded-lg border border-line p-2 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-ink">{q.question}</span>
                      <Badge tone={q.source === "real_interviewer" ? "warn" : q.source === "ai_practice" ? "accent" : "neutral"}>{q.source.replace("_", " ")}</Badge>
                    </div>
                    {q.feedback && <p className="mt-1 text-xs text-muted">Feedback: {q.feedback}</p>}
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <Input placeholder="Add a question to practice" value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addQuestion())} />
                <Button size="sm" onClick={addQuestion}>
                  <Plus size={14} />
                </Button>
              </div>
            </div>

            <div>
              <p className="mb-1 text-sm font-medium text-ink">Repeated weaknesses to target</p>
              <div className="flex flex-wrap gap-1.5">
                {weaknesses.map((w, i) => (
                  <Badge key={i} tone="warn">
                    {w}
                    <button onClick={() => persistWeaknesses(weaknesses.filter((_, idx) => idx !== i))} className="ml-1">
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <Input placeholder="e.g. Rambles on system design answers" value={weaknessInput} onChange={(e) => setWeaknessInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addWeakness())} />
                <Button size="sm" onClick={addWeakness}>
                  <Plus size={14} />
                </Button>
              </div>
            </div>

            <Textarea label="Real interviewer feedback (optional)" value={feedback} onChange={(e) => setFeedback(e.target.value)} onBlur={saveMeta} rows={2} />
          </>
        )}
      </div>
    </Drawer>
  );
}
