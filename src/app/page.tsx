"use client";

import { useMemo, useState } from "react";
import { Plus, Clock3, FilePlus2, ClipboardPaste, ChevronDown, ChevronUp } from "lucide-react";
import { useStore } from "@/lib/store/StoreContext";
import { buildDailyPlan } from "@/lib/calc/planner";
import { todayISO } from "@/lib/dateTime";
import { ROLE_LABELS } from "@/lib/schema";
import { Button, Card, EmptyState, SectionHeading } from "@/components/ui/Primitives";
import { TaskRow } from "@/components/today/TaskRow";
import { TaskDrawer } from "@/components/today/TaskDrawer";
import { ProgressStrip } from "@/components/today/ProgressStrip";
import { CheckInCard } from "@/components/today/CheckInCard";
import { LogWorkModal } from "@/components/today/LogWorkModal";
import { QuickAddEvidenceModal } from "@/components/today/QuickAddEvidenceModal";
import { AddJobModal } from "@/components/shared/AddJobModal";
import { TaskItem } from "@/lib/schema";

export default function TodayPage() {
  const { state } = useStore();
  const today = todayISO();
  const plan = useMemo(() => buildDailyPlan(state, today), [state, today]);

  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | undefined>(undefined);
  const [logWorkOpen, setLogWorkOpen] = useState(false);
  const [addEvidenceOpen, setAddEvidenceOpen] = useState(false);
  const [addJobOpen, setAddJobOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);

  function openNewTask() {
    setEditingTask(undefined);
    setTaskDrawerOpen(true);
  }
  function openTask(t: TaskItem) {
    setEditingTask(t);
    setTaskDrawerOpen(true);
  }

  const availableHours = (plan.availableMinutes / 60).toFixed(1).replace(/\.0$/, "");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-ink">Career &amp; Growth Notes</h1>
        <p className="text-sm text-muted">Deployed-Proof Career Blueprint</p>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Today you have</p>
          <p className="text-lg font-semibold text-ink">
            {availableHours}h available · focused on {ROLE_LABELS[state.profile.primaryRole]}
          </p>
          {plan.overdueCount > 0 && <p className="mt-1 text-sm text-warn">{plan.overdueCount} task(s) overdue — shown first below.</p>}
          {plan.overCapacity && <p className="mt-1 text-sm text-warn">Today&apos;s top priorities exceed your available time. Consider moving one.</p>}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Button variant="secondary" onClick={openNewTask} className="justify-start">
          <Plus size={16} /> Add task
        </Button>
        <Button variant="secondary" onClick={() => setLogWorkOpen(true)} className="justify-start">
          <Clock3 size={16} /> Log work
        </Button>
        <Button variant="secondary" onClick={() => setAddEvidenceOpen(true)} className="justify-start">
          <FilePlus2 size={16} /> Add evidence
        </Button>
        <Button variant="secondary" onClick={() => setAddJobOpen(true)} className="justify-start">
          <ClipboardPaste size={16} /> Paste JD
        </Button>
      </div>

      <div>
        <SectionHeading title="Today's priorities" subtitle="Your three most important next steps." />
        {plan.priorityTasks.length === 0 ? (
          <EmptyState
            title="Nothing scheduled yet"
            description="Add your first task to get a plan for today."
            action={
              <Button onClick={openNewTask}>
                <Plus size={16} /> Add task
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {plan.priorityTasks.map((t) => (
              <TaskRow key={t.id} task={t} reason={t.urgencyReason} onOpen={() => openTask(t)} />
            ))}
          </div>
        )}
      </div>

      {plan.otherTasks.length > 0 && (
        <div>
          <button
            onClick={() => setShowMore((v) => !v)}
            className="flex items-center gap-1 text-sm font-medium text-muted hover:text-ink"
          >
            {showMore ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {showMore ? "Hide" : "Show"} {plan.otherTasks.length} more task{plan.otherTasks.length === 1 ? "" : "s"}
          </button>
          {showMore && (
            <div className="mt-2 space-y-2">
              {plan.otherTasks.map((t) => (
                <TaskRow key={t.id} task={t} onOpen={() => openTask(t)} />
              ))}
            </div>
          )}
        </div>
      )}

      <ProgressStrip />
      <CheckInCard />

      {/* Mounted only while open so each form starts from the record it was opened for,
          never from whatever was last edited in the same drawer. */}
      {taskDrawerOpen && <TaskDrawer open onClose={() => setTaskDrawerOpen(false)} task={editingTask} />}
      {logWorkOpen && <LogWorkModal open onClose={() => setLogWorkOpen(false)} />}
      {addEvidenceOpen && <QuickAddEvidenceModal open onClose={() => setAddEvidenceOpen(false)} />}
      {addJobOpen && <AddJobModal open onClose={() => setAddJobOpen(false)} />}
    </div>
  );
}
