"use client";

import { useState } from "react";
import { Drawer, ConfirmDialog } from "@/components/ui/Drawer";
import { Button, Input, Select, Textarea } from "@/components/ui/Primitives";
import { EvidencePicker } from "@/components/shared/EvidencePicker";
import { useStore } from "@/lib/store/StoreContext";
import { createTask, updateTaskFields, deleteTask, setTaskStatus } from "@/lib/domain/commands";
import { TaskItem } from "@/lib/schema";
import { todayISO } from "@/lib/dateTime";

export function TaskDrawer({ open, onClose, task }: { open: boolean; onClose: () => void; task?: TaskItem }) {
  const { state, run, pushToast } = useStore();
  const isNew = !task;
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [estimateMinutes, setEstimateMinutes] = useState(task?.estimateMinutes ?? 30);
  const [dueDate, setDueDate] = useState(task?.dueDate ?? "");
  const [priority, setPriority] = useState(task?.priority ?? 3);
  const [requiresEvidence, setRequiresEvidence] = useState(task?.requiresEvidence ?? false);
  const [evidenceIds, setEvidenceIds] = useState<string[]>(task?.evidenceIds ?? []);
  const [linkedProjectId, setLinkedProjectId] = useState(task?.linkedProjectId ?? "");
  const [linkedSkillId, setLinkedSkillId] = useState(task?.linkedSkillId ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  function resetAndClose() {
    onClose();
  }

  function handleSave() {
    if (!title.trim()) return;
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      estimateMinutes: Number(estimateMinutes) || 30,
      dueDate: dueDate || undefined,
      priority: Number(priority),
      requiresEvidence,
      evidenceIds,
      linkedProjectId: linkedProjectId || undefined,
      linkedSkillId: linkedSkillId || undefined,
    };
    try {
      if (isNew) {
        run((s) => createTask(s, payload, { actor: "user" }));
        pushToast("success", `Added task "${payload.title}"`);
      } else {
        run((s) => updateTaskFields(s, task.id, payload, { actor: "user", expectedUpdatedAt: task.updatedAt }));
        pushToast("success", `Updated task "${payload.title}"`);
      }
      resetAndClose();
    } catch {
      // toast already shown by store.run
    }
  }

  function handleStatus(status: TaskItem["status"]) {
    if (!task) return;
    try {
      run((s) => setTaskStatus(s, task.id, status, { actor: "user" }));
      pushToast("success", status === "done" ? `Marked "${task.title}" done` : `Task updated`);
      if (status === "done") resetAndClose();
    } catch {
      // toast already shown
    }
  }

  function handleDelete() {
    if (!task) return;
    run((s) => deleteTask(s, task.id, { actor: "user" }));
    pushToast("success", `Deleted "${task.title}"`);
    setConfirmDelete(false);
    resetAndClose();
  }

  return (
    <Drawer open={open} onClose={resetAndClose} title={isNew ? "Add task" : "Edit task"}>
      <div className="space-y-4">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to happen?" />
        <Textarea label="Notes (optional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Estimate (minutes)"
            type="number"
            min={5}
            value={estimateMinutes}
            onChange={(e) => setEstimateMinutes(Number(e.target.value))}
          />
          <Input label="Due date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} min={todayISO()} />
        </div>
        <Select label="Priority" value={priority} onChange={(e) => setPriority(Number(e.target.value))}>
          <option value={1}>1 — Most important</option>
          <option value={2}>2</option>
          <option value={3}>3 — Normal</option>
          <option value={4}>4</option>
          <option value={5}>5 — Someday</option>
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Linked project (optional)" value={linkedProjectId} onChange={(e) => setLinkedProjectId(e.target.value)}>
            <option value="">None</option>
            {state.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Select label="Linked skill (optional)" value={linkedSkillId} onChange={(e) => setLinkedSkillId(e.target.value)}>
            <option value="">None</option>
            {state.skills.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={requiresEvidence} onChange={(e) => setRequiresEvidence(e.target.checked)} className="accent-accent" />
          Require evidence before this can be marked done
        </label>
        {(requiresEvidence || evidenceIds.length > 0) && (
          <div>
            <p className="mb-1 text-sm font-medium text-ink">Evidence</p>
            <EvidencePicker selectedIds={evidenceIds} onChange={setEvidenceIds} />
          </div>
        )}

        {!isNew && task && (
          <div className="space-y-2 border-t border-line pt-4">
            <p className="text-sm font-medium text-ink">Quick status</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={task.status === "in_progress" ? "primary" : "secondary"} onClick={() => handleStatus("in_progress")}>
                Start
              </Button>
              <Button size="sm" variant={task.status === "done" ? "primary" : "secondary"} onClick={() => handleStatus("done")}>
                Done
              </Button>
              <Button size="sm" variant={task.status === "blocked" ? "primary" : "secondary"} onClick={() => handleStatus("blocked")}>
                Blocked
              </Button>
              <Button size="sm" variant="danger" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete this task?"
        description="This can't be undone from here, though it stays in the audit trail."
        confirmLabel="Delete"
        danger
      />

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={resetAndClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={!title.trim()}>
          {isNew ? "Add task" : "Save changes"}
        </Button>
      </div>
    </Drawer>
  );
}
