import { describe, it, expect } from "vitest";
import { parseCitations, mapCitationsToUrls, type SourceMeta } from "../citations";

describe("parseCitations", () => {
  it("extracts file names from [Source: ...] references", () => {
    const text = "Based on [Source: report.pdf] and [Source: notes.md], yes.";
    expect(parseCitations(text)).toEqual(["report.pdf", "notes.md"]);
  });

  it("deduplicates repeated citations", () => {
    const text = "[Source: file.pdf] says X. [Source: file.pdf] also says Y.";
    expect(parseCitations(text)).toEqual(["file.pdf"]);
  });

  it("strips page number suffixes", () => {
    expect(parseCitations("[Source: doc.pdf (p.1, 2)]")).toEqual(["doc.pdf"]);
  });

  it("returns empty array when no citations present", () => {
    expect(parseCitations("No citations here.")).toEqual([]);
  });
});

describe("mapCitationsToUrls", () => {
  const sources: SourceMeta[] = [
    {
      fileName: "report.pdf",
      fileUrl: "https://drive.google.com/file/d/abc/view",
      mimeType: "application/pdf",
      text: "Short chunk text.",
      pageNumbers: [1, 2],
    },
  ];

  it("maps a file name to its citation", () => {
    const result = mapCitationsToUrls(["report.pdf"], sources, "chunk");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      fileName: "report.pdf",
      fileUrl: "https://drive.google.com/file/d/abc/view",
      pageNumbers: [1, 2],
    });
    expect(result[0].snippet).toBeTruthy();
  });

  it("skips file names not found in sources", () => {
    expect(mapCitationsToUrls(["missing.txt"], sources, "x")).toEqual([]);
  });

  it("defaults pageNumbers to empty array when absent", () => {
    const noPages: SourceMeta[] = [
      { fileName: "a.txt", fileUrl: "u", mimeType: "text/plain", text: "hi" },
    ];
    const result = mapCitationsToUrls(["a.txt"], noPages, "hi");
    expect(result[0].pageNumbers).toEqual([]);
  });
});
