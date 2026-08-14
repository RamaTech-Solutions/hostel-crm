"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadDocument } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export function DocumentUploadForm({
  residentId,
  organizationId,
  propertyId,
}: {
  residentId: string;
  organizationId: string;
  propertyId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [docType, setDocType] = useState("aadhaar");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fileInput = (e.target as HTMLFormElement).file as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be under 5MB");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const storagePath = `${organizationId}/${propertyId}/${residentId}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("resident-documents")
      .upload(storagePath, file);

    if (uploadError) {
      toast.error(uploadError.message);
      setLoading(false);
      return;
    }

    const result = await uploadDocument(
      residentId,
      docType,
      file.name,
      storagePath,
      file.type,
      file.size
    );

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Document uploaded");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Document Type</Label>
        <Select value={docType} onValueChange={setDocType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="aadhaar">Aadhaar</SelectItem>
            <SelectItem value="pan">PAN</SelectItem>
            <SelectItem value="college_id">College ID</SelectItem>
            <SelectItem value="employee_id">Employee ID</SelectItem>
            <SelectItem value="agreement">Agreement</SelectItem>
            <SelectItem value="police_verification">Police Verification</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>File (max 5MB)</Label>
        <Input name="file" type="file" accept=".pdf,.jpg,.jpeg,.png" required />
      </div>
      <Button type="submit" disabled={loading}>{loading ? "Uploading..." : "Upload Document"}</Button>
    </form>
  );
}
