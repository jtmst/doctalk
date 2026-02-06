import { google, type drive_v3 } from "googleapis";
import { SUPPORTED_MIME_TYPES, INGESTION_LIMITS } from "@/lib/config";
import { DriveError } from "@/lib/errors";
import type { DriveFile, ExportFormat } from "./types";

const FOLDER_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

export function createDriveClient(accessToken: string): drive_v3.Drive {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.drive({ version: "v3", auth });
}

export async function listFiles(
  client: drive_v3.Drive,
  folderId: string,
): Promise<DriveFile[]> {
  if (!FOLDER_ID_PATTERN.test(folderId)) {
    throw new DriveError("Invalid folder ID format", "DRIVE_NOT_FOUND");
  }

  const files: DriveFile[] = [];
  let pageToken: string | undefined;

  try {
    do {
      const res = await client.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: "nextPageToken, files(id, name, mimeType, size, webViewLink)",
        pageSize: 100,
        pageToken,
      });

      for (const f of res.data.files ?? []) {
        if (!f.id || !f.name || !f.mimeType) continue;

        const isSupportedMime = f.mimeType in SUPPORTED_MIME_TYPES;
        const isWorkspaceFile = f.mimeType.startsWith(
          "application/vnd.google-apps.",
        );

        files.push({
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          size: isSupportedMime && isWorkspaceFile
            ? INGESTION_LIMITS.estimatedWorkspaceFileSizeBytes
            : f.size
              ? Number(f.size)
              : null,
          webViewLink: f.webViewLink ?? `https://drive.google.com/file/d/${f.id}/view`,
        });
      }

      pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken);
  } catch (error) {
    if (isGoogleApiError(error)) {
      if (error.code === 404) {
        throw new DriveError(
          "Folder not found — check the link and try again",
          "DRIVE_NOT_FOUND",
        );
      }
      if (error.code === 403) {
        throw new DriveError(
          "You don't have permission to access this folder",
          "DRIVE_PERMISSION_DENIED",
        );
      }
    }
    throw new DriveError("Failed to list files in folder", "DRIVE_ERROR");
  }

  return files;
}

export async function exportFile(
  client: drive_v3.Drive,
  fileId: string,
  exportMimeType: ExportFormat,
): Promise<string> {
  try {
    const res = await client.files.export({
      fileId,
      mimeType: exportMimeType,
    });
    return String(res.data);
  } catch (error) {
    if (isGoogleApiError(error)) {
      if (error.code === 404) {
        throw new DriveError("File not found — it may have been deleted", "DRIVE_NOT_FOUND");
      }
      if (error.code === 403) {
        throw new DriveError("You don't have permission to export this file", "DRIVE_PERMISSION_DENIED");
      }
    }
    throw new DriveError("Failed to export file", "DRIVE_ERROR");
  }
}

export async function downloadFile(
  client: drive_v3.Drive,
  fileId: string,
): Promise<Buffer> {
  try {
    const res = await client.files.get(
      { fileId, alt: "media" },
      { responseType: "arraybuffer" },
    );
    return Buffer.from(res.data as ArrayBuffer);
  } catch (error) {
    if (isGoogleApiError(error)) {
      if (error.code === 404) {
        throw new DriveError("File not found — it may have been deleted", "DRIVE_NOT_FOUND");
      }
      if (error.code === 403) {
        throw new DriveError("You don't have permission to download this file", "DRIVE_PERMISSION_DENIED");
      }
    }
    throw new DriveError("Failed to download file", "DRIVE_ERROR");
  }
}

export async function getFolderName(
  client: drive_v3.Drive,
  folderId: string,
): Promise<string> {
  try {
    const res = await client.files.get({ fileId: folderId, fields: "name" });
    return res.data.name ?? folderId;
  } catch {
    return folderId;
  }
}

function isGoogleApiError(
  error: unknown,
): error is { code: number } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "number"
  );
}
