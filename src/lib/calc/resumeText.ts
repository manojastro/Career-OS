import { ResumeMasterProfile, ResumeVersion } from "@/lib/schema";

/** Plain-text rendering used for the copyable resume output and the printable view. */
export function renderResumeText(profile: ResumeMasterProfile, version?: ResumeVersion): string {
  const lines: string[] = [];
  if (profile.headline) lines.push(profile.headline, "");
  const summary = version?.summary || profile.summary;
  if (summary) lines.push(summary, "");

  if (version && version.bulletsSnapshot.length > 0) {
    for (const exp of version.bulletsSnapshot) {
      lines.push(`${exp.title} — ${exp.employer}`);
      for (const b of exp.bullets) lines.push(`  • ${b}`);
      lines.push("");
    }
  } else {
    for (const exp of profile.experience) {
      const range = [exp.startDate, exp.endDate].filter(Boolean).join(" – ");
      lines.push(`${exp.title} — ${exp.employer}${range ? ` (${range})` : ""}`);
      for (const b of exp.bullets) lines.push(`  • ${b.text}${b.needsMetric ? " [add a metric]" : ""}`);
      lines.push("");
    }
  }

  if (profile.skillsList.length > 0) {
    lines.push("Skills: " + profile.skillsList.join(", "), "");
  }
  if (profile.educationCerts.length > 0) {
    lines.push("Education & Certifications:");
    for (const c of profile.educationCerts) lines.push(`  • ${c}`);
  }

  return lines.join("\n").trim();
}
