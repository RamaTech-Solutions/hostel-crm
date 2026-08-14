"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { onboardResident } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import type { Property } from "@/types/database";

const STEPS = [
  "Personal Details",
  "Contact & Emergency",
  "Address",
  "Identity",
  "Work / College",
  "Select Property",
  "Select Room",
  "Select Bed",
  "Rent & Deposit",
  "Review",
];

interface BedOption {
  id: string;
  bed_label: string;
  room: { id: string; room_number: string; monthly_rent: number };
}

export function OnboardingWizard({ properties }: { properties: Property[] }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [residentId, setResidentId] = useState<string | null>(null);
  const [availableBeds, setAvailableBeds] = useState<BedOption[]>([]);
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState<Record<string, string>>({
    gender: "",
    id_type: "aadhaar",
    joining_date: today,
    security_deposit_amount: "5000",
  });

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function loadAvailableBeds(propertyId: string) {
    const res = await fetch(`/api/beds/available?propertyId=${propertyId}`);
    const data = await res.json();
    setAvailableBeds(data.beds ?? []);
  }

  async function handleNext() {
    if (step === 5 && form.property_id) {
      await loadAvailableBeds(form.property_id);
    }
    // Prefill rent from selected room when entering rent step
    if (step === 7 && form.bed_id) {
      const selectedBed = availableBeds.find((b) => b.id === form.bed_id);
      if (selectedBed && !form.monthly_rent) {
        updateField("monthly_rent", String(selectedBed.room.monthly_rent));
      }
    }
    if (step < STEPS.length - 1) setStep(step + 1);
  }

  function handleBack() {
    if (step > 0) setStep(step - 1);
  }

  async function handleSubmit() {
    setLoading(true);
    const selectedBed = availableBeds.find((b) => b.id === form.bed_id);
    const joiningDate = form.joining_date || today;
    const monthlyRent =
      form.monthly_rent || String(selectedBed?.room.monthly_rent ?? 0);
    const deposit = form.security_deposit_amount || "0";

    if (!form.property_id || !form.bed_id || !selectedBed?.room.id) {
      toast.error("Please select property, room, and bed");
      setLoading(false);
      return;
    }

    const result = await onboardResident({
      ...form,
      room_id: selectedBed.room.id,
      joining_date: joiningDate,
      monthly_rent: monthlyRent,
      security_deposit_amount: deposit,
    });
    if (result.error) {
      toast.error(result.error);
      setLoading(false);
      return;
    }
    setSuccess(true);
    setResidentId(result.data?.id ?? null);
    setLoading(false);
  }

  if (success) {
    return (
      <Card className="max-w-lg mx-auto text-center">
        <CardContent className="py-12">
          <CheckCircle2 className="h-16 w-16 text-success mx-auto mb-4" />
          <h2 className="mb-2 text-xl font-semibold">Resident added</h2>
          <p className="text-muted-foreground mb-6">{form.full_name} has been added to the system.</p>
          <div className="flex gap-3 justify-center">
            {residentId && (
              <Button onClick={() => router.push(`/residents/${residentId}`)}>View Profile</Button>
            )}
            <Button variant="outline" onClick={() => router.push("/residents")}>Back to Residents</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const uniqueRooms = [...new Map(
    availableBeds.map((b) => [b.room.id, b.room])
  ).values()];

  const bedsForRoom = availableBeds.filter((b) => b.room.id === form.room_id);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <p className="text-xs font-medium text-muted-foreground">Step {step + 1} of {STEPS.length}</p>
        <p className="mt-1 text-xl font-semibold leading-7">{STEPS[step]}</p>
        <Progress value={((step + 1) / STEPS.length) * 100} className="mt-3" />
      </div>

      <Card>
        <CardHeader><CardTitle>{STEPS[step]}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <>
              <div className="space-y-2"><Label>Full Name *</Label><Input value={form.full_name ?? ""} onChange={(e) => updateField("full_name", e.target.value)} required /></div>
              <div className="space-y-2"><Label>Date of Birth</Label><Input type="date" value={form.date_of_birth ?? ""} onChange={(e) => updateField("date_of_birth", e.target.value)} /></div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={(v) => updateField("gender", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="space-y-2"><Label>Mobile *</Label><Input value={form.mobile ?? ""} onChange={(e) => updateField("mobile", e.target.value)} pattern="\d{10}" required /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email ?? ""} onChange={(e) => updateField("email", e.target.value)} /></div>
              <div className="space-y-2"><Label>Guardian Name *</Label><Input value={form.guardian_name ?? ""} onChange={(e) => updateField("guardian_name", e.target.value)} required /></div>
              <div className="space-y-2"><Label>Relation *</Label><Input value={form.guardian_relation ?? ""} onChange={(e) => updateField("guardian_relation", e.target.value)} required /></div>
              <div className="space-y-2"><Label>Guardian Phone *</Label><Input value={form.guardian_phone ?? ""} onChange={(e) => updateField("guardian_phone", e.target.value)} pattern="\d{10}" required /></div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2"><Label>Address *</Label><Input value={form.address_line ?? ""} onChange={(e) => updateField("address_line", e.target.value)} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>City *</Label><Input value={form.city ?? ""} onChange={(e) => updateField("city", e.target.value)} required /></div>
                <div className="space-y-2"><Label>State *</Label><Input value={form.state ?? ""} onChange={(e) => updateField("state", e.target.value)} required /></div>
              </div>
              <div className="space-y-2"><Label>Pincode *</Label><Input value={form.pincode ?? ""} onChange={(e) => updateField("pincode", e.target.value)} pattern="\d{6}" required /></div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="space-y-2">
                <Label>ID Type *</Label>
                <Select value={form.id_type} onValueChange={(v) => updateField("id_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aadhaar">Aadhaar</SelectItem>
                    <SelectItem value="pan">PAN</SelectItem>
                    <SelectItem value="passport">Passport</SelectItem>
                    <SelectItem value="driving_license">Driving License</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>ID Number *</Label><Input value={form.id_number ?? ""} onChange={(e) => updateField("id_number", e.target.value)} placeholder="Demo: XXXX-XXXX-1234" required /></div>
            </>
          )}

          {step === 4 && (
            <>
              <div className="space-y-2"><Label>Company / College</Label><Input value={form.company_college ?? ""} onChange={(e) => updateField("company_college", e.target.value)} /></div>
              <div className="space-y-2"><Label>Employee / Student ID</Label><Input value={form.employee_student_id ?? ""} onChange={(e) => updateField("employee_student_id", e.target.value)} /></div>
              <div className="space-y-2"><Label>Work / College Address</Label><Textarea value={form.work_address ?? ""} onChange={(e) => updateField("work_address", e.target.value)} /></div>
            </>
          )}

          {step === 5 && (
            <div className="space-y-2">
              <Label>Property *</Label>
              <Select value={form.property_id} onValueChange={(v) => { updateField("property_id", v); updateField("room_id", ""); updateField("bed_id", ""); }}>
                <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                <SelectContent>
                  {properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-2">
              <Label>Room *</Label>
              <Select value={form.room_id} onValueChange={(v) => { updateField("room_id", v); updateField("bed_id", ""); }}>
                <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                <SelectContent>
                  {uniqueRooms.map((r) => <SelectItem key={r.id} value={r.id}>Room {r.room_number} — ₹{r.monthly_rent}/mo</SelectItem>)}
                </SelectContent>
              </Select>
              {uniqueRooms.length === 0 && <p className="text-sm text-muted-foreground">No rooms with available beds</p>}
            </div>
          )}

          {step === 7 && (
            <div className="space-y-2">
              <Label>Bed *</Label>
              <Select value={form.bed_id} onValueChange={(v) => updateField("bed_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select bed" /></SelectTrigger>
                <SelectContent>
                  {bedsForRoom.map((b) => <SelectItem key={b.id} value={b.id}>Bed {b.bed_label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {step === 8 && (
            <>
              <div className="space-y-2"><Label>Joining Date *</Label><Input type="date" value={form.joining_date || today} onChange={(e) => updateField("joining_date", e.target.value)} required /></div>
              <div className="space-y-2"><Label>Planned Checkout</Label><Input type="date" value={form.planned_checkout_date ?? ""} onChange={(e) => updateField("planned_checkout_date", e.target.value)} /></div>
              <div className="space-y-2"><Label>Monthly Rent (₹) *</Label><Input type="number" value={form.monthly_rent ?? ""} onChange={(e) => updateField("monthly_rent", e.target.value)} required /></div>
              <div className="space-y-2"><Label>Security Deposit (₹)</Label><Input type="number" value={form.security_deposit_amount ?? "5000"} onChange={(e) => updateField("security_deposit_amount", e.target.value)} /></div>
              <div className="space-y-2"><Label>Remarks</Label><Textarea value={form.remarks ?? ""} onChange={(e) => updateField("remarks", e.target.value)} /></div>
            </>
          )}

          {step === 9 && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Name</span><span className="font-medium">{form.full_name}</span>
                <span className="text-muted-foreground">Mobile</span><span>{form.mobile}</span>
                <span className="text-muted-foreground">Guardian</span><span>{form.guardian_name} ({form.guardian_relation})</span>
                <span className="text-muted-foreground">Property</span><span>{properties.find((p) => p.id === form.property_id)?.name}</span>
                <span className="text-muted-foreground">Room / Bed</span><span>Room {uniqueRooms.find((r) => r.id === form.room_id)?.room_number} — Bed {bedsForRoom.find((b) => b.id === form.bed_id)?.bed_label}</span>
                <span className="text-muted-foreground">Joining Date</span><span>{form.joining_date || today}</span>
                <span className="text-muted-foreground">Monthly Rent</span><span>₹{form.monthly_rent}</span>
                <span className="text-muted-foreground">Deposit</span><span>₹{form.security_deposit_amount || "0"}</span>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={handleBack} disabled={step === 0}>Back</Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={handleNext}>Continue</Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>{loading ? "Confirming..." : "Confirm & Onboard"}</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
