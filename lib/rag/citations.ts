import { CITATION_SNIPPET_LENGTH } from "@/lib/config";

export interface Citation {
  fileName: string;
  fileUrl: string;
  mimeType: string;
  pageNumbers: number[];
  snippet: string;
}

export interface SourceMeta {
  fileName: string;
  fileUrl: string;
  mimeType: string;
  text: string;
  pageNumbers?: number[];
}

export function parseCitations(text: string): string[] {
  const seen = new Set<string>();
  for (const match of text.matchAll(/\[Source:\s*([^\]]+)\]/g)) {
    const raw = match[1].trim();
    const cleaned = raw.replace(/\s*\(p\.[\d, ]+\)$/, "");
    seen.add(cleaned);
  }
  return [...seen];
}

function relevantSnippet(chunkText: string, responseText: string): string {
  const len = CITATION_SNIPPET_LENGTH;
  if (chunkText.length <= len) return chunkText;

  const responseWords = new Set(
    responseText.toLowerCase().split(/\W+/).filter((w) => w.length > 4),
  );

  let bestPos = 0;
  let bestScore = 0;
  const step = 40;

  for (let i = 0; i <= chunkText.length - len; i += step) {
    const window = chunkText.slice(i, i + len).toLowerCase();
    let score = 0;
    for (const word of responseWords) {
      if (window.includes(word)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestPos = i;
    }
  }

  const snippet = chunkText.slice(bestPos, bestPos + len).trim();
  const prefix = bestPos > 0 ? "…" : "";
  const suffix = bestPos + len < chunkText.length ? "…" : "";
  return prefix + snippet + suffix;
}

export function mapCitationsToUrls(
  fileNames: string[],
  sources: SourceMeta[],
  responseText: string,
): Citation[] {
  return fileNames.flatMap((name) => {
    const matches = sources.filter((s) => s.fileName === name);
    if (matches.length === 0) return [];

    const src = matches[0];
    const pages = src.pageNumbers ?? [];
    const snippet = relevantSnippet(src.text, responseText);

    return [{
      fileName: name,
      fileUrl: src.fileUrl,
      mimeType: src.mimeType,
      pageNumbers: pages,
      snippet,
    }];
  });
}
