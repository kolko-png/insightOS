import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

/**
 * Service-role client. Bypasses RLS entirely.
 *
 * Deliberately isolated in its own file (see Phase 2 rationale):
 * this is the ONE place in the codebase where an elevated Supabase
 * key can be imported. The `server-only` import throws a build-time
 * error if anything under app/(app)/** or a Client Component ever
 * imports this file, so a leak of the service-role key into the
 * client bundle is a build failure, not a runtime surprise.
 *
 * Use only for:
 *  - operations that must cross workspace boundaries (e.g. platform
 *    admin tooling, webhooks writing audit_log on behalf of the system)
 *  - the workspace-provisioning transaction in workspaces.service.ts,
 *    where the row must be created before the creating user has a
 *    workspace_members row to satisfy the normal RLS policy
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
