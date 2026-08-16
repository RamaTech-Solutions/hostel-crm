"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createProperty, updateProperty } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { IndianMobileInput } from "@/components/india/indian-mobile-input";
import { StateSelect } from "@/components/india/state-select";
import type { Property } from "@/types/database";

export function PropertyForm({ property }: { property?: Property }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isEdit = Boolean(property);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = isEdit && property
      ? await updateProperty(property.id, formData)
      : await createProperty(formData);
    if (result.error) {
      toast.error(result.error);
      setLoading(false);
      return;
    }
    toast.success(isEdit ? "Property updated" : "Property created");
    const nextId = isEdit ? property!.id : "data" in result ? result.data?.id : undefined;
    router.push(nextId ? `/properties/${nextId}` : "/properties");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader><CardTitle>{isEdit ? "Edit property" : "Property Details"}</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
          <input type="hidden" name="status" value={property?.status ?? "active"} />
          {isEdit ? <input type="hidden" name="floor_count" value={property?.floor_count ?? 1} /> : null}
          <div className="space-y-2">
            <Label htmlFor="name">Property Name *</Label>
            <Input id="name" name="name" required defaultValue={property?.name} placeholder="UrbanStay Sector 62" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="internal_code">Internal Code</Label>
            <Input id="internal_code" name="internal_code" defaultValue={property?.internal_code ?? ""} placeholder="US-S62" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address_line">Address *</Label>
            <Input id="address_line" name="address_line" required defaultValue={property?.address_line} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input id="city" name="city" required defaultValue={property?.city} />
            </div>
            <div>
              <StateSelect
                id="state"
                name="state"
                required
                currentStored={property?.state}
                defaultValue={property ? (property.state ?? "") : "Uttar Pradesh"}
                allowEmpty={Boolean(property) && !(property?.state ?? "").trim()}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pincode">Pincode *</Label>
              <Input id="pincode" name="pincode" required pattern="\d{6}" defaultValue={property?.pincode} />
            </div>
            <IndianMobileInput
              id="contact_phone"
              name="contact_phone"
              label="Contact Phone"
              storedValue={property?.contact_phone}
              defaultValue={property?.contact_phone ?? ""}
            />
          </div>
          {!isEdit ? (
            <div className="space-y-2">
              <Label htmlFor="floor_count_input">Floors</Label>
              <Input id="floor_count_input" name="floor_count" type="number" min={1} defaultValue={3} />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" defaultValue={property?.notes ?? ""} />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? (isEdit ? "Saving..." : "Creating...") : isEdit ? "Save changes" : "Create Property"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
