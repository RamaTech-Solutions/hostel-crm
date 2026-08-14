"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import type { UserRole } from "@/types/database";

export function AppShell({
  role,
  orgName,
  userName,
  notificationCount,
  banner,
  children,
}: {
  role: UserRole;
  orgName: string;
  userName: string;
  notificationCount: number;
  banner?: ReactNode;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar role={role} orgName={orgName} open={menuOpen} onOpenChange={setMenuOpen} />
      <div className="lg:pl-64">
        {banner}
        <Header userName={userName} notificationCount={notificationCount} onMenuClick={() => setMenuOpen(true)} />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
