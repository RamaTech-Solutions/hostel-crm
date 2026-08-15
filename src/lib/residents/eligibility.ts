export function nextBedStatusAfterAssignmentEnd(currentStatus: string) {
  if (currentStatus === "maintenance" || currentStatus === "reserved") return currentStatus;
  return "available";
}

export function isBedAssignable(input: {
  hasActiveAssignment: boolean;
  status: string;
  propertyStatus: string;
}) {
  if (input.propertyStatus !== "active") return false;
  if (input.hasActiveAssignment) return false;
  if (input.status === "maintenance" || input.status === "reserved") return false;
  return true;
}
