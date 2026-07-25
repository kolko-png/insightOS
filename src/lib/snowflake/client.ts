import 'server-only';
import snowflake from 'snowflake-sdk';
import { assertValidWorkspaceRole } from './roles';

let pool: snowflake.Pool<snowflake.Connection> | null = null;

/**
 * Separate pool from lib/snowflake/admin.ts on purpose: this one is
 * for high-frequency, low-latency dashboard/chat reads against
 * INSIGHTOS_WH_INTERACTIVE, sized for concurrency (min: 2 keeps a
 * couple of connections warm so the warehouse doesn't suspend
 * between requests during active use). admin.ts's pool is for rare
 * provisioning calls and doesn't need warm connections.
 */
function getPool() {
  if (!pool) {
    pool = snowflake.createPool(
      {
        account: process.env.SNOWFLAKE_ACCOUNT!,
        username: process.env.SNOWFLAKE_APP_RUNTIME_USER!,
        // See lib/snowflake/admin.ts for why this is required
        // whenever privateKeyPath is used — without it, the driver
        // defaults to requiring `password` instead.
        authenticator: 'SNOWFLAKE_JWT',
        privateKeyPath: process.env.SNOWFLAKE_PRIVATE_KEY_PATH!,
        role: 'INSIGHTOS_APP_RUNTIME',
        warehouse: 'INSIGHTOS_WH_INTERACTIVE',
        database: 'INSIGHTOS_DB',
        schema: 'ANALYTICS',
      },
      { max: 20, min: 2 }
    );
  }
  return pool;
}

function run<T>(
  connection: snowflake.Connection,
  sqlText: string,
  binds: unknown[] = []
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText,
      binds: binds as snowflake.Binds,
      complete: (err, _stmt, rows) => (err ? reject(err) : resolve((rows ?? []) as T[])),
    });
  });
}

/**
 * Every business-data read MUST go through this function — nothing
 * else in the codebase should call the Snowflake SDK directly for
 * ANALYTICS/AI data. It sets the session's active role to the
 * caller's workspace-specific role (granted in 02_provisioning.sql)
 * before running the query; that role switch is what the
 * WORKSPACE_ISOLATION row access policy actually checks via
 * CURRENT_ROLE(). Skipping this wrapper — e.g. querying with a bare
 * connection still on INSIGHTOS_APP_RUNTIME — would either error
 * (no grants on the base tables for that role) or, if grants were
 * ever loosened, silently return cross-tenant rows. Treat this as
 * the security boundary it is, not a convenience wrapper.
 *
 * `USE ROLE` can't be parameterized (Snowflake doesn't support
 * bind variables for identifiers), so workspaceRole is validated
 * against a strict pattern before being interpolated — it must
 * always be derived server-side from the authenticated user's
 * workspace membership (see features/dashboard/server/context.ts),
 * never taken from client input.
 */
export async function queryAsWorkspace<T = Record<string, unknown>>(
  workspaceRole: string,
  sqlText: string,
  binds: unknown[] = []
): Promise<T[]> {
  assertValidWorkspaceRole(workspaceRole);
  const p = getPool();

  return p.use(async (connection) => {
    await run(connection, `use role ${workspaceRole}`);
    return run<T>(connection, sqlText, binds);
  });
}