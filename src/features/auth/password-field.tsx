"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";

export function PasswordField({
  id,
  name,
  label,
  autoComplete,
  value,
  onChange,
  required = true,
}: {
  id: string;
  name: string;
  label?: string;
  autoComplete?: string;
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const controlled = value !== undefined;

  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        required={required}
        autoComplete={autoComplete}
        value={controlled ? value : undefined}
        onChange={controlled ? (e) => onChange?.(e.target.value) : undefined}
        className="pr-10"
        aria-label={label}
      />
      <button
        type="button"
        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
