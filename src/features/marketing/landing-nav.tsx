"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AwaaslyLogo } from "@/components/brand/awaasly-logo";

export function LandingNav({ showDashboard }: { showDashboard: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" aria-label="Awaasly home" className="inline-flex items-center">
          <AwaaslyLogo variant="primary" placement="navbar" alt="" priority />
        </Link>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          <a href="#features" className="text-muted-foreground hover:text-foreground">Features</a>
          <a href="#how-it-works" className="text-muted-foreground hover:text-foreground">How It Works</a>
          <a href="#pricing" className="text-muted-foreground hover:text-foreground">Pricing</a>
          <Link href="/demo" className="text-muted-foreground hover:text-foreground">Explore Demo</Link>
          {showDashboard ? (
            <Button asChild size="sm"><Link href="/dashboard">Dashboard</Link></Button>
          ) : (
            <>
              <Link href="/login" className="text-muted-foreground hover:text-foreground">Login</Link>
              <Button asChild size="sm"><Link href="/signup">Start Free</Link></Button>
            </>
          )}
        </nav>
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>
      {open && (
        <div className="space-y-3 border-t px-4 py-3 md:hidden">
          <a href="#features" className="block text-sm" onClick={() => setOpen(false)}>Features</a>
          <a href="#how-it-works" className="block text-sm" onClick={() => setOpen(false)}>How It Works</a>
          <a href="#pricing" className="block text-sm" onClick={() => setOpen(false)}>Pricing</a>
          <Link href="/demo" className="block text-sm">Explore Demo</Link>
          {showDashboard ? (
            <Button asChild className="w-full"><Link href="/dashboard">Dashboard</Link></Button>
          ) : (
            <>
              <Link href="/login" className="block text-sm">Login</Link>
              <Button asChild className="w-full"><Link href="/signup">Start Free</Link></Button>
            </>
          )}
        </div>
      )}
    </header>
  );
}
