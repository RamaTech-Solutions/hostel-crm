"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("dashboard load failed");
  }, []);

  return (
    <div className="space-y-4 rounded-lg border bg-card p-6">
      <h1 className="text-xl font-semibold tracking-tight">We couldn&apos;t load your dashboard.</h1>
      <p className="text-sm text-muted-foreground">Your data hasn&apos;t been changed.</p>
      <Button type="button" onClick={() => reset()}>
        Try Again
      </Button>
    </div>
  );
}
