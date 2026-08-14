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
import type { UserRole } from "@/types/database";
import { AwaaslyLogo } from "@/components/brand/awaasly-logo";

const navGroups = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", label: "Overview", icon: LayoutDashboard, roles: ["owner", "property_admin", "viewer"] }],
  },
  {
    label: "Operations",
    items: [
      { href: "/properties", label: "Properties", icon: Building2, roles: ["owner", "property_admin", "viewer"] },
      { href: "/rooms", label: "Rooms & Beds", icon: BedDouble, roles: ["owner", "property_admin", "viewer"] },
      { href: "/residents", label: "Residents", icon: Users, roles: ["owner", "property_admin", "viewer"] },
    ],
  },
  {
    label: "Collections",
    items: [{ href: "/payments", label: "Rent & Payments", icon: CreditCard, roles: ["owner", "property_admin", "viewer"] }],
  },
  {
    label: "Insights",
    items: [
      { href: "/reports", label: "Reports", icon: FileBarChart, roles: ["owner", "property_admin", "viewer"] },
      { href: "/activity", label: "Activity", icon: Activity, roles: ["owner", "property_admin", "viewer"] },
    ],
  },
];

interface SidebarProps {
  role: UserRole;
  orgName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function Sidebar({ role, orgName, open, onOpenChange }: SidebarProps) {
  const pathname = usePathname();

  const NavContent = () => (
    <>
      <div className="flex h-16 items-center border-b border-white/10 px-5">
        <Link href="/dashboard" className="min-w-0" onClick={() => onOpenChange(false)}>
          <AwaaslyLogo variant="reversed" size="sm" />
          <p className="mt-1 truncate text-xs text-sidebar-foreground/60">{orgName}</p>
        </Link>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto p-3">
        {navGroups.map((group) => {
          const items = group.items.filter((item) => item.roles.includes(role));
          if (!items.length) return null;
          return (
            <div key={group.label}>
              <p className="mb-1 px-3 text-[11px] font-medium uppercase tracking-wide text-sidebar-foreground/40">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => onOpenChange(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
      {(role === "owner" || role === "property_admin") && (
        <div className="border-t border-white/10 p-3">
          <Link
            href="/settings"
            onClick={() => onOpenChange(false)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
              pathname.startsWith("/settings")
                ? "bg-primary text-primary-foreground"
                : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground"
            )}
          >
            <Settings className="h-5 w-5" />
            Settings
          </Link>
        </div>
      )}
    </>
  );

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-40 bg-foreground/40 lg:hidden" onClick={() => onOpenChange(false)} />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex justify-end p-2 lg:hidden">
          <button
            type="button"
            className="rounded-md p-2 text-sidebar-foreground"
            onClick={() => onOpenChange(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <NavContent />
      </aside>
    </>
  );
}

export function SidebarMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground hover:bg-accent lg:hidden"
      onClick={onClick}
      aria-label="Open menu"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}
