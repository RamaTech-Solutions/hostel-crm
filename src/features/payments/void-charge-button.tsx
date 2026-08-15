"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { voidRentCharge } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { canVoidCharge } from "@/lib/finance/period";

export function VoidChargeButton({
  chargeId,
  residentId,
  allocatedPaid,
  outstanding,
  voidedAt,
}: {
  chargeId: string;
  residentId?: string;
  allocatedPaid: number;
  outstanding: number;
  voidedAt?: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!canVoidCharge(allocatedPaid, voidedAt) || !(outstanding > 0)) return null;

  async function cancelCharge() {
    if (
      !window.confirm(
        "Cancel this unpaid rent charge? It will be removed from collections. Payment history is not deleted."
      )
    ) {
      return;
    }
    setLoading(true);
    const form = new FormData();
    form.set("charge_id", chargeId);
    if (residentId) form.set("resident_id", residentId);
    const result = await voidRentCharge(form);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Rent charge cancelled");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={loading} onClick={cancelCharge}>
      {loading ? "Cancelling..." : "Cancel charge"}
    </Button>
  );
}
