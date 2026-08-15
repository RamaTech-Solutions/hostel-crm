export function isUsableContact(contact: { name?: string | null; phone?: string | null }): boolean {
  return Boolean(contact.name?.trim() && contact.phone?.trim());
}

export function hasOperationalContact(
  contacts: Array<{ contact_type: string; name?: string | null; phone?: string | null }>
): boolean {
  return contacts.some(
    (contact) =>
      (contact.contact_type === "emergency" || contact.contact_type === "guardian") &&
      isUsableContact(contact)
  );
}

export function isResidentIdentityDocument(documentType: string): boolean {
  return documentType !== "profile_photo";
}

export function hasResidentIdentityDocument(documents: Array<{ document_type: string }>): boolean {
  return documents.some((doc) => isResidentIdentityDocument(doc.document_type));
}
