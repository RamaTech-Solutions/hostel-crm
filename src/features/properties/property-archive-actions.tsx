"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { archiveProperty, reactivateProperty } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { toast } from "sonner";

export function PropertyArchiveActions({
  propertyId,
  status,
}: {
  propertyId: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function archive() {
    setLoading(true);
    const result = await archiveProperty(propertyId);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Property archived");
      router.refresh();
    }
    setLoading(false);
  }

  async function reactivate() {
    setLoading(true);
    const result = await reactivateProperty(propertyId);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Property reactivated");
      router.refresh();
    }
    setLoading(false);
  }

  if (status === "inactive") {
    return (
      <Button type="button" variant="outline" size="sm" disabled={loading} onClick={reactivate}>
        {loading ? "Working..." : "Reactivate Property"}
      </Button>
    );
  }

  return (
    <ConfirmAction
      title="Archive this property?"
      description="Floors, rooms, beds and history stay saved. You can reactivate it later. Occupancy and new assignments stop for this property."
      confirmLabel="Archive property"
      pending={loading}
      onConfirm={archive}
      trigger={
        <Button type="button" variant="outline" size="sm" disabled={loading}>
          {loading ? "Working..." : "Archive Property"}
        </Button>
      }
    />
  );
}
