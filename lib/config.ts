export const INGESTION_LIMITS = {
  maxFiles: 50,
  maxFileSizeBytes: 10 * 1024 * 1024,
  maxAggregateSizeBytes: 30 * 1024 * 1024,
  estimatedWorkspaceFileSizeBytes: 100 * 1024, // Workspace files don't report size in Drive API
} as const;

export const CHUNKING = {
  chunkSize: 2000, // ~512 tokens
  chunkOverlap: 200, // ~50 tokens
  separators: ["\n\n", "\n", ". ", " ", ""] as readonly string[],
} as const;

export const RETRIEVAL = {
  topK: 10,
  rerankTopK: 5,
} as const;

export const SUPPORTED_MIME_TYPES = {
  // Google Workspace → export formats
  "application/vnd.google-apps.document": "text/plain",
  "application/vnd.google-apps.spreadsheet": "text/csv",
  "application/vnd.google-apps.presentation": "text/plain",
  // Direct download types
  "application/pdf": null,
  "text/plain": null,
  "text/markdown": null,
  "text/csv": null,
} as const;

export type SupportedMimeType = keyof typeof SUPPORTED_MIME_TYPES;

export const RECENT_FOLDERS_MAX = 10;

export const CHAT_LIMITS = {
  maxMessages: 50,
  maxMessageLength: 12_000, // ~3000 tokens per message
} as const;

export const CITATION_SNIPPET_LENGTH = 180;

export const DEFAULT_MODEL = "google/gemini-2.0-flash-001";
