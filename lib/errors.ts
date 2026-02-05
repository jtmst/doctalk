export class DocTalkError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "DocTalkError";
  }
}

export class AuthError extends DocTalkError {
  constructor(message: string, code = "AUTH_ERROR") {
    super(message, code);
    this.name = "AuthError";
  }
}

export class DriveError extends DocTalkError {
  constructor(message: string, code = "DRIVE_ERROR") {
    super(message, code);
    this.name = "DriveError";
  }
}

export class IngestionError extends DocTalkError {
  constructor(message: string, code = "INGESTION_ERROR") {
    super(message, code);
    this.name = "IngestionError";
  }
}

export class VectorStoreError extends DocTalkError {
  constructor(message: string, code = "VECTOR_STORE_ERROR") {
    super(message, code);
    this.name = "VectorStoreError";
  }
}

export function errorToStatus(error: DocTalkError): number {
  const statusMap: Record<string, number> = {
    AUTH_ERROR: 401,
    TOKEN_EXPIRED: 401,
    REFRESH_FAILED: 401,
    DRIVE_NOT_FOUND: 404,
    DRIVE_PERMISSION_DENIED: 403,
    DRIVE_ERROR: 502,
    INGESTION_FOLDER_TOO_LARGE: 413,
    INGESTION_TOO_MANY_FILES: 413,
    INGESTION_ERROR: 422,
    VECTOR_STORE_ERROR: 502,
  };
  return statusMap[error.code] ?? 500;
}
