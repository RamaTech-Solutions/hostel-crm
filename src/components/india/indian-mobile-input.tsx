"use client";

import { Label } from "@/components/ui/label";
import { displayIndianMobileDigits } from "@/lib/india/phone";
import { cn } from "@/lib/utils";

export function IndianMobileInput({
  id = "phone",
  name = "phone",
  label = "Mobile number",
  required = false,
  storedValue,
  defaultValue,
  value,
  onChange,
}: {
  id?: string;
  name?: string;
  label?: string;
  required?: boolean;
  storedValue?: string | null;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  const initial = displayIndianMobileDigits(value ?? defaultValue ?? storedValue ?? "");
  const maxLength = initial.length > 10 ? initial.length : 10;

  function restrict(next: string) {
    const digits = next.replace(/\D/g, "").slice(0, maxLength);
    onChange?.(digits);
    return digits;
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required ? " *" : ""}
      </Label>
      <div className="flex">
        <span
          className="inline-flex h-10 shrink-0 items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground"
          aria-hidden
        >
          +91
        </span>
        <input
          id={id}
          name={name}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          required={required}
          maxLength={maxLength}
          aria-label={`${label}, India country code plus 91`}
          placeholder="10-digit mobile"
          className={cn(
            "flex h-10 w-full rounded-r-md border border-input bg-card px-3 py-2 text-sm leading-[22px] ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          )}
          value={value !== undefined ? value : undefined}
          defaultValue={value === undefined ? initial : undefined}
          onChange={(event) => {
            const digits = restrict(event.target.value);
            if (value === undefined) event.target.value = digits;
          }}
        />
      </div>
    </div>
  );
}
