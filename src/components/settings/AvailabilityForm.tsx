"use client";

import { useStore } from "@/lib/store/StoreContext";
import { updateProfile } from "@/lib/domain/commands";
import { Card, SectionHeading, Select, Input } from "@/components/ui/Primitives";
import { Weekday } from "@/lib/schema";

const WEEKDAYS: { key: Weekday; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

export function AvailabilityForm() {
  const { state, run } = useStore();
  const availability = state.profile.weeklyAvailability;

  function updateDay(day: Weekday, patch: Partial<{ hours: number; dayType: "office" | "wfh" | "weekend" }>) {
    const current = availability[day] ?? { hours: 0, dayType: "office" as const };
    run((s) =>
      updateProfile(
        s,
        { weeklyAvailability: { ...availability, [day]: { ...current, ...patch } } },
        { actor: "user" }
      )
    );
  }

  return (
    <Card>
      <SectionHeading title="Weekly availability" subtitle="Drives how many minutes of work Today plans for. Change anytime — no guilt trips." />
      <div className="space-y-2">
        {WEEKDAYS.map(({ key, label }) => {
          const day = availability[key] ?? { hours: 0, dayType: "office" as const };
          return (
            <div key={key} className="grid grid-cols-3 items-center gap-2">
              <span className="text-sm text-ink">{label}</span>
              <Input
                type="number"
                min={0}
                max={16}
                step="0.5"
                value={day.hours}
                onChange={(e) => updateDay(key, { hours: Number(e.target.value) })}
                aria-label={`${label} hours available`}
              />
              <Select value={day.dayType} onChange={(e) => updateDay(key, { dayType: e.target.value as any })} aria-label={`${label} day type`}>
                <option value="office">Office</option>
                <option value="wfh">WFH</option>
                <option value="weekend">Weekend</option>
              </Select>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
