"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { checkoutResident } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { format } from "date-fns";

export function CheckoutForm({ residentId, depositAmount }: { residentId: string; depositAmount: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await checkoutResident(residentId, formData);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Resident checked out successfully");
      router.push(`/residents/${residentId}`);
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader><CardTitle>Checkout Resident</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label>Checkout Date</Label>
            <Input name="checkout_date" type="date" defaultValue={format(new Date(), "yyyy-MM-dd")} required />
          </div>
          <div className="space-y-2">
            <Label>Final Payment (₹)</Label>
            <Input name="final_payment_amount" type="number" min={0} defaultValue={0} />
          </div>
          <div className="space-y-2">
            <Label>Deposit Refund (₹)</Label>
            <Input name="deposit_refund" type="number" min={0} defaultValue={depositAmount} />
          </div>
          <div className="space-y-2">
            <Label>Deductions (₹)</Label>
            <Input name="deposit_deductions" type="number" min={0} defaultValue={0} />
          </div>
          <div className="space-y-2">
            <Label>Remarks</Label>
            <Textarea name="remarks" />
          </div>
          <Button type="submit" variant="destructive" disabled={loading}>
            {loading ? "Processing..." : "Complete Checkout"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
