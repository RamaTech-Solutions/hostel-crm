export const DOCUMENT_ERRORS = {
  unauthorized: "You don't have access to this resident document.",
  missing: "This document is no longer available.",
  unsupported: "This file type isn't supported.",
  tooLarge: "This file is too large. Choose a smaller file.",
  uploadFailed: "We couldn't upload this document. Please try again.",
  deleteFailed: "We couldn't remove this document. Please try again.",
  cleanupFailed: "The file was removed, but we couldn't finish updating the record. Please try again.",
  conflictRetry: "This request doesn't match the document already saved. Refresh and try again.",
} as const;
