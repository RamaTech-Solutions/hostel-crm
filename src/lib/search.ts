const MAX_SEARCH_LENGTH = 80;

export function sanitizeSearchTerm(raw: string | undefined | null): string {
  if (!raw) return "";
  return raw
    .trim()
    .slice(0, MAX_SEARCH_LENGTH)
    .replace(/[%_,()\\"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
