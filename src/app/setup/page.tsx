import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { AuthShell } from "@/components/brand/auth-shell";

export default function SetupPage() {
  return (
    <AuthShell>
      <h1 className="text-[32px] font-semibold leading-10">Supabase setup required</h1>
      <p className="mt-2 text-sm leading-[22px] text-muted-foreground">
        Add your Supabase credentials to run Awaasly locally.
      </p>
      <ol className="mt-6 list-decimal space-y-3 pl-5 text-sm leading-[22px]">
        <li>
          Create a project at{" "}
          <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">
            supabase.com <ExternalLink className="h-3 w-3" />
          </a>
        </li>
        <li>
          Open <strong>Project Settings → API</strong> and copy the Project URL and{" "}
          <code className="rounded bg-muted px-1">anon public</code> key.
        </li>
        <li>
          Edit <code className="rounded bg-muted px-1">.env.local</code>:
          <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-3 text-xs">
{`NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...`}
          </pre>
        </li>
        <li>
          Run SQL migrations from <code className="rounded bg-muted px-1">supabase/migrations/</code>{" "}
          (see <code className="rounded bg-muted px-1">SETUP.md</code>).
        </li>
        <li>
          Seed demo data: <code className="rounded bg-muted px-1">npm run seed</code>
        </li>
        <li>Restart the dev server: <code className="rounded bg-muted px-1">npm run dev</code></li>
      </ol>
      <Button asChild className="mt-6 w-full">
        <Link href="/setup">Refresh after configuring</Link>
      </Button>
    </AuthShell>
  );
}
