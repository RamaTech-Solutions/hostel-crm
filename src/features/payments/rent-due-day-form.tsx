"use client";

import { useTransition } from "react";
import { updateOrgRentDueDay } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function RentDueDayForm({ dueDay }: { dueDay: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        start(async () => {
          const result = await updateOrgRentDueDay(formData);
          if (result.error) toast.error(result.error);
          else {
            toast.success("Rent due day updated. Future charges will use this day.");
            router.refresh();
          }
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="rent_due_day">Rent due day (1–28)</Label>
        <Input id="rent_due_day" name="rent_due_day" type="number" min={1} max={28} defaultValue={dueDay} className="w-28" />
      </div>
      <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save"}</Button>
    </form>
  );
}
