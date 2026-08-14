import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/get-user";
import { globalSearch } from "@/lib/queries";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const { q } = await searchParams;
  const results = q ? await globalSearch(user, q) : { residents: [], rooms: [] };

  return (
    <div>
      <Breadcrumbs items={[{ label: "Search" }]} />
      <h1 className="text-2xl font-bold mb-2">Search Results</h1>
      {q && <p className="text-muted-foreground mb-6">Showing results for &quot;{q}&quot;</p>}

      {!q ? (
        <p className="text-muted-foreground">Enter a search term in the header search bar.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Residents ({results.residents.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {results.residents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No residents found</p>
              ) : (
                results.residents.map((r) => (
                  <Link key={r.id} href={`/residents/${r.id}`} className="block rounded border p-3 hover:bg-muted/50">
                    <p className="font-medium">{r.full_name}</p>
                    <p className="text-xs text-muted-foreground">{r.mobile} · {r.property?.name}</p>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Rooms ({results.rooms.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {results.rooms.length === 0 ? (
                <p className="text-sm text-muted-foreground">No rooms found</p>
              ) : (
                results.rooms.map((r) => (
                  <div key={r.id} className="rounded border p-3">
                    <p className="font-medium">Room {r.room_number}</p>
                    <p className="text-xs text-muted-foreground">{r.property?.name}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
