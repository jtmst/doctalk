"use client";

import { useRef, useEffect, useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowUp, Square, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CHAT_LIMITS } from "@/lib/config";
import { ChatMessage } from "./chat-message";

interface ChatInterfaceProps {
  folderId: string;
  folderName: string;
  onNewFolder: () => void;
}

export function ChatInterface({
  folderId,
  folderName,
  onNewFolder,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat", body: { folderId } }),
    [folderId],
  );

  const { messages, sendMessage, status, stop, error } = useChat({ transport });

  const isActive = status === "submitted" || status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isActive) return;
    setInput("");
    await sendMessage({ text });
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FolderOpen className="size-4" />
          <span className="truncate max-w-[200px] sm:max-w-none">
            {folderName}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={onNewFolder}>
          New folder
        </Button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-4 p-4">
          {messages.length === 0 && (
            <p className="text-center text-sm text-muted-foreground pt-12">
              Ask anything about the documents in this folder.
            </p>
          )}
          {messages.map((m) => (
            <ChatMessage key={m.id} message={m} />
          ))}
          {error && (
            <p className="text-center text-sm text-destructive">
              {error.message || "Something went wrong. Try again."}
            </p>
          )}
        </div>
      </div>

      <div className="border-t p-4">
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-2xl items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your documents..."
            maxLength={CHAT_LIMITS.maxMessageLength}
            className="flex-1 rounded-lg border bg-secondary/50 px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
            disabled={isActive}
          />
          {isActive ? (
            <Button
              type="button"
              size="icon"
              variant="secondary"
              onClick={() => stop()}
            >
              <Square className="size-4" />
            </Button>
          ) : (
            <Button type="submit" size="icon" disabled={!input.trim()}>
              <ArrowUp className="size-4" />
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
