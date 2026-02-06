import type { ChunkMetadata } from "@/lib/vectorstore";

export interface Citation {
  fileName: string;
  fileUrl: string;
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
  chunkMetadata: ChunkMetadata[],
): Citation[] {
  const urlMap = new Map<string, string>();
  for (const meta of chunkMetadata) {
    if (!urlMap.has(meta.fileName)) {
      urlMap.set(meta.fileName, meta.fileUrl);
    }
  }

  return fileNames.flatMap((name) => {
    const url = urlMap.get(name);
    return url ? [{ fileName: name, fileUrl: url }] : [];
  });
}
