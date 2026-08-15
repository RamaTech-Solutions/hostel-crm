"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useState } from "react";
import type { Property } from "@/types/database";

export function ResidentsFilters({ properties }: { properties: Property[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") params.set(key, value);
    else params.delete(key);
    router.push(`/residents?${params.toString()}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateFilter("search", search);
  }

  return (
    <div className="flex flex-wrap gap-3 mb-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          placeholder="Search name or mobile..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Button type="submit" variant="outline" size="icon"><Search className="h-4 w-4" /></Button>
      </form>
      <Select
        defaultValue={searchParams.get("property") ?? "all"}
        onValueChange={(v) => updateFilter("property", v)}
      >
        <SelectTrigger className="w-48"><SelectValue placeholder="All Properties" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Properties</SelectItem>
          {properties.map((p) => (
            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        defaultValue={searchParams.get("status") ?? "all"}
        onValueChange={(v) => updateFilter("status", v)}
      >
        <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="staying">Currently staying</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="notice_period">Notice Period</SelectItem>
          <SelectItem value="checked_out">Former / Checked Out</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
