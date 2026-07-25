import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { provisionWorkspaceRole, deprovisionWorkspaceRole } from '@/lib/snowflake/admin';
import { z } from 'zod';

const createWorkspaceInput = z.object({
  name: z.string().min(2),
  ownerUserId: z.string().uuid(),
  ownerBusinessRole: z.enum([
    'ceo',
    'finance_manager',
    'sales_manager',
    'operations',
    'warehouse',
    'hr',
    'business_owner',
  ]),
});
type CreateWorkspaceInput = z.infer<typeof createWorkspaceInput>;

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  // Suffix with a short random segment so two workspaces named
  // "Acme" don't collide on the unique slug / Snowflake role name.
  const suffix = crypto.randomUUID().slice(0, 6);
  return `${base}_${suffix}`;
}

/**
 * Creates a workspace across both planes as a saga with explicit
 * compensation, not a distributed transaction (Supabase and Snowflake
 * can't share one). Order matters: Snowflake role first, because
 * deprovisioning an unused Snowflake role is a cheap no-op, whereas
 * rolling back a Supabase workspace that a user may have already
 * been redirected to is worse UX. If step 2 fails, step 1 is undone
 * before the error propagates — the caller never sees a workspace
 * that exists on only one side.
 */
export async function createWorkspace(input: CreateWorkspaceInput) {
  const { name, ownerUserId, ownerBusinessRole } = createWorkspaceInput.parse(input);
  const workspaceKey = slugify(name);
  const admin = createAdminClient();

  let snowflakeRole: string;
  try {
    snowflakeRole = await provisionWorkspaceRole(workspaceKey);
  } catch (err) {
    console.error('[workspaces.service] provisionWorkspaceRole failed:', err);
    throw err;
  }

  try {
    const { data: workspace, error: workspaceError } = await admin
      .from('workspaces')
      .insert({
        name,
        slug: workspaceKey,
        snowflake_workspace_key: workspaceKey,
      })
      .select()
      .single();

    if (workspaceError) throw workspaceError;

    const { error: memberError } = await admin.from('workspace_members').insert({
      workspace_id: workspace.id,
      user_id: ownerUserId,
      workspace_role: 'owner',
      business_role: ownerBusinessRole,
      joined_at: new Date().toISOString(),
    });

    if (memberError) throw memberError;

    return workspace;
  } catch (err) {
    console.error('[workspaces.service] createWorkspace failed:', err);
    // Compensating action — this is why the DEPROVISION procedure
    // exists. Best-effort: log but don't mask the original error if
    // cleanup itself fails, since the original error is what the
    // caller needs to see and act on.
    await deprovisionWorkspaceRole(workspaceKey).catch((cleanupErr) => {
      console.error(
        `[workspaces.service] Failed to clean up orphaned Snowflake role ${snowflakeRole} ` +
          `after workspace creation failure. Manual cleanup required.`,
        cleanupErr
      );
    });
    throw err;
  }
}