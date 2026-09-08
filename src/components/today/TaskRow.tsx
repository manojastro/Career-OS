"use client";

import { useState } from "react";
import { Check, PlayCircle, AlertOctagon, CalendarClock } from "lucide-react";
import { TaskItem } from "@/lib/schema";
import { useStore } from "@/lib/store/StoreContext";
import { setTaskStatus, moveTaskDate } from "@/lib/domain/commands";
import { Badge } from "@/components/ui/Primitives";
import { formatDateDisplay, todayISO } from "@/lib/dateTime";
import { cx } from "@/lib/utils";

export function TaskRow({
  task,
  reason,
  onOpen,
}: {
  task: TaskItem;
  reason?: string;
  onOpen: () => void;
}) {
  const { run, pushToast } = useStore();
  const [showDatePicker, setShowDatePicker] = useState(false);

  function complete() {
    try {
      run((s) => setTaskStatus(s, task.id, "done", { actor: "user" }));
      pushToast("success", `Nice — "${task.title}" done.`);
    } catch {
      // toast shown; likely needs evidence, open the drawer so they can add it
      onOpen();
    }
  }

  function start() {
    run((s) => setTaskStatus(s, task.id, "in_progress", { actor: "user" }));
  }

  function block() {
    run((s) => setTaskStatus(s, task.id, "blocked", { actor: "user" }));
    pushToast("info", `Marked blocked. Open the task to note why.`);
  }

  function moveDate(date: string) {
    run((s) => moveTaskDate(s, task.id, date, { actor: "user" }));
    setShowDatePicker(false);
    pushToast("success", `Moved to ${formatDateDisplay(date)}`);
  }

  const isDone = task.status === "done";

  return (
    <div className={cx("flex items-start gap-3 rounded-lg border border-line bg-white px-3 py-2.5", isDone && "opacity-60")}>
      <button
        onClick={complete}
        disabled={isDone}
        aria-label={isDone ? "Completed" : `Mark "${task.title}" done`}
        className={cx(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
          isDone ? "border-accent bg-accent text-white" : "border-line hover:border-accent"
        )}
      >
        {isDone && <Check size={12} />}
      </button>

      <button onClick={onOpen} className="flex-1 text-left">
        <p className={cx("text-sm font-medium text-ink", isDone && "line-through")}>{task.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge tone="neutral">{task.estimateMinutes}m</Badge>
          {task.status === "blocked" && <Badge tone="danger">Blocked</Badge>}
          {task.status === "in_progress" && <Badge tone="accent">In progress</Badge>}
          {task.dueDate && <Badge tone={task.dueDate < todayISO() && !isDone ? "warn" : "neutral"}>Due {formatDateDisplay(task.dueDate)}</Badge>}
          {task.requiresEvidence && task.evidenceIds.length === 0 && <Badge tone="warn">Needs evidence</Badge>}
        </div>
        {reason && <p className="mt-1 text-xs text-muted">{reason}</p>}
      </button>

      {!isDone && (
        <div className="flex shrink-0 items-center gap-1">
          {task.status !== "in_progress" && (
            <button onClick={start} aria-label="Start task" title="Start" className="rounded p-1 text-muted hover:bg-black/5 hover:text-accent">
              <PlayCircle size={16} />
            </button>
          )}
          <button onClick={block} aria-label="Mark blocked" title="Blocked" className="rounded p-1 text-muted hover:bg-black/5 hover:text-warn">
            <AlertOctagon size={16} />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowDatePicker((v) => !v)}
              aria-label="Move to date"
              title="Move to date"
              className="rounded p-1 text-muted hover:bg-black/5 hover:text-ink"
            >
              <CalendarClock size={16} />
            </button>
            {showDatePicker && (
              <input
                type="date"
                autoFocus
                min={todayISO()}
                className="absolute right-0 top-7 z-10 rounded-lg border border-line bg-white p-1.5 text-xs shadow-lg"
                onChange={(e) => e.target.value && moveDate(e.target.value)}
                onBlur={() => setShowDatePicker(false)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
