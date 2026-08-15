"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteDocument } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { toast } from "sonner";

export function DeleteDocumentButton({
  documentId,
  residentId,
}: {
  documentId: string;
  residentId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    setLoading(true);
    const form = new FormData();
    form.set("documentId", documentId);
    form.set("residentId", residentId);
    const result = await deleteDocument(form);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Document removed");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <ConfirmAction
      title="Delete this document?"
      description="Remove this file from the resident record. It will no longer be available to view or download."
      confirmLabel="Delete document"
      destructive
      pending={loading}
      onConfirm={onDelete}
      trigger={
        <Button type="button" variant="outline" size="sm" disabled={loading}>
          {loading ? "Removing..." : "Delete"}
        </Button>
      }
    />
  );
}
