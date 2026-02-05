import { Index } from "@upstash/vector";
import { VectorStoreError } from "@/lib/errors";
import type { ChunkMetadata, ChunkWithMetadata, SearchResult } from "./types";

const UPSERT_BATCH_SIZE = 100;

let index: Index | null = null;

function getIndex(): Index {
  if (!index) {
    index = new Index();
  }
  return index;
}

const NAMESPACE_SEPARATOR = ":";

export function getNamespaceKey(userId: string, folderId: string): string {
  if (userId.includes(NAMESPACE_SEPARATOR) || folderId.includes(NAMESPACE_SEPARATOR)) {
    throw new VectorStoreError(
      "Invalid namespace key components",
      "VECTOR_STORE_ERROR",
    );
  }
  return `${userId}${NAMESPACE_SEPARATOR}${folderId}`;
}

export async function upsertChunks(
  namespaceKey: string,
  chunks: ChunkWithMetadata[],
): Promise<void> {
  const ns = getIndex().namespace(namespaceKey);

  try {
    for (let i = 0; i < chunks.length; i += UPSERT_BATCH_SIZE) {
      const batch = chunks.slice(i, i + UPSERT_BATCH_SIZE);
      await ns.upsert(
        batch.map((chunk) => ({
          id: chunk.id,
          data: chunk.text,
          metadata: chunk.metadata as unknown as Record<string, unknown>,
        })),
      );
    }
  } catch (error) {
    throw new VectorStoreError(
      `Failed to upsert chunks: ${error instanceof Error ? error.message : "Unknown error"}`,
      "VECTOR_STORE_ERROR",
    );
  }
}

export async function queryChunks(
  namespaceKey: string,
  query: string,
  topK: number,
): Promise<SearchResult[]> {
  const ns = getIndex().namespace(namespaceKey);

  try {
    const results = await ns.query({
      data: query,
      topK,
      includeMetadata: true,
      includeData: true,
      includeVectors: false,
    });

    return results
      .filter((r) => r.metadata && r.data)
      .map((r) => ({
        id: String(r.id),
        score: r.score,
        text: r.data!,
        metadata: r.metadata as unknown as ChunkMetadata,
      }));
  } catch (error) {
    throw new VectorStoreError(
      `Failed to query vectors: ${error instanceof Error ? error.message : "Unknown error"}`,
      "VECTOR_STORE_ERROR",
    );
  }
}

export async function getNamespaceInfo(
  namespaceKey: string,
): Promise<{ vectorCount: number }> {
  try {
    const info = await getIndex().info();
    const nsInfo = info.namespaces[namespaceKey];
    return { vectorCount: nsInfo?.vectorCount ?? 0 };
  } catch (error) {
    throw new VectorStoreError(
      `Failed to get namespace info: ${error instanceof Error ? error.message : "Unknown error"}`,
      "VECTOR_STORE_ERROR",
    );
  }
}

export async function deleteNamespace(
  namespaceKey: string,
): Promise<void> {
  try {
    await getIndex().deleteNamespace(namespaceKey);
  } catch (error) {
    throw new VectorStoreError(
      `Failed to delete namespace: ${error instanceof Error ? error.message : "Unknown error"}`,
      "VECTOR_STORE_ERROR",
    );
  }
}
