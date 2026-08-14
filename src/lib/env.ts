export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const isConfigured =
    !!url &&
    !!anonKey &&
    url !== "https://your-project.supabase.co" &&
    anonKey !== "your-anon-key";

  return { url, anonKey, isConfigured };
}

export function requireSupabaseEnv() {
  const env = getSupabaseEnv();
  if (!env.isConfigured || !env.url || !env.anonKey) {
    throw new Error(
      "Supabase is not configured. Copy .env.example to .env.local and add your Project URL and anon key from https://supabase.com/dashboard/project/_/settings/api"
    );
  }
  return { url: env.url, anonKey: env.anonKey };
}
