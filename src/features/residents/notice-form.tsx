"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { giveResidentNotice } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { format } from "date-fns";

export function NoticeForm({
  residentId,
  plannedCheckoutDate,
  isUpdate,
}: {
  residentId: string;
  plannedCheckoutDate?: string | null;
  isUpdate: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    const result = await giveResidentNotice(residentId, new FormData(e.currentTarget));
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(isUpdate ? "Notice date updated" : "Resident is on notice period");
      router.push(`/residents/${residentId}`);
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isUpdate ? "Update notice" : "Give notice"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <p className="text-sm text-muted-foreground">
            The bed stays occupied. New residents cannot take this bed until you complete checkout.
          </p>
          <div className="space-y-2">
            <Label>Planned exit date</Label>
            <Input
              name="planned_checkout_date"
              type="date"
              defaultValue={plannedCheckoutDate || format(new Date(), "yyyy-MM-dd")}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Remarks</Label>
            <Textarea name="remarks" />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : isUpdate ? "Update notice" : "Give notice"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
