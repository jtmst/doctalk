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
  const buf = typeof content === "string" ? Buffer.from(content) : content;
  const data = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);

  let parser: PDFParse | null = null;
  try {
    parser = new PDFParse({ data });
    const result = await parser.getText();

    const separator = "\n\n";
    const pages = result.pages;

    const pageOffsets: Array<{ pageNumber: number; startOffset: number }> = [];
    let raw = "";
    for (let i = 0; i < pages.length; i++) {
      if (i > 0) raw += separator;
      pageOffsets.push({ pageNumber: pages[i].num, startOffset: raw.length });
      raw += pages[i].text;
    }
    const text = raw.trim();
    const trimDelta = raw.length - raw.trimStart().length;
    for (const po of pageOffsets) {
      po.startOffset = Math.max(0, po.startOffset - trimDelta);
    }

    if (!text) {
      return {
        text: "",
        skipped: true,
        reason: `PDF "${fileName}" contains no extractable text (may be scanned/image-based)`,
      };
    }

    return { text, skipped: false, pageOffsets };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(`[pdf-parse] ${fileName}: ${detail}`);
    return {
      text: "",
      skipped: true,
      reason: `Failed to parse PDF "${fileName}" — ${detail}`,
    };
  } finally {
    await parser?.destroy();
  }
}
