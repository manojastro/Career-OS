/**
 * Migration registry: each entry upgrades raw persisted JSON from its key
 * version to version+1. Run in order until the data reaches
 * CURRENT_SCHEMA_VERSION, then it is validated against AppStateSchema.
 *
 * There is only one schema version today. When the schema changes, add the
 * next migration here rather than mutating old field meanings in place.
 */
export const migrations: Record<number, (raw: any) => any> = {
  // 1: (raw) => ({ ...raw, schemaVersion: 2, /* transform fields */ }),
};

export function runMigrations(raw: any, targetVersion: number): any {
  let data = raw;
  let version = typeof data?.schemaVersion === "number" ? data.schemaVersion : 1;
  while (version < targetVersion) {
    const step = migrations[version];
    if (!step) break;
    data = step(data);
    version = data.schemaVersion ?? version + 1;
  }
  return data;
}
