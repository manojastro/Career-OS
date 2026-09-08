export class NotFoundError extends Error {
  constructor(public entityType: string, public entityId: string) {
    super(`${entityType} "${entityId}" was not found.`);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/** Raised when an update targets a record that changed since the caller last read it. */
export class ConflictError extends Error {
  constructor(public entityType: string, public entityId: string, public currentEntity: unknown) {
    super(
      `${entityType} "${entityId}" was changed elsewhere since you last loaded it. Refresh to see the latest version before editing again.`
    );
    this.name = "ConflictError";
  }
}
