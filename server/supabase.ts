import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  // Keep test/dev server import-safe; request handlers enforce configuration
  // before executing admin/subscription Supabase operations.
  console.warn("Supabase not configured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

export const supabase = createClient(
  supabaseUrl || "http://127.0.0.1:54321",
  supabaseServiceRoleKey || "missing-service-role-key",
);

export function assertSupabaseConfigured() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
}
