import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ListPagination({
  page,
  pageSize,
  total,
  hrefFor,
}: {
  page: number;
  pageSize: number;
  total: number;
  hrefFor: (page: number) => string;
}) {
  const last = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        Showing {from}–{to} of {total}
      </p>
      <div className="flex gap-2">
        <Button asChild variant="outline" size="sm" className={page <= 1 ? "pointer-events-none opacity-50" : undefined}>
          <Link href={page <= 1 ? hrefFor(1) : hrefFor(page - 1)} aria-disabled={page <= 1}>
            Previous
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className={page >= last ? "pointer-events-none opacity-50" : undefined}>
          <Link href={page >= last ? hrefFor(last) : hrefFor(page + 1)} aria-disabled={page >= last}>
            Next
          </Link>
        </Button>
      </div>
    </div>
  );
}
