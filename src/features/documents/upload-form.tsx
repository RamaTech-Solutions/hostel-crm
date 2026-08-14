"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadDocument } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export function DocumentUploadForm({ residentId }: { residentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [docType, setDocType] = useState("aadhaar");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.file as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.set("residentId", residentId);
    formData.set("documentType", docType);
    formData.set("file", file);

    const result = await uploadDocument(formData);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Document uploaded");
      form.reset();
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
            <SelectItem value="agreement">Agreement</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="file">File (max 5MB)</Label>
        <Input id="file" name="file" type="file" accept="image/*,.pdf" required />
      </div>
      <Button type="submit" disabled={loading}>{loading ? "Uploading..." : "Upload"}</Button>
    </form>
  );
}
