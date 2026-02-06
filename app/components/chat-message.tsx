"use client";

import type { UIMessage } from "ai";
import { parseCitations, mapCitationsToUrls } from "@/lib/rag/citations";
import type { SourceMeta } from "@/lib/rag/citations";
import { CitationLink } from "./citation-link";

interface ChatMessageProps {
  message: UIMessage;
}

function getTextContent(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

function isStreaming(message: UIMessage): boolean {
  return message.parts.some(
    (p) => p.type === "text" && p.state === "streaming",
  );
}

function stripCitationMarkers(text: string): string {
  return text.replace(/\[Source:\s*[^\]]+\]/g, "").trim();
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const text = getTextContent(message);
  const streaming = isStreaming(message);
  const fileNames = !isUser && !streaming ? parseCitations(text) : [];
  const sources = (message.metadata as { sources?: SourceMeta[] } | undefined)?.sources ?? [];
  const citations = fileNames.length > 0 ? mapCitationsToUrls(fileNames, sources, text) : [];
  const displayText = fileNames.length > 0 ? stripCitationMarkers(text) : text;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-lg px-4 py-2.5 ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground"
        }`}
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {displayText}
        </p>

        {citations.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border/50 pt-2">
            {citations.map((citation) => (
              <CitationLink key={citation.fileName} citation={citation} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
