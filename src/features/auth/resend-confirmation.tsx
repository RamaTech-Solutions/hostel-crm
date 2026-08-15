"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toUserError } from "@/lib/user-error";
import { Button } from "@/components/ui/button";

export function ResendConfirmation({ email }: { email: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function resend() {
    if (!email || status === "loading") return;
    setStatus("loading");
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) {
        setStatus("error");
        setMessage(toUserError(error.message));
        return;
      }
      setStatus("sent");
      setMessage("A new confirmation email has been sent.");
      window.setTimeout(() => setStatus("idle"), 30000);
    } catch {
      setStatus("error");
      setMessage("We couldn't reach Awaasly. Check your connection and try again.");
    }
  }

  return (
    <div className="mt-4 space-y-2">
      <Button type="button" variant="outline" className="w-full" disabled={!email || status === "loading" || status === "sent"} onClick={resend}>
        {status === "loading" ? "Sending..." : status === "sent" ? "Email sent" : "Resend confirmation email"}
      </Button>
      {message ? (
        <p className={`text-sm ${status === "error" ? "text-destructive" : "text-success"}`} role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
