"use client";

import { Interview } from "@/lib/schema";
import { Card, Badge } from "@/components/ui/Primitives";
import { formatDateTimeDisplay } from "@/lib/dateTime";

export function InterviewCard({ interview, onOpen }: { interview: Interview; onOpen: () => void }) {
  const doneCount = interview.prepTasks.filter((p) => p.done).length;
  return (
    <Card className="cursor-pointer hover:border-accent/40" onClick={onOpen}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-ink">{interview.company}</p>
          <p className="text-sm capitalize text-muted">{interview.roundType.replace(/_/g, " ")}</p>
        </div>
        {interview.scheduledAt && <Badge tone="accent">{formatDateTimeDisplay(interview.scheduledAt)}</Badge>}
      </div>
      {interview.prepTasks.length > 0 && (
        <p className="mt-2 text-sm text-muted">
          {doneCount}/{interview.prepTasks.length} prep tasks done
        </p>
      )}
      {interview.weaknesses.length > 0 && <p className="mt-1 text-xs text-warn">Focus: {interview.weaknesses.join(", ")}</p>}
    </Card>
  );
}
