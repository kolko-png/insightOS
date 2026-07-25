import 'server-only';
import snowflake from 'snowflake-sdk';

let pool: snowflake.Pool<snowflake.Connection> | null = null;

/**
 * Connection pool authenticating as INSIGHTOS_APP_RUNTIME — the
 * narrowly-scoped role from 02_provisioning.sql. This role can
 * EXECUTE the provisioning procedures and read/write ANALYTICS +
 * AI tables (via the per-workspace roles it's granted), but holds
 * no account-level DDL privileges itself.
 *
 * Singleton pool: Snowflake connection setup is expensive (auth
 * handshake, warehouse resume), so we reuse connections across
 * requests rather than opening one per call.
 */
function getPool() {
  if (!pool) {
    pool = snowflake.createPool(
      {
        account: process.env.SNOWFLAKE_ACCOUNT!,
        username: process.env.SNOWFLAKE_APP_RUNTIME_USER!,
        // Key-pair auth, not password — see .env.local.example.
        // Rotatable without touching the account password, and
        // required for any credential Vercel stores as an env var.
        //
        // authenticator MUST be set to 'SNOWFLAKE_JWT' whenever
        // privateKeyPath is used. Confirmed against Snowflake's own
        // Node.js driver docs: leaving `authenticator` unset makes
        // the driver require `password` instead, which is exactly
        // the "A password must be specified" error this fixes.
        authenticator: 'SNOWFLAKE_JWT',
        privateKeyPath: process.env.SNOWFLAKE_PRIVATE_KEY_PATH!,
        role: 'INSIGHTOS_APP_RUNTIME',
        warehouse: 'INSIGHTOS_WH_INTERACTIVE',
        database: 'INSIGHTOS_DB',
        schema: 'SECURITY',
      },
      { max: 10, min: 0 }
    );
  }
  return pool;
}

async function execute<T = unknown>(sqlText: string, binds: unknown[] = []): Promise<T[]> {
  const p = getPool();
  return p.use(
    (connection) =>
      new Promise<T[]>((resolve, reject) => {
        connection.execute({
          sqlText,
          binds: binds as snowflake.Binds,
          complete: (err, _stmt, rows) => {
            if (err) return reject(err);
            resolve((rows ?? []) as T[]);
          },
        });
      })
  );
}

/**
 * Provisions a dedicated Snowflake role for a new workspace by
 * calling the owner's-rights stored procedure — the app never
 * runs CREATE ROLE directly. Returns the created role name, which
 * workspaces.service.ts stores alongside the Supabase workspace row.
 */
export async function provisionWorkspaceRole(workspaceKey: string): Promise<string> {
  const rows = await execute<{ PROVISION_WORKSPACE: string }>(
    'call INSIGHTOS_DB.SECURITY.PROVISION_WORKSPACE(?)',
    [workspaceKey]
  );
  // Explicit check, not just `rows[0]?.PROVISION_WORKSPACE ?? ''`:
  // an empty result here means the stored procedure call itself
  // succeeded but returned nothing, which should never happen and
  // is worth a clear error naming exactly that — a silent empty
  // string would surface much later as a confusing "role not
  // found" error somewhere else entirely.
  const row = rows[0];
  if (!row) {
    throw new Error(
      `PROVISION_WORKSPACE returned no rows for workspace key "${workspaceKey}" — the stored procedure call succeeded but produced no result.`
    );
  }
  return row.PROVISION_WORKSPACE;
}

/**
 * Compensating action for the workspace-creation saga: if the
 * Supabase insert succeeds but something downstream fails, or vice
 * versa, this tears down the Snowflake-side role so we don't leak
 * an orphaned role with no matching workspace.
 */
export async function deprovisionWorkspaceRole(workspaceKey: string): Promise<void> {
  await execute('call INSIGHTOS_DB.SECURITY.DEPROVISION_WORKSPACE(?)', [workspaceKey]);
}