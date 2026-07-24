import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";

/**
 * Whether Supabase is configured. The app falls back to the in-memory TSV
 * dataset when this is false (dev/sandbox without credentials). Flip on deploy
 * by setting the env vars below.
 */
export function supabaseEnabled(): boolean {
  return Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

/**
 * Untyped Supabase client. The `Database` type is kept in db/types.ts for
 * reference; row types are asserted at read boundaries. Using the loose client
 * keeps insert/update/rpc calls portable across supabase-js versions.
 */
export type DbClient = SupabaseClient;

/**
 * Service-role client for trusted contexts only (server components, API routes,
 * the Railway worker). Bypasses RLS — never expose the service role key to the
 * browser.
 */
let serviceClient: DbClient | null = null;

export function supabaseServer(): DbClient | null {
  if (!supabaseEnabled()) return null;
  if (!serviceClient) {
    serviceClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
  }
  return serviceClient;
}

let browserClient: DbClient | null = null;

/**
 * Browser (anon) client for user-authenticated flows. Uses the public anon key.
 */
export function supabaseBrowser(): DbClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  if (!browserClient) {
    browserClient = createClient(url, anon);
  }
  return browserClient;
}
