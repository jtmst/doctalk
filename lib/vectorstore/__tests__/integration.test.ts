import { describe, it, expect, afterAll } from "vitest";
import {
  getNamespaceKey,
  upsertChunks,
  queryChunks,
  getNamespaceInfo,
  deleteNamespace,
} from "../client";
import type { ChunkWithMetadata } from "../types";

const TEST_NAMESPACE = getNamespaceKey("test-user", "test-folder");

const TEST_CHUNKS: ChunkWithMetadata[] = [
  {
    id: "file1:0",
    text: "TypeScript is a strongly typed programming language that builds on JavaScript.",
    metadata: {
      fileId: "file1",
      fileName: "typescript.md",
      fileUrl: "https://drive.google.com/file/d/file1/view",
      mimeType: "text/markdown",
      chunkIndex: 0,
      totalChunks: 2,
      folderId: "test-folder",
    },
  },
  {
    id: "file1:1",
    text: "React is a JavaScript library for building user interfaces. It uses a virtual DOM.",
    metadata: {
      fileId: "file1",
      fileName: "typescript.md",
      fileUrl: "https://drive.google.com/file/d/file1/view",
      mimeType: "text/markdown",
      chunkIndex: 1,
      totalChunks: 2,
      folderId: "test-folder",
    },
  },
  {
    id: "file2:0",
    text: "Next.js is a React framework for building full-stack web applications.",
    metadata: {
      fileId: "file2",
      fileName: "nextjs.txt",
      fileUrl: "https://drive.google.com/file/d/file2/view",
      mimeType: "text/plain",
      chunkIndex: 0,
      totalChunks: 1,
      folderId: "test-folder",
    },
  },
];

afterAll(async () => {
  try {
    await deleteNamespace(TEST_NAMESPACE);
  } catch {
    // Namespace may not exist if test failed early
  }
});

describe("Upstash Vector integration", () => {
  it("upserts chunks, queries them, and returns metadata", async () => {
    await upsertChunks(TEST_NAMESPACE, TEST_CHUNKS);

    // Upstash needs a moment to index new vectors
    await new Promise((r) => setTimeout(r, 2000));

    const info = await getNamespaceInfo(TEST_NAMESPACE);
    expect(info.vectorCount).toBe(3);

    const results = await queryChunks(TEST_NAMESPACE, "TypeScript language", 2);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].metadata).toMatchObject({
      fileId: expect.any(String),
      fileName: expect.any(String),
      folderId: "test-folder",
    });
    expect(results[0].text).toBeTruthy();
    expect(results[0].score).toBeGreaterThan(0);
  }, 15000);

  it("deletes namespace and confirms empty", async () => {
    await deleteNamespace(TEST_NAMESPACE);

    // Small delay for deletion propagation
    await new Promise((r) => setTimeout(r, 1000));

    const info = await getNamespaceInfo(TEST_NAMESPACE);
    expect(info.vectorCount).toBe(0);
  }, 10000);
});
