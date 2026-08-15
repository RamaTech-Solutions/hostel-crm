"use client";

import { cn } from "@/lib/utils";
import { validatePassword, type PasswordChecks } from "@/lib/auth/password-policy";

const items: { key: keyof Omit<PasswordChecks, "valid">; label: string }[] = [
  { key: "minLength", label: "8 or more characters" },
  { key: "uppercase", label: "Uppercase letter" },
  { key: "lowercase", label: "Lowercase letter" },
  { key: "number", label: "Number" },
  { key: "symbol", label: "Special character" },
];

export function PasswordChecklist({ password }: { password: string }) {
  const checks = validatePassword(password);

  return (
    <div className="rounded-md border bg-muted/40 px-3 py-2">
      <p className="text-xs font-medium text-muted-foreground">Password requirements</p>
      <ul className="mt-1.5 space-y-0.5 text-xs">
        {items.map((item) => {
          const met = checks[item.key];
          return (
            <li
              key={item.key}
              className={cn("flex items-center gap-2", met ? "text-success" : "text-muted-foreground")}
            >
              <span aria-hidden="true">{met ? "✓" : "○"}</span>
              <span>{item.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
