import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, ExternalLink } from "lucide-react";

export default function SetupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Building2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Supabase setup required</CardTitle>
          <CardDescription>
            Add your Supabase credentials to run the PG CRM locally.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <ol className="list-decimal space-y-3 pl-5">
            <li>
              Create a project at{" "}
              <a
                href="https://supabase.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline inline-flex items-center gap-1"
              >
                supabase.com <ExternalLink className="h-3 w-3" />
              </a>
            </li>
            <li>
              Open <strong>Project Settings → API</strong> and copy the Project URL and{" "}
              <code className="rounded bg-muted px-1">anon public</code> key.
            </li>
            <li>
              Edit <code className="rounded bg-muted px-1">pg-crm/.env.local</code>:
              <pre className="mt-2 rounded-lg bg-muted p-3 text-xs overflow-x-auto">
{`NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...`}
              </pre>
            </li>
            <li>
              Run SQL migrations from <code className="rounded bg-muted px-1">supabase/migrations/</code>{" "}
              in the Supabase SQL Editor (see <code className="rounded bg-muted px-1">SETUP.md</code>).
            </li>
            <li>
              Seed demo data: <code className="rounded bg-muted px-1">npm run seed</code>
            </li>
            <li>Restart the dev server: <code className="rounded bg-muted px-1">npm run dev</code></li>
          </ol>
          <Button asChild className="w-full">
            <Link href="/setup">Refresh after configuring</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
