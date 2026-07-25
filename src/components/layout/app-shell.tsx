import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

type Membership = {
  workspace_id: string;
  workspace_role: string;
  business_role: string;
  workspaces: { name: string; slug: string } | null;
};

export function AppShell({
  user,
  membership,
  children,
}: {
  user: User;
  membership: Membership;
  children: ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar workspaceName={membership.workspaces?.name ?? 'InsightOS'} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar user={user} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
