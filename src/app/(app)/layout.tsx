import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/layout/app-shell';
import { oneToOne } from '@/lib/utils/supabase-embed';


export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id, workspace_role, business_role, workspaces(name, slug)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!membership || !membership.workspaces) {
    redirect('/register?resume=true');
  }

  const workspace = oneToOne(membership.workspaces);

  return (
    <AppShell user={user} membership={{ ...membership, workspaces: workspace }}>
      {children}
    </AppShell>
  );
}