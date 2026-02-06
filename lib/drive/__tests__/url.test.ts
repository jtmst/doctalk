import { describe, it, expect } from "vitest";
import { parseFolderUrl } from "../url";

describe("parseFolderUrl", () => {
  it("extracts ID from /drive/folders/ URL", () => {
    expect(parseFolderUrl("https://drive.google.com/drive/folders/abc123xyz789"))
      .toBe("abc123xyz789");
  });

  it("extracts ID from /drive/u/N/folders/ URL", () => {
    expect(parseFolderUrl("https://drive.google.com/drive/u/0/folders/abc123xyz789"))
      .toBe("abc123xyz789");
  });

  it("extracts ID from /open?id= URL", () => {
    expect(parseFolderUrl("https://drive.google.com/open?id=abc123xyz789"))
      .toBe("abc123xyz789");
  });

  it("accepts a bare folder ID (10+ chars)", () => {
    expect(parseFolderUrl("abc123xyz789")).toBe("abc123xyz789");
  });

  it("rejects a bare string shorter than 10 chars", () => {
    expect(parseFolderUrl("short")).toBeNull();
  });

  it("trims whitespace", () => {
    expect(parseFolderUrl("  abc123xyz789  ")).toBe("abc123xyz789");
  });

  it("returns null for unrecognized input", () => {
    expect(parseFolderUrl("https://example.com/something")).toBeNull();
  });
});
