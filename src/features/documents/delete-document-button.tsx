"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteDocument } from "@/lib/actions";
import { Button } from "@/components/ui/button";
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
    if (!window.confirm("Remove this document from the resident record? The file will no longer be available.")) {
      return;
    }
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
    <Button type="button" variant="outline" size="sm" disabled={loading} onClick={onDelete}>
      {loading ? "Removing..." : "Delete"}
    </Button>
  );
}
