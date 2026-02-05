import type { SUPPORTED_MIME_TYPES, SupportedMimeType } from "@/lib/config";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number | null;
  webViewLink: string;
}

export type ExportFormat = Extract<
  (typeof SUPPORTED_MIME_TYPES)[SupportedMimeType],
  string
>;

export interface ParseResult {
  text: string;
  skipped: boolean;
  reason?: string;
}
