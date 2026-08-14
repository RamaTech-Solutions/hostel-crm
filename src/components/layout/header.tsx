"use client";

import { useRouter } from "next/navigation";
import { Search, Bell, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { signOut } from "@/lib/actions";
import { useState } from "react";
import { SidebarMenuButton } from "@/components/layout/sidebar";

interface HeaderProps {
  userName: string;
  notificationCount?: number;
  onMenuClick: () => void;
}

export function Header({ userName, notificationCount = 0, onMenuClick }: HeaderProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/search?q=${encodeURIComponent(search.trim())}`);
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur lg:px-6">
      <SidebarMenuButton onClick={onMenuClick} />

      <form onSubmit={handleSearch} className="relative min-w-0 flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search residents, mobile, room..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search"
        />
      </form>

      <div className="flex items-center gap-1 sm:gap-2">
        <Button variant="ghost" size="icon" className="relative" asChild>
          <a href="/dashboard#alerts" aria-label="Notifications">
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            )}
          </a>
        </Button>

        <div className="hidden items-center gap-2 sm:flex">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {getInitials(userName)}
            </AvatarFallback>
          </Avatar>
          <span className="max-w-[140px] truncate text-sm font-medium">{userName}</span>
        </div>

        <form action={signOut}>
          <Button variant="ghost" size="icon" type="submit" aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}
