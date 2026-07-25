import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createWorkspace } from '@/lib/services/workspaces.service';


export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const redirectTo = searchParams.get('redirectTo') ?? '/dashboard';
  const type = searchParams.get('type');

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/settings/security?action=reset-password`);
      }


      const admin = createAdminClient();
      const { data: existingMembership } = await admin
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', data.user.id)
        .limit(1)
        .maybeSingle();

      if (!existingMembership) {
        const pendingWorkspaceName = data.user.user_metadata?.pending_workspace_name;
        const pendingBusinessRole = data.user.user_metadata?.pending_business_role;

        if (pendingWorkspaceName && pendingBusinessRole) {
          try {
            await createWorkspace({
              name: pendingWorkspaceName,
              ownerUserId: data.user.id,
              ownerBusinessRole: pendingBusinessRole,
            });
          } catch (err) {
            console.error('[auth/callback] deferred workspace creation failed:', err);
            return NextResponse.redirect(
              `${origin}/login?error=workspace_setup_failed`
            );
          }
        } else {
          const defaultName = data.user.user_metadata?.full_name
            ? `${data.user.user_metadata.full_name}'s Workspace`
            : 'My Workspace';
          try {
            await createWorkspace({
              name: defaultName,
              ownerUserId: data.user.id,
              ownerBusinessRole: 'business_owner',
            });
          } catch (err) {
            console.error('[auth/callback] default workspace creation failed:', err);
            return NextResponse.redirect(
              `${origin}/login?error=workspace_setup_failed`
            );
          }
        }
      }

      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
