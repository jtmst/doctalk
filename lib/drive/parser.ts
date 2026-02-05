import { PDFParse } from "pdf-parse";
import { SUPPORTED_MIME_TYPES, type SupportedMimeType } from "@/lib/config";
import type { ParseResult } from "./types";

export async function parseFile(
  content: string | Buffer,
  mimeType: string,
  fileName: string,
): Promise<ParseResult> {
  if (!(mimeType in SUPPORTED_MIME_TYPES)) {
    return {
      text: "",
      skipped: true,
      reason: `Unsupported file type (${mimeType}) for "${fileName}"`,
    };
  }

  const supported = mimeType as SupportedMimeType;

  switch (supported) {
    // Google Workspace files arrive pre-exported as text
    case "application/vnd.google-apps.document":
    case "application/vnd.google-apps.spreadsheet":
    case "application/vnd.google-apps.presentation":
    case "text/plain":
    case "text/markdown":
    case "text/csv": {
      const text = typeof content === "string" ? content : content.toString("utf-8");
      return { text: text.trim(), skipped: false };
    }
    case "application/pdf":
      return parsePdf(content, fileName);
  }
}

async function parsePdf(
  content: string | Buffer,
  fileName: string,
): Promise<ParseResult> {
  const data = typeof content === "string" ? Buffer.from(content) : content;

  let parser: PDFParse | null = null;
  try {
    parser = new PDFParse({ data });
    const result = await parser.getText();
    const text = result.text.trim();

    if (!text) {
      return {
        text: "",
        skipped: true,
        reason: `PDF "${fileName}" contains no extractable text (may be scanned/image-based)`,
      };
    }

    return { text, skipped: false };
  } catch {
    return {
      text: "",
      skipped: true,
      reason: `Failed to parse PDF "${fileName}" — file may be corrupted or password-protected`,
    };
  } finally {
    await parser?.destroy();
  }
}
