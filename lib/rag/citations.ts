import { CITATION_SNIPPET_LENGTH } from "@/lib/config";

export interface Citation {
  fileName: string;
  fileUrl: string;
  snippet: string;
  mimeType: string;
  pageNumber?: number;
}

export interface SourceMeta {
  fileName: string;
  fileUrl: string;
  mimeType: string;
  text: string;
  pageNumber?: number;
}

export function parseCitations(text: string): string[] {
  const seen = new Set<string>();
  for (const match of text.matchAll(/\[Source:\s*([^\]]+)\]/g)) {
    seen.add(match[1].trim());
  }
  return [...seen];
}

export function mapCitationsToUrls(
  fileNames: string[],
  sources: SourceMeta[],
): Citation[] {
  const sourceMap = new Map<string, SourceMeta>();
  for (const src of sources) {
    if (!sourceMap.has(src.fileName)) {
      sourceMap.set(src.fileName, src);
    }
  }

  return fileNames.flatMap((name) => {
    const src = sourceMap.get(name);
    if (!src) return [];
    const snippet =
      src.text.length > CITATION_SNIPPET_LENGTH
        ? src.text.slice(0, CITATION_SNIPPET_LENGTH) + "…"
        : src.text;
    return [{
      fileName: name,
      fileUrl: src.fileUrl,
      snippet,
      mimeType: src.mimeType,
      pageNumber: src.pageNumber,
    }];
  });
}
