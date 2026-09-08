"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useStore } from "@/lib/store/StoreContext";
import { computeReadiness } from "@/lib/calc/readiness";
import { RoleId, ROLE_LABELS } from "@/lib/schema";
import { Card, Badge } from "@/components/ui/Primitives";

export function RoleComparisonList({ excludeRoles }: { excludeRoles: RoleId[] }) {
  const { state } = useStore();
  const [open, setOpen] = useState(false);
  const otherRoles = (Object.keys(ROLE_LABELS) as RoleId[]).filter((r) => !excludeRoles.includes(r));

  return (
    <div>
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-1 text-sm font-medium text-muted hover:text-ink">
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        Compare with other target roles
      </button>
      {open && (
        <Card className="mt-2 space-y-2">
          {otherRoles.map((r) => {
            const result = computeReadiness(state, r);
            return (
              <div key={r} className="flex items-center justify-between text-sm">
                <span className="text-ink">{ROLE_LABELS[r]}</span>
                {result.overallStatus === "assessed" ? (
                  <span className="font-medium text-ink">{result.overallScore}/100</span>
                ) : (
                  <Badge tone="neutral">Not enough evidence</Badge>
                )}
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
