"use client";

import { Contact } from "@/lib/schema";
import { Card, Badge } from "@/components/ui/Primitives";
import { formatDateDisplay, todayISO } from "@/lib/dateTime";

export function ContactCard({ contact, onOpen }: { contact: Contact; onOpen: () => void }) {
  const overdue = contact.followUpDate && contact.followUpDate < todayISO();
  return (
    <Card className="cursor-pointer hover:border-accent/40" onClick={onOpen}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-ink">{contact.name}</p>
          <p className="text-sm text-muted">
            {[contact.role, contact.company].filter(Boolean).join(" at ")}
          </p>
        </div>
        {contact.followUpDate && <Badge tone={overdue ? "warn" : "neutral"}>Follow up {formatDateDisplay(contact.followUpDate)}</Badge>}
      </div>
      {contact.relationship && <p className="mt-2 text-sm text-muted">{contact.relationship}</p>}
    </Card>
  );
}
