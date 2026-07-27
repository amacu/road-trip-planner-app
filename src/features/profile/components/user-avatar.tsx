"use client";

import { Camera } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

type UserAvatarProps = {
  fullName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
};

export function UserAvatar({ fullName, email, avatarUrl }: UserAvatarProps) {
  const fallback = getInitials(fullName || email || "RoadTrip Planner");

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-[#fffaf0] p-4 sm:flex-row sm:items-center">
      <Avatar className="size-20 border-2 border-card bg-muted shadow-sm">
        {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName ?? "User"} />}
        <AvatarFallback className="bg-brand-muted text-xl font-black text-brand">
          {fallback}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col items-center gap-2 sm:items-start">
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-xl font-bold"
          disabled
          title="Connect a Supabase Storage bucket to enable avatar uploads."
        >
          <Camera className="size-4" />
          Upload photo
        </Button>
      </div>
    </div>
  );
}

function getInitials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "R";
  const second = parts.length > 1 ? parts[1]?.[0] : parts[0]?.[1];
  return `${first}${second ?? ""}`.toUpperCase();
}
