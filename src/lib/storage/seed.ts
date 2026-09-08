import { AppState, CURRENT_SCHEMA_VERSION, ProfileSchema, ResumeMasterProfileSchema } from "@/lib/schema";
import { nowISO } from "@/lib/dateTime";

/** Fresh, empty state for a brand-new install. No fake history, no seeded milestones. */
export function createDefaultState(): AppState {
  const now = nowISO();
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    profile: ProfileSchema.parse({}),
    tasks: [],
    projects: [],
    skills: [],
    evidence: [],
    jobs: [],
    resumeProfile: ResumeMasterProfileSchema.parse({ updatedAt: now }),
    resumeVersions: [],
    interviews: [],
    contacts: [],
    checkIns: [],
    weeklyReviews: [],
    readinessSnapshots: [],
    auditLog: [],
    chatMessages: [],
    meta: { createdAt: now, lastOpenedAt: now },
  };
}
