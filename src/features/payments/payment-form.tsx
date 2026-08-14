"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { recordPayment } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";

export function PaymentForm({
  residentId,
  propertyId,
  defaultRent,
}: {
  residentId: string;
  propertyId: string;
  defaultRent: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("resident_id", residentId);
    formData.set("property_id", propertyId);
    const result = await recordPayment(formData);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Payment recorded");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Amount (₹)</Label>
          <Input name="amount" type="number" defaultValue={defaultRent} required />
        </div>
        <div className="space-y-2">
          <Label>Payment Date</Label>
          <Input name="payment_date" type="date" defaultValue={format(new Date(), "yyyy-MM-dd")} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select name="payment_type" defaultValue="rent">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="rent">Rent</SelectItem>
              <SelectItem value="deposit">Deposit</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Method</Label>
          <Select name="payment_method" defaultValue="upi">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="upi">UPI</SelectItem>
              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              <SelectItem value="card">Card</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Rent Month</Label>
          <Input name="rent_month" type="month" defaultValue={format(new Date(), "yyyy-MM")} />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select name="status" defaultValue="paid">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Transaction Reference</Label>
        <Input name="transaction_reference" placeholder="UPI ref / receipt no." />
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea name="notes" />
      </div>
      <Button type="submit" disabled={loading}>{loading ? "Recording..." : "Record Payment"}</Button>
    </form>
  );
}
