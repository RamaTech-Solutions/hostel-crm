"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  BedDouble,
  CreditCard,
  FileBarChart,
  Activity,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { UserRole } from "@/types/database";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["owner", "property_admin", "viewer"] },
  { href: "/properties", label: "Properties", icon: Building2, roles: ["owner", "property_admin", "viewer"] },
  { href: "/residents", label: "Residents", icon: Users, roles: ["owner", "property_admin", "viewer"] },
  { href: "/rooms", label: "Rooms & Beds", icon: BedDouble, roles: ["owner", "property_admin", "viewer"] },
  { href: "/payments", label: "Payments", icon: CreditCard, roles: ["owner", "property_admin", "viewer"] },
  { href: "/reports", label: "Reports", icon: FileBarChart, roles: ["owner", "property_admin", "viewer"] },
  { href: "/activity", label: "Activity", icon: Activity, roles: ["owner", "property_admin", "viewer"] },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["owner", "property_admin"] },
];

interface SidebarProps {
  role: UserRole;
  orgName: string;
}

export function Sidebar({ role, orgName }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredNav = navItems.filter((item) => item.roles.includes(role));

  const NavContent = () => (
    <>
      <div className="flex h-16 items-center border-b border-white/10 px-6">
        <Link href="/dashboard" className="flex flex-col">
          <span className="text-lg font-bold text-white">PG CRM</span>
          <span className="text-xs text-white/60 truncate max-w-[180px]">{orgName}</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {filteredNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-white/10 text-white"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <>
      <button
        className="fixed top-4 left-4 z-50 rounded-lg bg-sidebar p-2 text-white lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <NavContent />
      </aside>
    </>
  );
}
