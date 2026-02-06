"use client";

import { useEffect, useRef, useState } from "react";
import type { IngestionEvent } from "@/lib/ingestion/pipeline";
import { AlertCircle, CheckCircle2, FileWarning, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface IngestionProgressProps {
  folderId: string;
  onComplete: (result: { filesProcessed: number; chunksCreated: number }) => void;
  onError: (message: string) => void;
}

interface ProgressState {
  totalFiles: number;
  filesProcessed: number;
  currentFile: string;
  chunksCreated: number;
  skipped: { fileName: string; reason: string }[];
  errors: { fileName: string; error: string }[];
  status: "connecting" | "ingesting" | "complete" | "error";
  errorMessage?: string;
}

export function IngestionProgress({
  folderId,
  onComplete,
  onError,
}: IngestionProgressProps) {
  const [state, setState] = useState<ProgressState>({
    totalFiles: 0,
    filesProcessed: 0,
    currentFile: "",
    chunksCreated: 0,
    skipped: [],
    errors: [],
    status: "connecting",
  });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;

    async function startIngestion() {
      try {
        const res = await fetch("/api/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folderId }),
          signal: controller.signal,
        });

        const contentType = res.headers.get("content-type") ?? "";

        if (contentType.includes("application/json")) {
          const data = await res.json();
          if (!res.ok) {
            onError(data?.error ?? `Ingestion failed (${res.status})`);
            return;
          }
          if (data.status === "already_indexed") {
            onComplete({ filesProcessed: 0, chunksCreated: data.vectorCount ?? 0 });
            return;
          }
        }

        if (!res.ok || !res.body) {
          onError(`Ingestion failed (${res.status})`);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;
            const json = trimmed.slice(6);
            try {
              const event: IngestionEvent = JSON.parse(json);
              handleEvent(event);
            } catch {
              // skip malformed events
            }
          }
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        onError(err instanceof Error ? err.message : "Connection lost");
      }
    }

    function handleEvent(event: IngestionEvent) {
      switch (event.type) {
        case "started":
          setState((s) => ({
            ...s,
            totalFiles: event.totalFiles,
            status: "ingesting",
          }));
          break;
        case "progress":
          setState((s) => ({
            ...s,
            filesProcessed: event.filesProcessed,
            currentFile: event.currentFile,
            chunksCreated: event.chunksCreated,
          }));
          break;
        case "file_skipped":
          setState((s) => ({
            ...s,
            skipped: [...s.skipped, { fileName: event.fileName, reason: event.reason }],
          }));
          break;
        case "file_error":
          setState((s) => ({
            ...s,
            errors: [...s.errors, { fileName: event.fileName, error: event.error }],
          }));
          break;
        case "complete":
          setState((s) => ({ ...s, status: "complete" }));
          onComplete({
            filesProcessed: event.filesProcessed,
            chunksCreated: event.chunksCreated,
          });
          break;
        case "error":
          setState((s) => ({
            ...s,
            status: "error",
            errorMessage: event.message,
          }));
          onError(event.message);
          break;
      }
    }

    void startIngestion();
    return () => controller.abort();
  }, [folderId, onComplete, onError]);

  const progress =
    state.totalFiles > 0
      ? Math.round((state.filesProcessed / state.totalFiles) * 100)
      : 0;

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {state.status === "connecting" && "Connecting..."}
            {state.status === "ingesting" && `Processing files (${state.filesProcessed}/${state.totalFiles})`}
            {state.status === "complete" && "Complete"}
            {state.status === "error" && "Error"}
          </span>
          {state.totalFiles > 0 && (
            <span className="text-muted-foreground">{progress}%</span>
          )}
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {state.currentFile && state.status === "ingesting" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          <span className="truncate">{state.currentFile}</span>
        </div>
      )}

      {state.chunksCreated > 0 && (
        <p className="text-xs text-muted-foreground">
          {state.chunksCreated} chunks created
        </p>
      )}

      {state.skipped.length > 0 && (
        <div className="space-y-1">
          {state.skipped.map((s, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-xs text-muted-foreground"
            >
              <FileWarning className="mt-0.5 size-3 shrink-0" />
              <span>
                {s.fileName}: {s.reason}
              </span>
            </div>
          ))}
        </div>
      )}

      {state.errors.length > 0 && (
        <div className="space-y-1">
          {state.errors.map((e, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-xs text-destructive"
            >
              <AlertCircle className="mt-0.5 size-3 shrink-0" />
              <span>
                {e.fileName}: {e.error}
              </span>
            </div>
          ))}
        </div>
      )}

      {state.status === "complete" && (
        <div className="flex items-center gap-2 text-sm text-primary">
          <CheckCircle2 className="size-4" />
          <span>
            Indexed {state.filesProcessed} files ({state.chunksCreated} chunks)
          </span>
        </div>
      )}

      {state.status === "error" && state.errorMessage && (
        <div className="space-y-3">
          <p className="text-sm text-destructive">{state.errorMessage}</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}
