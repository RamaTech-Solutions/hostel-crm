"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelResidentNotice } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { toast } from "sonner";

export function CancelNoticeButton({ residentId }: { residentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function cancelNotice() {
    setLoading(true);
    const result = await cancelResidentNotice(residentId);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Notice cancelled. This resident is active in the same bed.");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <ConfirmAction
      title="Cancel notice?"
      description="This resident stays in the same bed as Active. The planned exit date is cleared. Payments and documents are not changed."
      confirmLabel="Cancel notice"
      pending={loading}
      onConfirm={cancelNotice}
      trigger={
        <Button type="button" variant="outline" size="sm" disabled={loading}>
          Cancel notice
        </Button>
      }
    />
  );
}
