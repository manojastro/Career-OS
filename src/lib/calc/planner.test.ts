import { describe, it, expect } from "vitest";
import { createDefaultState } from "@/lib/storage/seed";
import { buildDailyPlan } from "@/lib/calc/planner";
import { createTask } from "@/lib/domain/commands";

describe("buildDailyPlan", () => {
  it("prioritizes an overdue task above a low-priority future one", () => {
    let state = createDefaultState();
    state = createTask(state, { title: "Someday task", priority: 5 }, { actor: "user" }).state;
    state = createTask(state, { title: "Overdue task", priority: 3, dueDate: "2020-01-01" }, { actor: "user" }).state;

    const plan = buildDailyPlan(state, "2026-01-15");
    expect(plan.priorityTasks[0]!.title).toBe("Overdue task");
    expect(plan.overdueCount).toBe(1);
  });

  it("surfaces a blocked task even over a higher numeric priority task", () => {
    let state = createDefaultState();
    state = createTask(state, { title: "Normal task", priority: 1 }, { actor: "user" }).state;
    const blocked = createTask(state, { title: "Blocked task", priority: 5 }, { actor: "user" });
    state = blocked.state;
    // mark the second one blocked directly via the tasks array for this pure calc test
    state = { ...state, tasks: state.tasks.map((t) => (t.id === blocked.entity.id ? { ...t, status: "blocked" as const } : t)) };

    const plan = buildDailyPlan(state, "2026-01-15");
    expect(plan.priorityTasks[0]!.title).toBe("Blocked task");
  });

  it("never plans more than the top 3 as priority tasks", () => {
    let state = createDefaultState();
    for (let i = 0; i < 6; i++) {
      state = createTask(state, { title: `Task ${i}` }, { actor: "user" }).state;
    }
    const plan = buildDailyPlan(state, "2026-01-15");
    expect(plan.priorityTasks.length).toBe(3);
    expect(plan.otherTasks.length).toBe(3);
  });
});
