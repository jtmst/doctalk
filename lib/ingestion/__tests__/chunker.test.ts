import { describe, it, expect } from "vitest";
import { RecursiveTextSplitter, chunkDocument } from "../chunker";

describe("RecursiveTextSplitter", () => {
  it("returns text as-is when shorter than chunkSize", () => {
    const splitter = new RecursiveTextSplitter({ chunkSize: 100 });
    const result = splitter.split("Short text.");
    expect(result).toEqual(["Short text."]);
  });

  it("returns empty array for empty or whitespace input", () => {
    const splitter = new RecursiveTextSplitter();
    expect(splitter.split("")).toEqual([]);
    expect(splitter.split("   ")).toEqual([]);
  });

  it("splits on paragraph boundaries first", () => {
    const splitter = new RecursiveTextSplitter({
      chunkSize: 20,
      chunkOverlap: 0,
    });
    const text = "First paragraph.\n\nSecond paragraph.\n\nThird paragraph.";
    const chunks = splitter.split(text);

    expect(chunks).toEqual([
      "First paragraph.",
      "Second paragraph.",
      "Third paragraph.",
    ]);
  });

  it("falls back to newline separator when paragraphs are too large", () => {
    const splitter = new RecursiveTextSplitter({
      chunkSize: 20,
      chunkOverlap: 0,
    });
    const text = "Line one here\nLine two here\nLine three here";
    const chunks = splitter.split(text);

    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((chunk) => {
      expect(chunk.length).toBeLessThanOrEqual(20);
    });
  });

  it("falls back to sentence separator for long lines", () => {
    const splitter = new RecursiveTextSplitter({
      chunkSize: 30,
      chunkOverlap: 0,
    });
    const text = "First sentence here. Second sentence here. Third sentence here.";
    const chunks = splitter.split(text);

    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((chunk) => {
      expect(chunk.length).toBeLessThanOrEqual(30);
    });
  });

  it("adds overlap from the end of the previous chunk", () => {
    const splitter = new RecursiveTextSplitter({
      chunkSize: 30,
      chunkOverlap: 8,
    });
    const text = "First paragraph here.\n\nSecond paragraph.\n\nThird paragraph.";
    const chunks = splitter.split(text);

    expect(chunks.length).toBe(3);
    expect(chunks[0]).toBe("First paragraph here.");
    expect(chunks[1]).toContain("Second paragraph.");
    expect(chunks[1].length).toBeGreaterThan("Second paragraph.".length);
    expect(chunks[2]).toContain("Third paragraph.");
  });

  it("skips overlap when it would exceed chunkSize", () => {
    const splitter = new RecursiveTextSplitter({
      chunkSize: 20,
      chunkOverlap: 15,
    });
    const text = "First paragraph.\n\nSecond paragraph.";
    const chunks = splitter.split(text);

    chunks.forEach((chunk) => {
      expect(chunk.length).toBeLessThanOrEqual(20);
    });
  });

  it("handles text with no natural separators by splitting on characters", () => {
    const splitter = new RecursiveTextSplitter({
      chunkSize: 10,
      chunkOverlap: 0,
    });
    const text = "abcdefghijklmnop";
    const chunks = splitter.split(text);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]).toBe("abcdefghij");
  });

  it("uses custom separators when provided", () => {
    const splitter = new RecursiveTextSplitter({
      chunkSize: 10,
      chunkOverlap: 0,
      separators: ["---", ""],
    });
    const text = "Part A---Part B---Part C";
    const chunks = splitter.split(text);

    expect(chunks).toEqual(["Part A", "Part B", "Part C"]);
  });
});

describe("chunkDocument", () => {
  const metadata = {
    fileId: "file-123",
    fileName: "test.pdf",
    fileUrl: "https://drive.google.com/file/d/file-123/view",
    mimeType: "application/pdf",
    folderId: "folder-456",
  };

  it("produces chunks with correct metadata", () => {
    const text = "Short document text.";
    const result = chunkDocument(text, metadata);

    expect(result).toHaveLength(1);
    expect(result[0].metadata).toEqual({
      ...metadata,
      chunkIndex: 0,
      totalChunks: 1,
    });
    expect(result[0].text).toBe("Short document text.");
  });

  it("assigns sequential chunkIndex and correct totalChunks", () => {
    const splitter = new RecursiveTextSplitter({
      chunkSize: 15,
      chunkOverlap: 0,
    });
    const text = "Chunk one.\n\nChunk two.\n\nChunk three.";
    const result = chunkDocument(text, metadata, { splitter });

    expect(result.length).toBe(3);
    result.forEach((chunk, i) => {
      expect(chunk.metadata.chunkIndex).toBe(i);
      expect(chunk.metadata.totalChunks).toBe(3);
    });
  });

  it("generates stable IDs from fileId and chunkIndex", () => {
    const splitter = new RecursiveTextSplitter({
      chunkSize: 10,
      chunkOverlap: 0,
    });
    const text = "Alpha.\n\nBeta.";
    const result = chunkDocument(text, metadata, { splitter });

    expect(result.length).toBe(2);
    expect(result[0].id).toBe("file-123:0");
    expect(result[1].id).toBe("file-123:1");
  });

  it("returns empty array for empty text", () => {
    const result = chunkDocument("", metadata);
    expect(result).toEqual([]);
  });

  it("assigns page numbers from page offsets", () => {
    const text = "Page one content.\n\nPage two content.";
    const pageOffsets = [
      { pageNumber: 1, startOffset: 0 },
      { pageNumber: 2, startOffset: 19 },
    ];
    const splitter = new RecursiveTextSplitter({ chunkSize: 500, chunkOverlap: 0 });
    const result = chunkDocument(text, metadata, { splitter, pageOffsets });

    expect(result).toHaveLength(1);
    expect(result[0].metadata.pageNumbers).toEqual([1, 2]);
  });

  it("assigns correct pages when chunks split across page boundaries", () => {
    const text = "AAA.\n\nBBB.\n\nCCC.";
    const pageOffsets = [
      { pageNumber: 1, startOffset: 0 },
      { pageNumber: 2, startOffset: 6 },
      { pageNumber: 3, startOffset: 12 },
    ];
    const splitter = new RecursiveTextSplitter({ chunkSize: 8, chunkOverlap: 0 });
    const result = chunkDocument(text, metadata, { splitter, pageOffsets });

    expect(result.length).toBeGreaterThan(1);
    expect(result[0].metadata.pageNumbers).toEqual([1]);
  });
});
