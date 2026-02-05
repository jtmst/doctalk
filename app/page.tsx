"use client";

import { signIn, useSession } from "next-auth/react";
import { AuthButton } from "@/app/components/auth-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  const { data: session, status } = useSession();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">DocTalk</h1>
        <AuthButton />
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        {status === "loading" && (
          <p className="text-muted-foreground">Loading...</p>
        )}

        {status === "unauthenticated" && (
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">DocTalk</CardTitle>
              <CardDescription>
                Folders that talk back. Connect your Google account to get
                started.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <AuthButton />
            </CardContent>
          </Card>
        )}

        {status === "authenticated" && session?.error === "RefreshTokenError" && (
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <CardTitle>Session Expired</CardTitle>
              <CardDescription>
                Your Google authorization has expired. Please sign in again.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button onClick={() => signIn("google")}>Reconnect Google Drive</Button>
            </CardContent>
          </Card>
        )}

        {status === "authenticated" && session && !session.error && (
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <CardTitle>Welcome, {session.user.name}</CardTitle>
              <CardDescription>
                Paste a Google Drive folder link to start chatting with your
                documents.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center">
                Folder input coming in Phase 6...
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
