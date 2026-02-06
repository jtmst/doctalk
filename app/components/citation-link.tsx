"use client";

import { useState } from "react";
import { FileText, ChevronDown } from "lucide-react";
import type { Citation } from "@/lib/rag/citations";

interface CitationLinkProps {
  citation: Citation;
}

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function buildUrl(citation: Citation): string | undefined {
  if (!citation.fileUrl || !isSafeUrl(citation.fileUrl)) return undefined;
  if (citation.mimeType === "application/pdf" && citation.pageNumber) {
    return `${citation.fileUrl}#page=${citation.pageNumber}`;
  }
  return citation.fileUrl;
}

export function CitationLink({ citation }: CitationLinkProps) {
  const [expanded, setExpanded] = useState(false);
  const url = buildUrl(citation);

  const pill = (
    <span className="inline-flex items-center gap-1.5">
      <FileText className="size-3" />
      <span>{citation.fileName}</span>
      {citation.snippet && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          className="inline-flex items-center"
        >
          <ChevronDown
            className={`size-3 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      )}
    </span>
  );

  const pillClass =
    "inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs transition-colors";

  return (
    <div>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`${pillClass} text-secondary-foreground hover:bg-secondary/80`}
        >
          {pill}
        </a>
      ) : (
        <span className={`${pillClass} text-muted-foreground`}>{pill}</span>
      )}

      {expanded && citation.snippet && (
        <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2.5 py-1.5 mt-1">
          {citation.snippet}
        </p>
      )}
    </div>
  );
}
