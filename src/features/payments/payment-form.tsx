"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { recordPayment } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { oldestOutstandingCharge, formatPeriodLabel, overpaymentBlocked } from "@/lib/finance/period";
import type { RentChargeBalance } from "@/types/database";

export function PaymentForm({
  residentId,
  propertyId,
  defaultRent,
  charges,
}: {
  residentId: string;
  propertyId: string;
  defaultRent: number;
  charges: RentChargeBalance[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const paymentId = useRef(crypto.randomUUID());
  const defaultCharge = oldestOutstandingCharge(charges);
  const [chargeId, setChargeId] = useState(defaultCharge?.id ?? "");
  const [paymentType, setPaymentType] = useState("rent");
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const selected = useMemo(() => charges.find((c) => c.id === chargeId), [charges, chargeId]);
  const outstanding = selected ? Number(selected.outstanding) : 0;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const amount = Number(new FormData(form).get("amount"));
    if (paymentType === "rent" && selected && overpaymentBlocked(amount, outstanding)) {
      toast.error(`This amount is more than the outstanding for this period. Enter ₹${outstanding} or record a separate payment.`);
      return;
    }
    setLoading(true);
    const formData = new FormData(form);
    formData.set("payment_id", paymentId.current);
    formData.set("resident_id", residentId);
    formData.set("property_id", propertyId);
    formData.set("payment_type", paymentType);
    formData.set("payment_method", paymentMethod);
    if (paymentType === "rent" && chargeId) formData.set("rent_charge_id", chargeId);
    const result = await recordPayment(formData);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Payment recorded");
      paymentId.current = crypto.randomUUID();
      form.reset();
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Amount (₹)</Label>
          <Input name="amount" type="number" min={1} step="0.01" defaultValue={selected ? outstanding : defaultRent} required />
        </div>
        <div className="space-y-2">
          <Label>Payment Date</Label>
          <Input name="payment_date" type="date" defaultValue={format(new Date(), "yyyy-MM-dd")} required />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={paymentType} onValueChange={setPaymentType}>
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
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
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
      {paymentType === "rent" ? (
        <div className="space-y-2">
          <Label>Apply to period</Label>
          {charges.filter((c) => Number(c.outstanding) > 0).length === 0 ? (
            <p className="text-sm text-muted-foreground">No open rent charges. Generate this month’s rent first, or record a non-rent payment.</p>
          ) : (
            <Select value={chargeId} onValueChange={setChargeId}>
              <SelectTrigger><SelectValue placeholder="Select a charge" /></SelectTrigger>
              <SelectContent>
                {charges.filter((c) => Number(c.outstanding) > 0).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {formatPeriodLabel(c.period_start)} · outstanding ₹{Number(c.outstanding)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {selected ? (
            <p className="text-xs text-muted-foreground">
              {formatPeriodLabel(selected.period_start)} outstanding ₹{outstanding}. One payment settles one period.
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="space-y-2">
        <Label>Transaction Reference</Label>
        <Input name="transaction_reference" placeholder="UPI ref / receipt no." />
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea name="notes" />
      </div>
      <Button type="submit" disabled={loading || (paymentType === "rent" && !chargeId)}>
        {loading ? "Recording..." : "Record Payment"}
      </Button>
    </form>
  );
}
