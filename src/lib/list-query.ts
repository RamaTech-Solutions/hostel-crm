export const LIST_PAGE_SIZE = 50;

export function parsePage(raw: string | undefined | null): number {
  const n = Number.parseInt(String(raw ?? "1"), 10);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

export function pageRange(page: number, pageSize = LIST_PAGE_SIZE): { from: number; to: number } {
  const safePage = page < 1 ? 1 : page;
  const from = (safePage - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}

export function totalPages(total: number, pageSize = LIST_PAGE_SIZE): number {
  if (total <= 0) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}
