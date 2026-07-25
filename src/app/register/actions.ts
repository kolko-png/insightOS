'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { registerUser } from '@/lib/services/auth.service';
import { createWorkspace } from '@/lib/services/workspaces.service';
import { registerSchema } from '@/lib/validation/auth.schema';

export async function register(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | never> {
  const parsed = registerSchema.safeParse({
    fullName: formData.get('fullName'),
    workspaceName: formData.get('workspaceName'),
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
    businessRole: formData.get('businessRole'),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid input';
    return { error: message };
  }

  try {
    const result = await registerUser(parsed.data);

    if (result.status === 'pending_confirmation') {
      redirect('/login?message=check_email');
    }

    redirect('/dashboard');
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Registration failed. Please try again.';
    return { error: message };
  }
}

export async function resumeRegistration(): Promise<
  { error: string } | never
> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: existingMembership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (existingMembership) {
    redirect('/dashboard');
  }

  const workspaceName =
    user.user_metadata?.pending_workspace_name ??
    (user.user_metadata?.full_name
      ? `${user.user_metadata.full_name}'s Workspace`
      : 'My Workspace');
  const businessRole = user.user_metadata?.pending_business_role ?? 'business_owner';

  try {
    await createWorkspace({
      name: workspaceName,
      ownerUserId: user.id,
      ownerBusinessRole: businessRole as
        | 'ceo'
        | 'finance_manager'
        | 'sales_manager'
        | 'operations'
        | 'warehouse'
        | 'hr'
        | 'business_owner',
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Workspace setup failed. Please try again.';
    return { error: message };
  }

  redirect('/dashboard');
}
