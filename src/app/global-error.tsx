"use client";

import { useEffect } from "react";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("global error");
  }, []);

  return (
    <html lang="en">
      <body>
        <div style={{ maxWidth: 512, margin: "48px auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Something went wrong.</h1>
          <p style={{ marginTop: 8, color: "#555" }}>Your data hasn&apos;t been changed.</p>
          <button type="button" onClick={() => reset()} style={{ marginTop: 16, padding: "8px 12px" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
