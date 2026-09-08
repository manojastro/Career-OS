import { z } from "zod";
import { AppState, AuditEntry } from "@/lib/schema";
import { newId } from "@/lib/ids";
import { nowISO } from "@/lib/dateTime";
import { CommandContext, CommandResult, EntityArrayKey, EntityKey, ENTITY_ARRAY_KEYS } from "@/lib/domain/types";
import { ConflictError, NotFoundError } from "@/lib/domain/errors";

export function buildAudit(
  ctx: CommandContext,
  action: string,
  entityType: EntityKey,
  entityId: string,
  before: unknown,
  after: unknown,
  summary: string
): AuditEntry {
  return {
    id: newId("audit"),
    at: nowISO(),
    actor: ctx.actor,
    action,
    entityType,
    entityId,
    before: before ?? null,
    after: after ?? null,
    opId: ctx.opId,
    summary,
    undone: false,
  };
}

/** Returns a cached result if this opId was already applied and not since undone. */
export function tryDedupe<T>(state: AppState, ctx: CommandContext, key: EntityArrayKey): CommandResult<T> | null {
  if (!ctx.opId) return null;
  const prior = state.auditLog.find((a) => a.opId === ctx.opId);
  if (!prior || prior.undone) return null;
  const arr = (state as any)[key] as Array<{ id: string }>;
  const entity = arr.find((r) => r.id === prior.entityId);
  if (!entity) return null;
  return { state, entity: entity as T, audit: prior, deduped: true };
}

export function findEntity<T extends { id: string }>(state: AppState, key: EntityArrayKey, id: string): T {
  const arr = (state as any)[key] as T[];
  const entity = arr.find((r) => r.id === id);
  if (!entity) throw new NotFoundError(key, id);
  return entity;
}

export function makeCreate<T extends { id: string; createdAt: string; updatedAt: string }>(
  entityKey: EntityKey,
  schema: z.ZodTypeAny,
  idPrefix: string,
  summarize: (entity: T) => string
) {
  const arrayKey = ENTITY_ARRAY_KEYS[entityKey];
  return (state: AppState, input: Record<string, unknown>, ctx: CommandContext): CommandResult<T> => {
    const dedup = tryDedupe<T>(state, ctx, arrayKey);
    if (dedup) return dedup;
    const now = nowISO();
    const entity = schema.parse({ id: newId(idPrefix), createdAt: now, updatedAt: now, ...input }) as T;
    const audit = buildAudit(ctx, `${idPrefix}.create`, entityKey, entity.id, null, entity, summarize(entity));
    const arr = [...((state as any)[arrayKey] as T[]), entity];
    return {
      state: { ...state, [arrayKey]: arr, auditLog: [...state.auditLog, audit] },
      entity,
      audit,
      deduped: false,
    };
  };
}

export function makeUpdate<T extends { id: string; updatedAt: string }>(
  entityKey: EntityKey,
  schema: z.ZodTypeAny,
  idPrefix: string,
  summarize: (before: T, after: T) => string
) {
  const arrayKey = ENTITY_ARRAY_KEYS[entityKey];
  return (
    state: AppState,
    id: string,
    patch: Record<string, unknown>,
    ctx: CommandContext & { expectedUpdatedAt?: string }
  ): CommandResult<T> => {
    const dedup = tryDedupe<T>(state, ctx, arrayKey);
    if (dedup) return dedup;
    const existing = findEntity<T>(state, arrayKey, id);
    if (ctx.expectedUpdatedAt && ctx.expectedUpdatedAt !== existing.updatedAt) {
      throw new ConflictError(entityKey, id, existing);
    }
    const updated = schema.parse({ ...existing, ...patch, id, updatedAt: nowISO() }) as T;
    const audit = buildAudit(ctx, `${idPrefix}.update`, entityKey, id, existing, updated, summarize(existing, updated));
    const arr = ((state as any)[arrayKey] as T[]).map((r) => (r.id === id ? updated : r));
    return {
      state: { ...state, [arrayKey]: arr, auditLog: [...state.auditLog, audit] },
      entity: updated,
      audit,
      deduped: false,
    };
  };
}
