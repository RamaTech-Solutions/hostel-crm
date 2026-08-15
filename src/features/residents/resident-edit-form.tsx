"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateResident } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import type { Resident, ResidentContact } from "@/types/database";

export function ResidentEditForm({
  resident,
  contacts,
}: {
  resident: Resident;
  contacts: ResidentContact[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const guardian = contacts.find((contact) => contact.contact_type === "guardian");
  const emergency = contacts.find((contact) => contact.contact_type === "emergency");
  const address = resident.permanent_address as { address_line?: string; city?: string; state?: string; pincode?: string } | null;
  const [gender, setGender] = useState(resident.gender ?? "");
  const [idType, setIdType] = useState(resident.id_type ?? "");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("gender", gender);
    formData.set("id_type", idType);
    const result = await updateResident(resident.id, formData);
    if (result.error) {
      toast.error(result.error);
      setLoading(false);
      return;
    }
    toast.success("Resident updated");
    router.push(`/residents/${resident.id}`);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader><CardTitle>Edit resident</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
          <p className="text-sm text-muted-foreground">Room and bed changes use Transfer. This form does not move the resident.</p>
          <div className="space-y-2"><Label>Full name</Label><Input name="full_name" required defaultValue={resident.full_name} /></div>
          <div className="space-y-2"><Label>Mobile</Label><Input name="mobile" required defaultValue={resident.mobile} /></div>
          <div className="space-y-2"><Label>Email</Label><Input name="email" type="email" defaultValue={resident.email ?? ""} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2"><Label>Date of birth</Label><Input name="date_of_birth" type="date" defaultValue={resident.date_of_birth ?? ""} /></div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={gender || undefined} onValueChange={setGender}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2"><Label>Address</Label><Input name="address_line" defaultValue={address?.address_line ?? ""} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2"><Label>City</Label><Input name="city" defaultValue={address?.city ?? ""} /></div>
            <div className="space-y-2"><Label>State</Label><Input name="state" defaultValue={address?.state ?? ""} /></div>
          </div>
          <div className="space-y-2"><Label>Pincode</Label><Input name="pincode" defaultValue={address?.pincode ?? ""} /></div>
          <div className="space-y-2"><Label>Guardian name</Label><Input name="guardian_name" defaultValue={guardian?.name ?? ""} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2"><Label>Relation</Label><Input name="guardian_relation" defaultValue={guardian?.relation ?? ""} /></div>
            <div className="space-y-2"><Label>Guardian phone</Label><Input name="guardian_phone" defaultValue={guardian?.phone ?? ""} /></div>
          </div>
          <div className="space-y-2"><Label>Emergency name</Label><Input name="emergency_name" defaultValue={emergency?.name ?? ""} /></div>
          <div className="space-y-2"><Label>Emergency phone</Label><Input name="emergency_phone" defaultValue={emergency?.phone ?? ""} /></div>
          <div className="space-y-2"><Label>Company / college</Label><Input name="company_college" defaultValue={resident.company_college ?? ""} /></div>
          <div className="space-y-2"><Label>Employee / student ID</Label><Input name="employee_student_id" defaultValue={resident.employee_student_id ?? ""} /></div>
          <div className="space-y-2"><Label>Work address</Label><Textarea name="work_address" defaultValue={resident.work_address ?? ""} /></div>
          <div className="space-y-2">
            <Label>ID type</Label>
            <Select value={idType || undefined} onValueChange={setIdType}>
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
          <div className="space-y-2"><Label>ID number (leave blank to keep current masked value)</Label><Input name="id_number" /></div>
          <div className="space-y-2"><Label>Monthly rent (₹)</Label><Input name="monthly_rent" type="number" min={0} defaultValue={Number(resident.monthly_rent)} /></div>
          <div className="space-y-2"><Label>Security deposit (₹)</Label><Input name="security_deposit_amount" type="number" min={0} defaultValue={Number(resident.security_deposit_amount)} /></div>
          <div className="space-y-2"><Label>Planned checkout</Label><Input name="planned_checkout_date" type="date" defaultValue={resident.planned_checkout_date ?? ""} /></div>
          <div className="space-y-2"><Label>Remarks</Label><Textarea name="remarks" defaultValue={resident.remarks ?? ""} /></div>
          <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save changes"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
