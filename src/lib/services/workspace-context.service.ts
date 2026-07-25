import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { workspaceRoleName } from '@/lib/snowflake/roles';
function oneToOne<T>(val: T | T[] | null | undefined): T | null {
  if (Array.isArray(val)) return val.length ? (val[0] ?? null) : null;
  if (val === undefined || val === null) return null;
  return val as T;
}

export type WorkspaceContext = {
  workspaceId: string;
  workspaceKey: string;
  snowflakeRole: string;
  userId: string;
};

/**
 * Lives outside features/dashboard on purpose (moved here rather
 * than duplicated per-feature) — analytics, documents, automation,
 * and reports all need "which workspace is this user in, and what's
 * their Snowflake role," so this is exactly the kind of logic that
 * belongs in lib/services per the Phase 2 rule: shared by 3+ feature
 * folders means it's not feature-local anymore.
 */
export async function getWorkspaceContext(): Promise<WorkspaceContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id, workspaces(snowflake_workspace_key)')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership?.workspaces) {
    throw new Error('No workspace found for authenticated user');
  }

  const workspace = oneToOne(membership.workspaces);
  const workspaceKey = workspace?.snowflake_workspace_key;

  if (!workspaceKey) {
    throw new Error('No snowflake workspace key found');
  }

  return {
    workspaceId: membership.workspace_id,
    workspaceKey,
    snowflakeRole: workspaceRoleName(workspaceKey),
    userId: user.id,
  };
}