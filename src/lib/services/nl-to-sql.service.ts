import 'server-only';
import { cortexComplete } from '@/lib/snowflake/cortex';
import { validateGeneratedSql } from '@/lib/utils/sql-validation';

export { UnsafeSqlError, validateGeneratedSql } from '@/lib/utils/sql-validation';

const SCHEMA_CONTEXT = `
You write Snowflake SQL SELECT statements only, against these tables in the ANALYTICS schema.
Workspace scoping is handled automatically by the caller's session role via a row access policy —
NEVER filter by workspace_id or workspace_key yourself, and never reference those columns.

REVENUE(revenue_id, amount, currency, source, recorded_at)
EXPENSES(expense_id, amount, category, vendor, recorded_at)
ORDERS(order_id, customer_id, status, total_amount, ordered_at, fulfilled_at)
CUSTOMERS(customer_id, name, segment, lifetime_value)
SUPPLIERS(supplier_id, name, reliability_score, contact_email)
INVENTORY(sku, product_name, quantity_on_hand, reorder_threshold, supplier_id)
INVOICES(invoice_id, customer_id, amount, status, issued_at, due_at)

Rules:
- Output ONLY the SQL statement. No markdown fences, no explanation, no trailing semicolon.
- SELECT statements only — never INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, MERGE, COPY, GRANT, or CALL.
- Always include a LIMIT (max 500 rows) unless the query is a single scalar aggregate.
- Use only the tables and columns listed above. If the question can't be answered with them, output: UNANSWERABLE
`.trim();

/**
 * The LLM call itself. validateGeneratedSql() (imported above, and
 * re-exported for existing call sites) is where the actual safety
 * guarantee lives — see lib/utils/sql-validation.ts. This function
 * is the thin, `server-only` half: prompt construction and the
 * Cortex call, nothing that needs to run in a test.
 */
export async function generateSql(question: string): Promise<string> {
  const raw = await cortexComplete([
    { role: 'system', content: SCHEMA_CONTEXT },
    { role: 'user', content: question },
  ]);

  return validateGeneratedSql(raw);
}
