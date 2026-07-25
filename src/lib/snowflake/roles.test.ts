import { describe, it, expect } from 'vitest';
import { workspaceRoleName, assertValidWorkspaceRole } from './roles';

describe('workspaceRoleName', () => {
  it('uppercases the workspace key and wraps it in the role naming convention', () => {
    expect(workspaceRoleName('acme_a1b2c3')).toBe('WORKSPACE_ACME_A1B2C3_ROLE');
  });

  it('matches the naming logic in snowflake/ddl/02_provisioning.sql exactly', () => {
    // Mirrors: 'WORKSPACE_' || upper(workspace_key) || '_ROLE'
    const key = 'my_workspace_key';
    expect(workspaceRoleName(key)).toBe(`WORKSPACE_${key.toUpperCase()}_ROLE`);
  });
});

describe('assertValidWorkspaceRole', () => {
  it('accepts a correctly-formed role name', () => {
    expect(() => assertValidWorkspaceRole('WORKSPACE_ACME_A1B2C3_ROLE')).not.toThrow();
  });

  it('rejects anything that is not the expected shape — this is a query-injection guard, not cosmetic', () => {
    expect(() => assertValidWorkspaceRole('INSIGHTOS_APP_RUNTIME')).toThrow();
    expect(() => assertValidWorkspaceRole('WORKSPACE_ACME_ROLE; DROP TABLE X')).toThrow();
    expect(() => assertValidWorkspaceRole('workspace_acme_role')).toThrow(); // lowercase
    expect(() => assertValidWorkspaceRole('')).toThrow();
  });
});
