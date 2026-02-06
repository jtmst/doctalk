"use client";

import { FileText } from "lucide-react";

interface CitationLinkProps {
  fileName: string;
  fileUrl?: string;
}

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function CitationLink({ fileName, fileUrl }: CitationLinkProps) {
  const content = (
    <>
      <FileText className="size-3" />
      <span>{fileName}</span>
    </>
  );

  const safeUrl = fileUrl && isSafeUrl(fileUrl) ? fileUrl : undefined;

  if (safeUrl) {
    return (
      <a
        href={safeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground hover:bg-secondary/80 transition-colors"
      >
        {content}
      </a>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
      {content}
    </span>
  );
}
