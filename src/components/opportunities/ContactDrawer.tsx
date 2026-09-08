"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { Button, Input, Textarea } from "@/components/ui/Primitives";
import { useStore } from "@/lib/store/StoreContext";
import { createContact, updateContactFields } from "@/lib/domain/commands";
import { Contact } from "@/lib/schema";
import { draftOutreach } from "@/lib/calc/outreach";
import { todayISO } from "@/lib/dateTime";

export function ContactDrawer({ open, onClose, contact }: { open: boolean; onClose: () => void; contact?: Contact }) {
  const { state, run, pushToast } = useStore();
  const isNew = !contact;
  const [name, setName] = useState(contact?.name ?? "");
  const [relationship, setRelationship] = useState(contact?.relationship ?? "");
  const [company, setCompany] = useState(contact?.company ?? "");
  const [role, setRole] = useState(contact?.role ?? "");
  const [profileUrl, setProfileUrl] = useState(contact?.profileUrl ?? "");
  const [notes, setNotes] = useState(contact?.notes ?? "");
  const [followUpDate, setFollowUpDate] = useState(contact?.followUpDate ?? "");
  const [draft, setDraft] = useState<string | null>(null);

  function payload() {
    return {
      name: name.trim(),
      relationship: relationship.trim(),
      company: company.trim() || undefined,
      role: role.trim() || undefined,
      profileUrl: profileUrl.trim() || undefined,
      notes: notes.trim() || undefined,
      followUpDate: followUpDate || undefined,
    };
  }

  function handleSave() {
    if (!name.trim()) return;
    if (isNew) {
      run((s) => createContact(s, payload(), { actor: "user" }));
      pushToast("success", `Added contact "${name}"`);
    } else {
      run((s) => updateContactFields(s, contact.id, payload(), { actor: "user" }));
      pushToast("success", "Saved.");
    }
    onClose();
  }

  function generateDraft() {
    const tempContact: Contact = contact ?? {
      id: "temp",
      name: name.trim() || "there",
      relationship: relationship.trim(),
      company: company.trim() || undefined,
      role: role.trim() || undefined,
      createdAt: "",
      updatedAt: "",
    };
    setDraft(draftOutreach(tempContact, state.profile));
  }

  async function copyDraft() {
    if (!draft) return;
    await navigator.clipboard.writeText(draft);
    pushToast("success", "Copied draft to clipboard.");
  }

  return (
    <Drawer open={open} onClose={onClose} title={isNew ? "Add contact" : contact!.name}>
      <div className="space-y-4">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Relationship / context" value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder="e.g. Former colleague, met at meetup" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Company (optional)" value={company} onChange={(e) => setCompany(e.target.value)} />
          <Input label="Role (optional)" value={role} onChange={(e) => setRole(e.target.value)} />
        </div>
        <Input label="Profile link (optional)" value={profileUrl} onChange={(e) => setProfileUrl(e.target.value)} placeholder="https://linkedin.com/in/..." />
        <Input label="Follow-up date (optional)" type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} min={todayISO()} />
        <Textarea label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />

        <div className="border-t border-line pt-3">
          <Button size="sm" variant="secondary" onClick={generateDraft} disabled={!name.trim()}>
            Draft outreach message
          </Button>
          {draft && (
            <div className="mt-2 space-y-2">
              <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={8} />
              <Button size="sm" variant="ghost" onClick={copyDraft}>
                <Copy size={14} /> Copy
              </Button>
              <p className="text-xs text-muted">This is a draft you send yourself — the portal does not send messages on your behalf.</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={!name.trim()}>
          {isNew ? "Add contact" : "Save changes"}
        </Button>
      </div>
    </Drawer>
  );
}
