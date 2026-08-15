export const CURRENTLY_STAYING_STATUSES = ["active", "notice_period"] as const;

export function isCurrentlyStaying(status: string): boolean {
  return status === "active" || status === "notice_period";
}
