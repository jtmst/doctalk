import { SUPPORTED_MIME_TYPES, INGESTION_LIMITS, type SupportedMimeType } from "@/lib/config";
import { IngestionError } from "@/lib/errors";
import { createDriveClient, listFiles, exportFile, downloadFile, parseFile } from "@/lib/drive";
import type { ExportFormat } from "@/lib/drive";
import { chunkDocument } from "./chunker";
import { upsertChunks } from "@/lib/vectorstore";

export type IngestionEvent =
  | { type: "started"; totalFiles: number }
  | { type: "progress"; filesProcessed: number; totalFiles: number; currentFile: string; chunksCreated: number }
  | { type: "file_skipped"; fileName: string; reason: string }
  | { type: "file_error"; fileName: string; error: string }
  | { type: "complete"; totalFiles: number; filesProcessed: number; chunksCreated: number; skipped: number; errors: number }
  | { type: "error"; message: string };

interface IngestParams {
  folderId: string;
  accessToken: string;
  namespaceKey: string;
  onProgress: (event: IngestionEvent) => void;
}

interface IngestResult {
  totalFiles: number;
  filesProcessed: number;
  chunksCreated: number;
  skipped: number;
  errors: number;
}

export async function ingestFolder(params: IngestParams): Promise<IngestResult> {
  const { folderId, accessToken, namespaceKey, onProgress } = params;

  const client = createDriveClient(accessToken);
  const files = await listFiles(client, folderId);

  if (files.length > INGESTION_LIMITS.maxFiles) {
    throw new IngestionError(
      `This folder has too many files (${files.length}, limit is ${INGESTION_LIMITS.maxFiles})`,
      "INGESTION_TOO_MANY_FILES",
    );
  }

  const totalSize = files.reduce((sum, f) => sum + (f.size ?? 0), 0);
  if (totalSize > INGESTION_LIMITS.maxAggregateSizeBytes) {
    const sizeMB = Math.round(totalSize / 1024 / 1024);
    const limitMB = Math.round(INGESTION_LIMITS.maxAggregateSizeBytes / 1024 / 1024);
    throw new IngestionError(
      `This folder is too large (estimated ${sizeMB}MB, limit is ${limitMB}MB)`,
      "INGESTION_FOLDER_TOO_LARGE",
    );
  }

  onProgress({ type: "started", totalFiles: files.length });

  let filesProcessed = 0;
  let chunksCreated = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of files) {
    try {
      if (!(file.mimeType in SUPPORTED_MIME_TYPES)) {
        skipped++;
        onProgress({ type: "file_skipped", fileName: file.name, reason: `Unsupported file type (${file.mimeType})` });
        continue;
      }

      const exportFormat = SUPPORTED_MIME_TYPES[file.mimeType as SupportedMimeType];
      let parseResult;

      if (typeof exportFormat === "string") {
        const text = await exportFile(client, file.id, exportFormat as ExportFormat);
        parseResult = await parseFile(text, file.mimeType, file.name);
      } else {
        const buffer = await downloadFile(client, file.id);
        parseResult = await parseFile(buffer, file.mimeType, file.name);
      }

      if (parseResult.skipped) {
        skipped++;
        onProgress({ type: "file_skipped", fileName: file.name, reason: parseResult.reason ?? "Could not extract text" });
        continue;
      }

      const chunks = chunkDocument(parseResult.text, {
        fileId: file.id,
        fileName: file.name,
        fileUrl: file.webViewLink,
        mimeType: file.mimeType,
        folderId,
      });

      await upsertChunks(namespaceKey, chunks);

      filesProcessed++;
      chunksCreated += chunks.length;
      onProgress({
        type: "progress",
        filesProcessed,
        totalFiles: files.length,
        currentFile: file.name,
        chunksCreated,
      });
    } catch (error) {
      errors++;
      onProgress({
        type: "file_error",
        fileName: file.name,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const result: IngestResult = { totalFiles: files.length, filesProcessed, chunksCreated, skipped, errors };

  onProgress({
    type: "complete",
    totalFiles: result.totalFiles,
    filesProcessed: result.filesProcessed,
    chunksCreated: result.chunksCreated,
    skipped: result.skipped,
    errors: result.errors,
  });

  return result;
}
