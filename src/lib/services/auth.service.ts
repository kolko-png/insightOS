import 'server-only';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createWorkspace } from '@/lib/services/workspaces.service';
import type { LoginInput, RegisterInput, ForgotPasswordInput } from '@/lib/validation/auth.schema';

export async function signIn(input: LoginInput) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(input);
  if (error) throw error;
  return data;
}

/**
 * Registration branches on whether Supabase actually returned an
 * active session, not just whether it returned a user object.
 *
 * If "Confirm email" is enabled in the Supabase project (the
 * default), signUp() returns a user but session: null — there is
 * no valid authenticated context yet, so creating the workspace
 * here would either use a session that doesn't exist or silently
 * do nothing useful. The original version of this function ignored
 * that distinction and unconditionally created the workspace, which
 * only worked when email confirmation happened to be disabled.
 *
 * workspaceName and businessRole are stashed in the auth user's
 * metadata specifically so /auth/callback/route.ts can read them
 * back and finish workspace creation once the user actually
 * confirms their email and a real session exists.
 */
export async function registerUser(
  input: RegisterInput
): Promise<
  | { status: 'confirmed'; user: User; workspace: Awaited<ReturnType<typeof createWorkspace>> }
  | { status: 'pending_confirmation' }
> {
  const supabase = await createClient();

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        full_name: input.fullName,
        // Read back in the callback route once email is confirmed.
        pending_workspace_name: input.workspaceName,
        pending_business_role: input.businessRole,
      },
    },
  });
  if (authError) throw authError;
  if (!authData.user) throw new Error('Sign-up did not return a user');

  if (!authData.session) {
    // Email confirmation required (or — Supabase's anti-enumeration
    // behavior for an email that's already registered — either way,
    // there is no active session to safely act on here).
    return { status: 'pending_confirmation' };
  }

  const workspace = await createWorkspace({
    name: input.workspaceName,
    ownerUserId: authData.user.id,
    ownerBusinessRole: input.businessRole,
  });

  return { status: 'confirmed', user: authData.user, workspace };
}

export async function signInWithGoogle(redirectTo: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?redirectTo=${redirectTo}`,
    },
  });
  if (error) throw error;
  return data;
}

export async function requestPasswordReset(input: ForgotPasswordInput) {
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(input.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?type=recovery`,
  });
  if (error) throw error;
}

export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
