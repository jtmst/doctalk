"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { AuthButton } from "@/app/components/auth-button";
import { FolderInput, loadRecentFolders, saveRecentFolder } from "@/app/components/folder-input";
import { IngestionProgress } from "@/app/components/ingestion-progress";
import { ChatInterface } from "@/app/components/chat-interface";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AppState =
  | { step: "folder-select" }
  | { step: "ingesting"; folderId: string }
  | { step: "chat"; folderId: string; folderName: string };

export default function Home() {
  const { data: session, status } = useSession();
  const [appState, setAppState] = useState<AppState>({ step: "folder-select" });
  const [ingestionError, setIngestionError] = useState<string | null>(null);
  const appStateRef = useRef(appState);
  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);

  const handleStartIngestion = useCallback((folderId: string) => {
    setIngestionError(null);
    setAppState({ step: "ingesting", folderId });
  }, []);

  const handleAlreadyIndexed = useCallback(
    (folderId: string, folderName: string) => {
      const recent = loadRecentFolders().find((f) => f.folderId === folderId);
      saveRecentFolder({
        folderId,
        folderName,
        timestamp: Date.now(),
        fileCount: recent?.fileCount ?? 0,
      });
      setAppState({ step: "chat", folderId, folderName });
    },
    [],
  );

  const handleIngestionComplete = useCallback(
    (result: { filesProcessed: number; chunksCreated: number; folderName: string }) => {
      const current = appStateRef.current;
      if (current.step !== "ingesting") return;
      const { folderId } = current;
      const { folderName } = result;
      saveRecentFolder({
        folderId,
        folderName,
        timestamp: Date.now(),
        fileCount: result.filesProcessed,
      });
      setAppState({ step: "chat", folderId, folderName });
    },
    [],
  );

  const handleIngestionError = useCallback((message: string) => {
    setIngestionError(message);
  }, []);

  const handleNewFolder = useCallback(() => {
    setAppState({ step: "folder-select" });
    setIngestionError(null);
  }, []);

  if (status === "loading") {
    return (
      <Shell>
        <p className="text-muted-foreground animate-pulse">Loading...</p>
      </Shell>
    );
  }

  if (status === "unauthenticated") {
    return (
      <Shell>
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">DocTalk</CardTitle>
            <CardDescription>
              Folders that talk back. Connect your Google account to get started.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <AuthButton />
          </CardContent>
        </Card>
      </Shell>
    );
  }

  if (session?.error === "RefreshTokenError") {
    return (
      <Shell>
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle>Session Expired</CardTitle>
            <CardDescription>
              Your Google authorization has expired. Please sign in again.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => signIn("google")}>
              Reconnect Google Drive
            </Button>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  if (appState.step === "chat") {
    return (
      <div className="h-screen flex flex-col">
        <header className="border-b px-6 py-3 flex items-center justify-between shrink-0">
          <h1 className="text-lg font-semibold tracking-tight">DocTalk</h1>
          <AuthButton />
        </header>
        <ChatInterface
          folderId={appState.folderId}
          folderName={appState.folderName}
          onNewFolder={handleNewFolder}
        />
      </div>
    );
  }

  return (
    <Shell>
      {appState.step === "folder-select" && (
        <FolderInput
          onStartIngestion={handleStartIngestion}
          onAlreadyIndexed={handleAlreadyIndexed}
        />
      )}

      {appState.step === "ingesting" && (
        <div className="w-full max-w-md space-y-4">
          <IngestionProgress
            folderId={appState.folderId}
            onComplete={handleIngestionComplete}
            onError={handleIngestionError}
          />
          {ingestionError && (
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={handleNewFolder}>
                Back
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleStartIngestion(appState.folderId)}
              >
                Retry
              </Button>
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">DocTalk</h1>
        <AuthButton />
      </header>
      <main className="flex-1 flex items-center justify-center p-6">
        {children}
      </main>
    </div>
  );
}
