"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { checkoutResident } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

export function CheckoutForm({ residentId, depositAmount }: { residentId: string; depositAmount: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingForm, setPendingForm] = useState<FormData | null>(null);

  async function completeCheckout(formData: FormData) {
    if (loading) return;
    setLoading(true);
    const result = await checkoutResident(residentId, formData);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Resident checked out successfully");
      router.push(`/residents/${residentId}`);
      router.refresh();
    }
    setLoading(false);
    setConfirmOpen(false);
    setPendingForm(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setPendingForm(new FormData(e.currentTarget));
    setConfirmOpen(true);
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
        <AlertDialog open={confirmOpen} onOpenChange={(open) => !loading && setConfirmOpen(open)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Check out this resident?</AlertDialogTitle>
              <AlertDialogDescription>
                The bed will become vacant. This resident stays in history as checked out. This cannot be undone from this screen.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={loading}>Go back</AlertDialogCancel>
              <AlertDialogAction
                disabled={loading || !pendingForm}
                className={cn(buttonVariants({ variant: "destructive" }))}
                onClick={async (event) => {
                  event.preventDefault();
                  if (pendingForm) await completeCheckout(pendingForm);
                }}
              >
                {loading ? "Working..." : "Complete checkout"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
