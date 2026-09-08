"use client";

import { useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Button, Input, Select } from "@/components/ui/Primitives";
import { useStore } from "@/lib/store/StoreContext";
import { logTaskTime } from "@/lib/domain/commands";

export function LogWorkModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, run, pushToast } = useStore();
  const openTasks = state.tasks.filter((t) => t.status !== "done");
  const [taskId, setTaskId] = useState("");
  const [minutes, setMinutes] = useState(30);

  function handleSave() {
    if (!taskId) return;
    const task = state.tasks.find((t) => t.id === taskId);
    run((s) => logTaskTime(s, taskId, Number(minutes), { actor: "user" }));
    pushToast("success", `Logged ${minutes}m on "${task?.title}"`);
    onClose();
  }

  return (
    <Drawer open={open} onClose={onClose} title="Log work">
      {openTasks.length === 0 ? (
        <p className="text-sm text-muted">No open tasks to log time against. Add a task first.</p>
      ) : (
        <div className="space-y-4">
          <Select label="Task" value={taskId} onChange={(e) => setTaskId(e.target.value)}>
            <option value="">Choose a task…</option>
            {openTasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </Select>
          <Input label="Minutes worked" type="number" min={5} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
        </div>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={!taskId}>
          Log time
        </Button>
      </div>
    </Drawer>
  );
}
