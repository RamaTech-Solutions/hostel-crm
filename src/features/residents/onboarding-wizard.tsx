"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { onboardResident } from "@/lib/actions";
import { residentCreateDetailsSchema, residentStaySchema } from "@/lib/residents/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { IndianMobileInput } from "@/components/india/indian-mobile-input";
import { StateSelect } from "@/components/india/state-select";
import { CheckCircle2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Property } from "@/types/database";

const STEPS = ["Resident Details", "Stay & Financial Setup", "Review & Add"];

type BedOption = {
  id: string;
  bed_label: string;
  status: string;
  room: { id: string; room_number: string; monthly_rent: number };
};

const emptyForm = {
  full_name: "",
  mobile: "",
  email: "",
  gender: "",
  date_of_birth: "",
  address_line: "",
  city: "",
  state: "",
  pincode: "",
  guardian_name: "",
  guardian_relation: "",
  guardian_phone: "",
  emergency_name: "",
  emergency_phone: "",
  company_college: "",
  employee_student_id: "",
  work_address: "",
  id_type: "",
  id_number: "",
  property_id: "",
  room_id: "",
  bed_id: "",
  joining_date: new Date().toISOString().split("T")[0],
  planned_checkout_date: "",
  monthly_rent: "",
  security_deposit_amount: "",
  remarks: "",
};

export function OnboardingWizard({ properties }: { properties: Property[] }) {
  const router = useRouter();
  const residentIdRef = useRef(crypto.randomUUID());
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [residentId, setResidentId] = useState<string | null>(null);
  const [availableBeds, setAvailableBeds] = useState<BedOption[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [keptPropertyId, setKeptPropertyId] = useState("");

  function updateField(key: keyof typeof emptyForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function loadAvailableBeds(propertyId: string) {
    const res = await fetch(`/api/beds/available?propertyId=${propertyId}`);
    const data = await res.json();
    setAvailableBeds(data.beds ?? []);
  }

  const uniqueRooms = useMemo(
    () => [...new Map(availableBeds.map((bed) => [bed.room.id, bed.room])).values()],
    [availableBeds]
  );
  const bedsForRoom = availableBeds.filter((bed) => bed.room.id === form.room_id);
  const selectedProperty = properties.find((property) => property.id === form.property_id);
  const selectedRoom = uniqueRooms.find((room) => room.id === form.room_id);
  const selectedBed = bedsForRoom.find((bed) => bed.id === form.bed_id);

  async function handleNext() {
    if (step === 0) {
      const parsed = residentCreateDetailsSchema.safeParse(form);
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message);
        return;
      }
    }
    if (step === 1) {
      const rent = form.monthly_rent || String(selectedRoom?.monthly_rent ?? 0);
      const parsed = residentStaySchema.safeParse({
        ...form,
        monthly_rent: rent,
        security_deposit_amount: form.security_deposit_amount || 0,
      });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message);
        return;
      }
      if (!form.monthly_rent && selectedRoom) updateField("monthly_rent", String(selectedRoom.monthly_rent));
    }
    if (step === 0 && form.property_id) await loadAvailableBeds(form.property_id);
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  async function handleSubmit() {
    if (loading) return;
    setLoading(true);
    const result = await onboardResident({
      ...form,
      resident_id: residentIdRef.current,
      monthly_rent: form.monthly_rent || selectedRoom?.monthly_rent || 0,
      security_deposit_amount: form.security_deposit_amount || 0,
    });
    if (result.error) {
      toast.error(result.error);
      setLoading(false);
      return;
    }
    setSuccess(true);
    setResidentId(result.data?.id ?? residentIdRef.current);
    setLoading(false);
  }

  function startAnother() {
    const propertyId = form.property_id;
    residentIdRef.current = crypto.randomUUID();
    setSuccess(false);
    setResidentId(null);
    setAvailableBeds([]);
    setForm({
      ...emptyForm,
      property_id: propertyId,
      joining_date: new Date().toISOString().split("T")[0],
    });
    setKeptPropertyId(propertyId);
    setStep(0);
    if (propertyId) void loadAvailableBeds(propertyId);
  }

  if (success) {
    return (
      <Card className="max-w-lg mx-auto text-center">
        <CardContent className="py-12">
          <CheckCircle2 className="h-16 w-16 text-success mx-auto mb-4" />
          <h2 className="mb-2 text-xl font-semibold">Resident added successfully</h2>
          <p className="text-muted-foreground mb-6">{form.full_name} is now on an active stay.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {residentId ? (
              <Button onClick={() => router.push(`/residents/${residentId}`)}>View Resident</Button>
            ) : null}
            <Button variant="outline" onClick={startAnother}>Add Another Resident</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <p className="text-xs font-medium text-muted-foreground">Step {step + 1} of {STEPS.length}</p>
        <p className="mt-1 text-xl font-semibold leading-7">{STEPS[step]}</p>
        <Progress value={((step + 1) / STEPS.length) * 100} className="mt-3" />
      </div>

      <Card>
        <CardHeader><CardTitle>{STEPS[step]}</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          {step === 0 ? (
            <>
              <section className="space-y-3">
                <div className="space-y-2"><Label>Full Name *</Label><Input value={form.full_name} onChange={(e) => updateField("full_name", e.target.value)} /></div>
                <IndianMobileInput id="mobile" name="mobile" label="Mobile" required value={form.mobile} onChange={(value) => updateField("mobile", value)} />
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} /></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2"><Label>Date of Birth</Label><Input type="date" value={form.date_of_birth} onChange={(e) => updateField("date_of_birth", e.target.value)} /></div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select value={form.gender || undefined} onValueChange={(value) => updateField("gender", value)}>
                      <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>
              <section className="space-y-3">
                <h3 className="text-sm font-medium">Address (optional)</h3>
                <div className="space-y-2"><Label>Address</Label><Input value={form.address_line} onChange={(e) => updateField("address_line", e.target.value)} /></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2"><Label>City</Label><Input value={form.city} onChange={(e) => updateField("city", e.target.value)} /></div>
                  <StateSelect
                    name="state"
                    value={form.state}
                    onChange={(value) => updateField("state", value)}
                    allowEmpty
                  />
                </div>
                <div className="space-y-2"><Label>Pincode</Label><Input value={form.pincode} onChange={(e) => updateField("pincode", e.target.value)} /></div>
              </section>
              <section className="space-y-3">
                <h3 className="text-sm font-medium">Guardian (optional)</h3>
                <div className="space-y-2"><Label>Name</Label><Input value={form.guardian_name} onChange={(e) => updateField("guardian_name", e.target.value)} /></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2"><Label>Relation</Label><Input value={form.guardian_relation} onChange={(e) => updateField("guardian_relation", e.target.value)} /></div>
                  <IndianMobileInput name="guardian_phone" label="Phone" value={form.guardian_phone} onChange={(value) => updateField("guardian_phone", value)} />
                </div>
              </section>
              <section className="space-y-3">
                <h3 className="text-sm font-medium">Emergency contact (optional)</h3>
                <div className="space-y-2"><Label>Name</Label><Input value={form.emergency_name} onChange={(e) => updateField("emergency_name", e.target.value)} /></div>
                <IndianMobileInput name="emergency_phone" label="Phone" value={form.emergency_phone} onChange={(value) => updateField("emergency_phone", value)} />
              </section>
              <section className="space-y-3">
                <h3 className="text-sm font-medium">Work / college (optional)</h3>
                <div className="space-y-2"><Label>Company / College</Label><Input value={form.company_college} onChange={(e) => updateField("company_college", e.target.value)} /></div>
                <div className="space-y-2"><Label>Employee / Student ID</Label><Input value={form.employee_student_id} onChange={(e) => updateField("employee_student_id", e.target.value)} /></div>
                <div className="space-y-2"><Label>Work address</Label><Textarea value={form.work_address} onChange={(e) => updateField("work_address", e.target.value)} /></div>
              </section>
              <section className="space-y-3">
                <h3 className="text-sm font-medium">ID (optional — stored masked)</h3>
                <div className="space-y-2">
                  <Label>ID Type</Label>
                  <Select value={form.id_type || undefined} onValueChange={(value) => updateField("id_type", value)}>
                    <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aadhaar">Aadhaar</SelectItem>
                      <SelectItem value="pan">PAN</SelectItem>
                      <SelectItem value="passport">Passport</SelectItem>
                      <SelectItem value="driving_license">Driving License</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>ID Number</Label><Input value={form.id_number} onChange={(e) => updateField("id_number", e.target.value)} /></div>
              </section>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <section className="space-y-3">
                <h3 className="text-sm font-medium">Stay details</h3>
                {keptPropertyId ? (
                  <p className="text-xs text-muted-foreground">Property kept from the last add. You can change it.</p>
                ) : null}
                <div className="space-y-2">
                  <Label>Property *</Label>
                  <Select
                    value={form.property_id || undefined}
                    onValueChange={(value) => {
                      updateField("property_id", value);
                      updateField("room_id", "");
                      updateField("bed_id", "");
                      void loadAvailableBeds(value);
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                    <SelectContent>
                      {properties.map((property) => (
                        <SelectItem key={property.id} value={property.id}>{property.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Room *</Label>
                  <Select value={form.room_id || undefined} onValueChange={(value) => { updateField("room_id", value); updateField("bed_id", ""); }}>
                    <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                    <SelectContent>
                      {uniqueRooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>Room {room.room_number} — ₹{room.monthly_rent}/mo</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.property_id && uniqueRooms.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No vacant beds in this property.</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label>Bed *</Label>
                  <Select value={form.bed_id || undefined} onValueChange={(value) => updateField("bed_id", value)}>
                    <SelectTrigger><SelectValue placeholder="Select bed" /></SelectTrigger>
                    <SelectContent>
                      {bedsForRoom.map((bed) => (
                        <SelectItem key={bed.id} value={bed.id}>Bed {bed.bed_label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Move-in date *</Label><Input type="date" value={form.joining_date} onChange={(e) => updateField("joining_date", e.target.value)} /></div>
                <div className="space-y-2"><Label>Planned checkout</Label><Input type="date" value={form.planned_checkout_date} onChange={(e) => updateField("planned_checkout_date", e.target.value)} /></div>
              </section>
              <section className="space-y-3">
                <h3 className="text-sm font-medium">Financial setup</h3>
                <p className="text-xs text-muted-foreground">Agreed terms only. Record received money later in Payments.</p>
                <div className="space-y-2"><Label>Monthly rent (₹) *</Label><Input type="number" min={0} value={form.monthly_rent} onChange={(e) => updateField("monthly_rent", e.target.value)} /></div>
                <div className="space-y-2"><Label>Security deposit (₹)</Label><Input type="number" min={0} value={form.security_deposit_amount} onChange={(e) => updateField("security_deposit_amount", e.target.value)} /></div>
                <div className="space-y-2"><Label>Remarks</Label><Textarea value={form.remarks} onChange={(e) => updateField("remarks", e.target.value)} /></div>
              </section>
            </>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Resident</p>
                <p className="font-medium">{form.full_name}</p>
                <p>{form.mobile}</p>
                {form.email ? <p>{form.email}</p> : null}
                {form.guardian_name ? <p>Guardian: {form.guardian_name}</p> : null}
                {form.emergency_name ? <p>Emergency: {form.emergency_name}</p> : null}
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Stay</p>
                <p className="font-medium">{selectedProperty?.name}</p>
                <p>Room {selectedRoom?.room_number} · Bed {selectedBed?.bed_label}</p>
                <p>Move-in: {formatDate(form.joining_date)}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Financial setup</p>
                <p>Monthly rent: {formatCurrency(Number(form.monthly_rent || selectedRoom?.monthly_rent || 0))}</p>
                {form.security_deposit_amount ? <p>Security deposit: {formatCurrency(Number(form.security_deposit_amount))}</p> : null}
              </div>
            </div>
          ) : null}

          <div className="flex justify-between pt-2">
            <Button variant="outline" type="button" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}>
              {step === 2 ? "Back to Edit" : "Back"}
            </Button>
            {step < 2 ? (
              <Button type="button" onClick={() => void handleNext()}>Continue</Button>
            ) : (
              <Button type="button" onClick={() => void handleSubmit()} disabled={loading}>
                {loading ? "Adding..." : "Add Resident"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
