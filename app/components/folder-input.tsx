"use client";

import { useState, useEffect, useCallback } from "react";
import { parseFolderUrl } from "@/lib/drive/url";
import { RECENT_FOLDERS_MAX, MAX_FOLDER_ID_LENGTH } from "@/lib/config";
import { FolderOpen, Clock, Info, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const STORAGE_KEY = "doctalk:recent-folders";

export interface RecentFolder {
  folderId: string;
  folderName: string;
  timestamp: number;
  fileCount: number;
}

function isValidRecentFolder(v: unknown): v is RecentFolder {
  if (typeof v !== "object" || v === null) return false;
  const obj = v as Record<string, unknown>;
  return (
    typeof obj.folderId === "string" &&
    obj.folderId.length > 0 &&
    obj.folderId.length <= MAX_FOLDER_ID_LENGTH &&
    typeof obj.folderName === "string" &&
    typeof obj.timestamp === "number" &&
    typeof obj.fileCount === "number"
  );
}

export function loadRecentFolders(): RecentFolder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isValidRecentFolder)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, RECENT_FOLDERS_MAX);
  } catch {
    return [];
  }
}

export function saveRecentFolder(folder: RecentFolder) {
  if (typeof window === "undefined") return;
  const existing = loadRecentFolders().filter(
    (f) => f.folderId !== folder.folderId,
  );
  const updated = [folder, ...existing].slice(0, RECENT_FOLDERS_MAX);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

function removeRecentFolder(folderId: string) {
  const updated = loadRecentFolders().filter((f) => f.folderId !== folderId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

interface FolderInputProps {
  onStartIngestion: (folderId: string) => void;
  onAlreadyIndexed: (folderId: string, folderName: string) => void;
}

export function FolderInput({
  onStartIngestion,
  onAlreadyIndexed,
}: FolderInputProps) {
  const [url, setUrl] = useState("");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentFolders, setRecentFolders] = useState<RecentFolder[]>([]);

  useEffect(() => {
    setRecentFolders(loadRecentFolders());
  }, []);

  useEffect(() => {
    if (!url.trim()) {
      setFolderId(null);
      setError(null);
      return;
    }
    const parsed = parseFolderUrl(url);
    setFolderId(parsed);
    setError(parsed ? null : "Not a valid Google Drive folder URL");
  }, [url]);

  const submitFolder = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);

      const controller = new AbortController();
      try {
        const res = await fetch("/api/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folderId: id }),
          signal: controller.signal,
        });

        const contentType = res.headers.get("content-type") ?? "";

        if (contentType.includes("application/json")) {
          const data = await res.json();
          if (!res.ok) {
            setError(data.error ?? "Failed to check folder");
            return;
          }
          if (data.status === "already_indexed") {
            onAlreadyIndexed(id, data.folderName ?? id);
            return;
          }
        }

        if (contentType.includes("text/event-stream")) {
          controller.abort();
          onStartIngestion(id);
          return;
        }

        if (!res.ok) {
          setError("Unexpected response from server");
        }
      } catch {
        if (controller.signal.aborted) return;
        setError("Failed to connect to server");
      } finally {
        setLoading(false);
      }
    },
    [onStartIngestion, onAlreadyIndexed],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderId || loading) return;
    await submitFolder(folderId);
  };

  const handleRecentClick = async (folder: RecentFolder) => {
    if (loading) return;
    await submitFolder(folder.folderId);
  };

  const handleRemoveRecent = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeRecentFolder(id);
    setRecentFolders(loadRecentFolders());
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-medium">Paste a folder link</h2>
        <p className="text-sm text-muted-foreground inline-flex items-center gap-1.5">
          Share a Google Drive folder URL and chat with its contents.
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="size-3.5 shrink-0 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Supported: PDF, Google Docs, Sheets, Slides, plain text, Markdown, CSV</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://drive.google.com/drive/folders/..."
          disabled={loading}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button
          type="submit"
          className="w-full"
          disabled={!folderId || loading}
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Checking folder...
            </>
          ) : (
            "Start"
          )}
        </Button>
      </form>

      {recentFolders.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="size-3.5" />
            <span>Recent folders</span>
          </div>
          <div className="space-y-1">
            {recentFolders.map((folder) => (
              <div
                key={folder.folderId}
                role="button"
                tabIndex={0}
                onClick={() => handleRecentClick(folder)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    void handleRecentClick(folder);
                  }
                }}
                className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-secondary cursor-pointer"
              >
                <FolderOpen className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{folder.folderName}</p>
                  <p className="text-xs text-muted-foreground">
                    {folder.fileCount} files
                  </p>
                </div>
                <button
                  onClick={(e) => handleRemoveRecent(e, folder.folderId)}
                  className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  aria-label="Remove from recent"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
