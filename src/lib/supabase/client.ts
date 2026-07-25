import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

/**
 * Browser client — safe to import in Client Components.
 * Uses the anon key; every query is still subject to RLS,
 * so this client can never see data outside the caller's
 * workspace membership regardless of what the client code asks for.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
