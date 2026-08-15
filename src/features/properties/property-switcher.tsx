"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function PropertySwitcher({
  properties,
  currentId,
  basePath,
}: {
  properties: { id: string; name: string }[];
  currentId?: string;
  basePath: string;
}) {
  const router = useRouter();
  if (!properties.length) return null;

  return (
    <Select
      value={currentId ?? properties[0]?.id}
      onValueChange={(value) => {
        if (basePath === "/rooms") {
          router.push(`/rooms?propertyId=${value}`);
          return;
        }
        router.push(`${basePath}/${value}`);
      }}
    >
      <SelectTrigger className="w-full max-w-xs">
        <SelectValue placeholder="Select property" />
      </SelectTrigger>
      <SelectContent>
        {properties.map((property) => (
          <SelectItem key={property.id} value={property.id}>
            {property.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
