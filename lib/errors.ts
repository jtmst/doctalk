export const ERROR_CODES = {
  AUTH_ERROR: "AUTH_ERROR",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  REFRESH_FAILED: "REFRESH_FAILED",
  DRIVE_NOT_FOUND: "DRIVE_NOT_FOUND",
  DRIVE_PERMISSION_DENIED: "DRIVE_PERMISSION_DENIED",
  DRIVE_ERROR: "DRIVE_ERROR",
  INGESTION_FOLDER_TOO_LARGE: "INGESTION_FOLDER_TOO_LARGE",
  INGESTION_TOO_MANY_FILES: "INGESTION_TOO_MANY_FILES",
  INGESTION_ERROR: "INGESTION_ERROR",
  VECTOR_STORE_ERROR: "VECTOR_STORE_ERROR",
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

export class DocTalkError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
  ) {
    super(message);
    this.name = "DocTalkError";
  }
}

export class AuthError extends DocTalkError {
  constructor(message: string, code: ErrorCode = ERROR_CODES.AUTH_ERROR) {
    super(message, code);
    this.name = "AuthError";
  }
}

export class DriveError extends DocTalkError {
  constructor(message: string, code: ErrorCode = ERROR_CODES.DRIVE_ERROR) {
    super(message, code);
    this.name = "DriveError";
  }
}

export class IngestionError extends DocTalkError {
  constructor(message: string, code: ErrorCode = ERROR_CODES.INGESTION_ERROR) {
    super(message, code);
    this.name = "IngestionError";
  }
}

export class VectorStoreError extends DocTalkError {
  constructor(message: string, code: ErrorCode = ERROR_CODES.VECTOR_STORE_ERROR) {
    super(message, code);
    this.name = "VectorStoreError";
  }
}

const SAFE_MESSAGES: Partial<Record<ErrorCode, string>> = {
  AUTH_ERROR: "Authentication failed",
  TOKEN_EXPIRED: "Session expired — please sign in again",
  REFRESH_FAILED: "Session expired — please sign in again",
  DRIVE_NOT_FOUND: "Folder not found or inaccessible",
  DRIVE_PERMISSION_DENIED: "You don't have access to this folder",
  DRIVE_ERROR: "Something went wrong accessing Google Drive",
  VECTOR_STORE_ERROR: "Something went wrong — please try again",
  INGESTION_ERROR: "Something went wrong during ingestion",
};

export function safeErrorMessage(error: DocTalkError): string {
  return SAFE_MESSAGES[error.code] ?? error.message;
}

export function errorToStatus(error: DocTalkError): number {
  const statusMap: Record<ErrorCode, number> = {
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
  return statusMap[error.code];
}
