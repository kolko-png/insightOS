/**
 * Mirrors the role-naming logic in snowflake/ddl/02_provisioning.sql
 * (`'WORKSPACE_' || upper(workspace_key) || '_ROLE'`). Kept in one
 * place because if these two ever drift, every workspace-scoped
 * query silently fails to find its role and either errors or —
 * worse — the row access policy simply returns zero rows and looks
 * like an empty-state bug instead of a naming bug.
 */
export function workspaceRoleName(workspaceKey: string): string {
  return `WORKSPACE_${workspaceKey.toUpperCase()}_ROLE`;
}

/** Guards against building a `USE ROLE <string>` statement from anything unexpected. */
export function assertValidWorkspaceRole(role: string): void {
  if (!/^WORKSPACE_[A-Z0-9_]+_ROLE$/.test(role)) {
    throw new Error(`Refusing to query Snowflake with unexpected role name: ${role}`);
  }
}
