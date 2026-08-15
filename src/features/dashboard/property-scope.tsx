"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function DashboardPropertyScope({
  properties,
  currentId,
  allLabel,
}: {
  properties: { id: string; name: string }[];
  currentId: string | null;
  allLabel: string;
}) {
  const router = useRouter();
  if (properties.length <= 1) return null;

  return (
    <Select
      value={currentId ?? "all"}
      onValueChange={(value) => {
        router.push(value === "all" ? "/dashboard" : `/dashboard?property=${value}`);
      }}
    >
      <SelectTrigger className="w-full max-w-xs" aria-label="Property scope">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {properties.map((property) => (
          <SelectItem key={property.id} value={property.id}>
            {property.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
