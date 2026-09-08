import { AppState, TaskItem } from "@/lib/schema";
import { daysBetween, todayISO, weekdayOf } from "@/lib/dateTime";

export interface TaskWithScore extends TaskItem {
  urgencyScore: number;
  urgencyReason: string;
}

export interface DailyPlan {
  dateISO: string;
  availableMinutes: number;
  priorityTasks: TaskWithScore[];
  otherTasks: TaskWithScore[];
  overdueCount: number;
  overCapacity: boolean;
}

function scoreTask(task: TaskItem, state: AppState, dateISO: string): TaskWithScore {
  let score = (6 - task.priority) * 10;
  let reason = `Priority ${task.priority}`;

  if (task.status === "blocked") {
    score += 500;
    reason = "Blocked — needs unblocking";
  }

  if (task.linkedInterviewId) {
    const interview = state.interviews.find((i) => i.id === task.linkedInterviewId);
    if (interview?.scheduledAt) {
      const days = daysBetween(dateISO, interview.scheduledAt.slice(0, 10));
      if (days >= 0 && days <= 2) {
        score += 1000 - days * 100;
        reason = `Interview in ${days === 0 ? "today" : `${days}d`}`;
      }
    }
  }

  if (task.linkedJobId) {
    const job = state.jobs.find((j) => j.id === task.linkedJobId);
    if (job?.followUpDate) {
      const days = daysBetween(dateISO, job.followUpDate);
      if (days <= 0) {
        score += 400;
        reason = "Follow-up due";
      }
    }
  }

  if (task.dueDate) {
    const days = daysBetween(task.dueDate, dateISO);
    if (days > 0) {
      score += 300 + Math.min(days * 10, 100);
      reason = `Overdue ${days}d`;
    } else if (days === 0) {
      score += 200;
      reason = "Due today";
    }
  }

  return { ...task, urgencyScore: score, urgencyReason: reason };
}

export function buildDailyPlan(state: AppState, dateISO: string = todayISO()): DailyPlan {
  const weekday = weekdayOf(dateISO, state.profile.timezone);
  const availability = state.profile.weeklyAvailability[weekday];
  const availableMinutes = (availability?.hours ?? 0) * 60;

  const openTasks = state.tasks.filter((t) => t.status !== "done");
  const overdueCount = openTasks.filter((t) => t.dueDate && t.dueDate < dateISO).length;

  const scored = openTasks
    .map((t) => scoreTask(t, state, dateISO))
    .sort((a, b) => b.urgencyScore - a.urgencyScore || (a.createdAt < b.createdAt ? -1 : 1));

  const priorityTasks = scored.slice(0, 3);
  const otherTasks = scored.slice(3);
  const usedMinutes = priorityTasks.reduce((sum, t) => sum + t.estimateMinutes, 0);

  return {
    dateISO,
    availableMinutes,
    priorityTasks,
    otherTasks,
    overdueCount,
    overCapacity: availableMinutes > 0 && usedMinutes > availableMinutes,
  };
}
