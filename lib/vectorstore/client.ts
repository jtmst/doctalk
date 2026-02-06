import { Index } from "@upstash/vector";
import { VectorStoreError, ERROR_CODES } from "@/lib/errors";
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
      ERROR_CODES.VECTOR_STORE_ERROR,
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
    wrapVectorError(error, "upsert chunks");
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
    wrapVectorError(error, "query vectors");
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
    wrapVectorError(error, "get namespace info");
  }
}

export async function deleteNamespace(
  namespaceKey: string,
): Promise<void> {
  try {
    await getIndex().deleteNamespace(namespaceKey);
  } catch (error) {
    wrapVectorError(error, "delete namespace");
  }
}

function wrapVectorError(error: unknown, action: string): never {
  const detail = error instanceof Error ? error.message : "Unknown error";
  throw new VectorStoreError(`Failed to ${action}: ${detail}`, ERROR_CODES.VECTOR_STORE_ERROR);
}
