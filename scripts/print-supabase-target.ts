#!/usr/bin/env npx tsx
/**
 * Prints the configured Supabase host and project ref only. Never prints keys.
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { supabaseProjectRefFromUrl } from "../src/lib/supabase-project-ref";

function loadEnv() {
  try {
    const content = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* .env.local optional if env already set */
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
let host = "(missing NEXT_PUBLIC_SUPABASE_URL)";
try {
  host = new URL(url).host;
} catch {
  host = "(invalid NEXT_PUBLIC_SUPABASE_URL)";
}
const ref = supabaseProjectRefFromUrl(url) ?? "(unknown)";
console.log(`Supabase host: ${host}`);
console.log(`Supabase project ref: ${ref}`);
