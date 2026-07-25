import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

/**
 * Server client — for Server Components, Route Handlers, and Server Actions.
 * Reads the session from cookies set by middleware. Still anon-key + RLS,
 * NOT the elevated client (see admin.ts) — this is the client 95% of
 * server-side code should use.
 *
 * NOTE: in a Server Component, cookies() is read-only — calls to
 * setAll() will throw unless invoked from a Route Handler or Server
 * Action. We swallow that specific case because middleware already
 * refreshes the session on every request; a Server Component doesn't
 * need to be able to write cookies, only read the already-refreshed ones.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component render — expected and safe
            // to ignore because middleware handles session refresh.
          }
        },
      },
    }
  );
}