"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { restoreResidentStay } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { RESTORE_STAY_WARNING } from "@/lib/residents/notice-lifecycle";
import { toast } from "sonner";

export function RestoreStayButton({ residentId }: { residentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function restoreStay() {
    setLoading(true);
    const result = await restoreResidentStay(residentId);
    if (result.error) toast.error(result.error);
    else {
      toast.success(result.warning ?? RESTORE_STAY_WARNING);
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <ConfirmAction
      title="Restore this stay?"
      description={RESTORE_STAY_WARNING}
      confirmLabel="Restore stay"
      pending={loading}
      onConfirm={restoreStay}
      trigger={
        <Button type="button" variant="outline" size="sm" disabled={loading}>
          Restore stay
        </Button>
      }
    />
  );
}
