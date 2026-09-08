import { Contact, Profile, ROLE_LABELS } from "@/lib/schema";

/** Deterministic outreach draft grounded only in real profile fields — never invents referrals or prior conversations. */
export function draftOutreach(contact: Contact, profile: Profile): string {
  const name = profile.name || "your name here";
  const roleLabel = ROLE_LABELS[profile.primaryRole];
  const companyMention = contact.company ? ` I noticed your work at ${contact.company}.` : "";

  return [
    `Hi ${contact.name},`,
    "",
    `I'm ${name}, currently transitioning from IT Operations into ${roleLabel} work.${companyMention}`,
    contact.relationship ? `We're connected as: ${contact.relationship}.` : "",
    "",
    "I'd value a short conversation about your experience in this space, or any advice on how you'd approach this transition. Happy to work around your schedule — even 15 minutes would help.",
    "",
    "Thanks for considering it,",
    name,
  ]
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
    .join("\n");
}
