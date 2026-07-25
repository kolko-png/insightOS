export const ALLOWED_TABLES = [
  'REVENUE',
  'EXPENSES',
  'ORDERS',
  'CUSTOMERS',
  'SUPPLIERS',
  'INVENTORY',
  'INVOICES',
];

const FORBIDDEN_PATTERN =
  /\b(insert|update|delete|drop|alter|create|merge|copy|grant|revoke|call|truncate|execute|use)\b/i;

export class UnsafeSqlError extends Error {}

/**
 * The actual security boundary for NL->SQL (see
 * nl-to-sql.service.ts for the full rationale). Extracted to this
 * plain-utils file — no `server-only`, no Cortex import — for two
 * reasons: it makes the single most safety-critical function in the
 * codebase unit-testable without mocking an LLM call, and it means
 * a `server-only` import somewhere upstream can never accidentally
 * make this validator untestable again.
 */
export function validateGeneratedSql(sql: string): string {
  const trimmed = sql.trim().replace(/;+\s*$/, '');

  if (/^unanswerable$/i.test(trimmed)) {
    throw new UnsafeSqlError('The question cannot be answered from the available business data.');
  }
  if (!/^(select|with)\b/i.test(trimmed)) {
    throw new UnsafeSqlError('Generated statement must start with SELECT or WITH.');
  }
  if (trimmed.includes(';')) {
    throw new UnsafeSqlError('Multiple statements are not allowed.');
  }
  if (FORBIDDEN_PATTERN.test(trimmed)) {
    throw new UnsafeSqlError('Generated statement contains a disallowed keyword.');
  }

  const referencedTables = ALLOWED_TABLES.filter((t) =>
    new RegExp(`\\b${t}\\b`, 'i').test(trimmed)
  );
  if (referencedTables.length === 0) {
    throw new UnsafeSqlError('Generated statement does not reference an allowed table.');
  }

  const hasLimit = /\blimit\s+\d+/i.test(trimmed);
  const isSingleAggregate =
    /^select\s+(count|sum|avg|min|max)\(/i.test(trimmed) && !/group\s+by/i.test(trimmed);

  return hasLimit || isSingleAggregate ? trimmed : `${trimmed} limit 500`;
}
