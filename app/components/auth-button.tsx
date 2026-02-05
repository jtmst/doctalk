"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <Button variant="ghost" size="sm" disabled>
        Loading...
      </Button>
    );
  }

  if (!session) {
    return (
      <Button onClick={() => signIn("google")} size="sm">
        Connect Google Drive
      </Button>
    );
  }

  const initials = session.user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-8 w-8">
        <AvatarImage src={session.user.image ?? undefined} alt={session.user.name ?? "User"} />
        <AvatarFallback className="text-xs">{initials ?? "U"}</AvatarFallback>
      </Avatar>
      <span className="text-sm text-muted-foreground hidden sm:inline">
        {session.user.email}
      </span>
      <Button variant="ghost" size="sm" onClick={() => signOut()}>
        Sign out
      </Button>
    </div>
  );
}
