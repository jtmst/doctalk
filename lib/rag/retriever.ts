import { RETRIEVAL } from "@/lib/config";
import { queryChunks } from "@/lib/vectorstore";
import type { SearchResult } from "@/lib/vectorstore";

export async function retrieveContext(
  namespaceKey: string,
  question: string,
  topK = RETRIEVAL.topK,
): Promise<SearchResult[]> {
  const results = await queryChunks(namespaceKey, question, topK);
  return rerank(results, RETRIEVAL.rerankTopK);
}

function rerank(results: SearchResult[], limit: number): SearchResult[] {
  const sorted = [...results].sort((a, b) => b.score - a.score);
  const kept: SearchResult[] = [];

  for (const result of sorted) {
    if (kept.length >= limit) break;

    const isRedundant = kept.some(
      (k) =>
        k.metadata.fileId === result.metadata.fileId &&
        Math.abs(k.metadata.chunkIndex - result.metadata.chunkIndex) <= 1,
    );

    if (!isRedundant) {
      kept.push(result);
    }
  }

  return kept;
}
