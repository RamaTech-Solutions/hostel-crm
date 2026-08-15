"use client";

import { useTransition } from "react";
import { generateRentCharges } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { isCurrentBillingMonth } from "@/lib/finance/period";

export function GenerateRentButton({ periodStart }: { periodStart: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (!isCurrentBillingMonth(periodStart)) {
    return <p className="text-sm text-muted-foreground">Generate is available for the current month only.</p>;
  }

  return (
    <Button
      type="button"
      disabled={pending}
      onClick={() => {
        start(async () => {
          const form = new FormData();
          form.set("period_start", periodStart);
          const result = await generateRentCharges(form);
          if (result.error) toast.error(result.error);
          else toast.success(`Created ${result.data?.created_count ?? 0} rent charge(s).`);
          router.refresh();
        });
      }}
    >
      {pending ? "Generating..." : "Generate this month’s rent"}
    </Button>
  );
}
