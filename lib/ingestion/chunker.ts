import { CHUNKING } from "@/lib/config";
import type { ChunkMetadata, ChunkWithMetadata } from "@/lib/vectorstore/types";

interface SplitterConfig {
  chunkSize: number;
  chunkOverlap: number;
  separators: readonly string[];
}

export class RecursiveTextSplitter {
  private readonly config: SplitterConfig;

  constructor(config?: Partial<SplitterConfig>) {
    this.config = {
      chunkSize: config?.chunkSize ?? CHUNKING.chunkSize,
      chunkOverlap: config?.chunkOverlap ?? CHUNKING.chunkOverlap,
      separators: config?.separators ?? CHUNKING.separators,
    };
  }

  split(text: string): string[] {
    return this.splitText(text, 0);
  }

  private splitText(text: string, separatorIndex: number): string[] {
    if (text.length <= this.config.chunkSize) {
      return text.trim() ? [text] : [];
    }

    const separator = this.config.separators[separatorIndex];
    if (separator === undefined) return [text];

    const parts =
      separator === "" ? [...text] : text.split(separator);

    const chunks: string[] = [];
    let current = "";

    for (const part of parts) {
      const candidate =
        current === "" ? part : current + separator + part;

      if (candidate.length > this.config.chunkSize) {
        if (current.trim()) {
          chunks.push(current);
        }

        if (part.length > this.config.chunkSize) {
          const subChunks = this.splitText(part, separatorIndex + 1);
          chunks.push(...subChunks);
          current = "";
        } else {
          current = part;
        }
      } else {
        current = candidate;
      }
    }

    if (current.trim()) {
      chunks.push(current);
    }

    return this.mergeWithOverlap(chunks);
  }

  private mergeWithOverlap(chunks: string[]): string[] {
    if (chunks.length <= 1 || this.config.chunkOverlap === 0) {
      return chunks;
    }

    const result: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      if (i === 0) {
        result.push(chunks[i]);
        continue;
      }

      const prevChunk = chunks[i - 1];
      const overlapText = prevChunk.slice(-this.config.chunkOverlap);
      const merged = overlapText + chunks[i];

      if (merged.length > this.config.chunkSize) {
        result.push(chunks[i]);
      } else {
        result.push(merged);
      }
    }

    return result;
  }
}

type PageOffset = { pageNumber: number; startOffset: number };
type DocumentMetadata = Omit<ChunkMetadata, "chunkIndex" | "totalChunks" | "pageNumber">;

interface ChunkOptions {
  splitter?: RecursiveTextSplitter;
  pageOffsets?: PageOffset[];
}

export function chunkDocument(
  text: string,
  metadata: DocumentMetadata,
  options?: ChunkOptions,
): ChunkWithMetadata[] {
  const s = options?.splitter ?? new RecursiveTextSplitter();
  const chunks = s.split(text);
  const offsets = options?.pageOffsets;

  let searchFrom = 0;

  return chunks.map((chunk, index): ChunkWithMetadata => {
    let pageNumber: number | undefined;

    if (offsets && offsets.length > 0) {
      const prefix = chunk.slice(0, 100);
      const pos = text.indexOf(prefix, searchFrom);
      if (pos !== -1) {
        searchFrom = pos + 1;
        pageNumber = lookupPage(offsets, pos);
      }
    }

    return {
      id: `${metadata.fileId}:${index}`,
      text: chunk,
      metadata: {
        fileId: metadata.fileId,
        fileName: metadata.fileName,
        fileUrl: metadata.fileUrl,
        mimeType: metadata.mimeType,
        folderId: metadata.folderId,
        chunkIndex: index,
        totalChunks: chunks.length,
        pageNumber,
      },
    };
  });
}

function lookupPage(offsets: PageOffset[], position: number): number {
  let lo = 0;
  let hi = offsets.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (offsets[mid].startOffset <= position) {
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return offsets[hi >= 0 ? hi : 0].pageNumber;
}
