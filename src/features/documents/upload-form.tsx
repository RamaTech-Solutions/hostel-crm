"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadDocument } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { DOCUMENT_MAX_BYTES, validateUploadFile } from "@/lib/documents/files";

export function DocumentUploadForm({
  residentId,
  defaultType = "aadhaar",
}: {
  residentId: string;
  defaultType?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [docType, setDocType] = useState(defaultType);
  const documentId = useRef(crypto.randomUUID());

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.file as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (!file) {
      toast.error("Please select a file");
      return;
    }
    const checked = validateUploadFile(file);
    if (checked.error) {
      toast.error(checked.error);
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.set("residentId", residentId);
    formData.set("documentId", documentId.current);
    formData.set("documentType", docType);
    formData.set("file", file);

    const result = await uploadDocument(formData);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(docType === "profile_photo" ? "Photo uploaded" : "Document uploaded");
      documentId.current = crypto.randomUUID();
      form.reset();
      setDocType(defaultType);
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
            <SelectItem value="passport">Passport</SelectItem>
            <SelectItem value="driving_license">Driving License</SelectItem>
            <SelectItem value="college_id">College ID</SelectItem>
            <SelectItem value="employee_id">Employee ID</SelectItem>
            <SelectItem value="agreement">Agreement</SelectItem>
            <SelectItem value="police_verification">Police Verification</SelectItem>
            <SelectItem value="profile_photo">Profile photo</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="file">File (PDF, JPEG, PNG or WebP, max {DOCUMENT_MAX_BYTES / (1024 * 1024)}MB)</Label>
        <Input id="file" name="file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp" required />
      </div>
      <Button type="submit" disabled={loading}>{loading ? "Uploading..." : "Upload"}</Button>
    </form>
  );
}
