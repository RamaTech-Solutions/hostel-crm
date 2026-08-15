const STAGING_REF_PLACEHOLDER = "your-staging-project-ref";

export function supabaseProjectRefFromUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.toLowerCase();
    const match = host.match(/^([a-z0-9]+)\.supabase\.co$/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function assertDemoSeedTarget(input: {
  supabaseUrl: string;
  allowDemoSeed: string | undefined;
  confirmRef: string | undefined;
  productionRef: string | undefined;
}): { ok: true; ref: string } | { ok: false; error: string } {
  const actual = supabaseProjectRefFromUrl(input.supabaseUrl);
  if (!actual) {
    return { ok: false, error: "Could not derive a Supabase project ref from NEXT_PUBLIC_SUPABASE_URL." };
  }
  const productionRef = (input.productionRef ?? "").trim().toLowerCase();
  if (productionRef && actual === productionRef) {
    return { ok: false, error: "Refusing to seed: target is the production Supabase project." };
  }
  if (input.allowDemoSeed !== "1") {
    return { ok: false, error: "Set ALLOW_DEMO_SEED=1 to seed the staging demo (never production)." };
  }
  const confirm = (input.confirmRef ?? "").trim().toLowerCase();
  if (!confirm || confirm === STAGING_REF_PLACEHOLDER) {
    return { ok: false, error: "Set CONFIRM_SUPABASE_PROJECT_REF to the staging project ref." };
  }
  if (confirm !== actual) {
    return { ok: false, error: "CONFIRM_SUPABASE_PROJECT_REF does not match the configured Supabase URL ref." };
  }
  return { ok: true, ref: actual };
}
