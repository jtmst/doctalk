import { describe, it, expect } from "vitest";
import { rerank } from "../retriever";
import type { SearchResult } from "@/lib/vectorstore/types";

function result(fileId: string, chunkIndex: number, score: number): SearchResult {
  return {
    id: `${fileId}:${chunkIndex}`,
    score,
    text: `chunk ${chunkIndex}`,
    metadata: {
      fileId,
      fileName: `${fileId}.pdf`,
      fileUrl: `https://drive.google.com/file/d/${fileId}/view`,
      mimeType: "application/pdf",
      chunkIndex,
      totalChunks: 10,
      folderId: "folder-1",
    },
  };
}

describe("rerank", () => {
  it("sorts by score descending and respects limit", () => {
    const input = [result("a", 0, 0.5), result("b", 0, 0.9), result("c", 0, 0.7)];
    const out = rerank(input, 2);
    expect(out.map((r) => r.id)).toEqual(["b:0", "c:0"]);
  });

  it("removes adjacent chunks from the same file", () => {
    const input = [result("a", 0, 0.9), result("a", 1, 0.8), result("b", 0, 0.7)];
    const out = rerank(input, 3);
    expect(out.map((r) => r.id)).toEqual(["a:0", "b:0"]);
  });

  it("keeps non-adjacent chunks from the same file", () => {
    const input = [result("a", 0, 0.9), result("a", 3, 0.8)];
    const out = rerank(input, 3);
    expect(out.map((r) => r.id)).toEqual(["a:0", "a:3"]);
  });

  it("returns empty array for empty input", () => {
    expect(rerank([], 5)).toEqual([]);
  });
});
