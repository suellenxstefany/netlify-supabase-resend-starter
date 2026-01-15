// Frontend Supabase client (no build step).
// IMPORTANT: Never expose your Supabase service role key in the browser.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

const SUPABASE_URL = window.__ENV?.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.__ENV?.SUPABASE_ANON_KEY;

export function getSupabaseClient() {
  const isPlaceholder = !SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes("YOUR_") || SUPABASE_ANON_KEY.includes("YOUR_");
  if (isPlaceholder) return null;

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export const supabase = getSupabaseClient();
