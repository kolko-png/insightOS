import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/auth/callback'];
const MARKETING_ROUTES = ['/', '/pricing'];

/**
 * Runs on every request (see middleware.ts). Two jobs:
 *  1. Refresh the Supabase session so Server Components always see
 *     a valid, non-expired token (Supabase access tokens are short-lived;
 *     without this, users would get silently logged out mid-session).
 *  2. Redirect unauthenticated requests away from protected routes,
 *     and authenticated users away from /login and /register.
 *
 * This does NOT do workspace-level authorization (which workspace,
 * which role) — only "is there a valid session." Workspace membership
 * checks happen in app/(app)/layout.tsx, closer to the data they gate.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: do not run logic between createServerClient and getUser().
  // getUser() is what actually revalidates the token against Supabase Auth;
  // reading the cookie alone is not sufficient (a stale/forged cookie would
  // pass a naive check).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublicRoute = PUBLIC_ROUTES.some((r) => path.startsWith(r));
  const isMarketingRoute = MARKETING_ROUTES.includes(path);

  if (!user && !isPublicRoute && !isMarketingRoute) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirectTo', path);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && (path === '/login' || path === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return supabaseResponse;
}