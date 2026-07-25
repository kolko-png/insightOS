import 'server-only';
import { queryAsWorkspace } from '@/lib/snowflake/client';
import {
  kpiSummarySchema,
  revenueTrendPointSchema,
  activityItemSchema,
  inventoryAlertSchema,
  categoryBreakdownSchema,
  type KpiSummary,
  type RevenueTrendPoint,
  type ActivityItem,
  type InventoryAlert,
  type CategoryBreakdown,
} from '@/lib/validation/analytics.schema';

/**
 * One query with CTEs instead of five round trips. Each round trip
 * to a Snowflake warehouse carries real latency (network + query
 * compile), so for a dashboard that needs several aggregates at
 * once, batching into a single statement matters more here than it
 * would against a low-latency OLTP database.
 */
export async function getDashboardKpis(workspaceRole: string): Promise<KpiSummary> {
  const rows = await queryAsWorkspace<{
    REVENUE: number;
    PRIOR_REVENUE: number;
    EXPENSES: number;
    ORDERS: number;
    CUSTOMERS: number;
  }>(
    workspaceRole,
    `
    with current_period as (
      select coalesce(sum(amount), 0) as revenue
      from REVENUE
      where recorded_at >= date_trunc('month', current_date())
    ),
    prior_period as (
      select coalesce(sum(amount), 0) as revenue
      from REVENUE
      where recorded_at >= dateadd(month, -1, date_trunc('month', current_date()))
        and recorded_at < date_trunc('month', current_date())
    ),
    expenses_current as (
      select coalesce(sum(amount), 0) as expenses
      from EXPENSES
      where recorded_at >= date_trunc('month', current_date())
    ),
    orders_current as (
      select count(*) as orders
      from ORDERS
      where ordered_at >= date_trunc('month', current_date())
    ),
    customers_total as (
      select count(*) as customers from CUSTOMERS
    )
    select
      cp.revenue as REVENUE,
      pp.revenue as PRIOR_REVENUE,
      ec.expenses as EXPENSES,
      oc.orders as ORDERS,
      ct.customers as CUSTOMERS
    from current_period cp, prior_period pp, expenses_current ec, orders_current oc, customers_total ct
    `
  );

  const r = rows[0];
  const revenue = r?.REVENUE ?? 0;
  const priorRevenue = r?.PRIOR_REVENUE ?? 0;
  const expenses = r?.EXPENSES ?? 0;
  const growthPercent = priorRevenue === 0 ? 0 : ((revenue - priorRevenue) / priorRevenue) * 100;

  return kpiSummarySchema.parse({
    revenue,
    priorRevenue,
    expenses,
    profit: revenue - expenses,
    growthPercent,
    orders: r?.ORDERS ?? 0,
    customers: r?.CUSTOMERS ?? 0,
  });
}

export async function getRevenueTrend(
  workspaceRole: string,
  months = 6
): Promise<RevenueTrendPoint[]> {
  const rows = await queryAsWorkspace<{ MONTH: string; REVENUE: number; EXPENSES: number }>(
    workspaceRole,
    `
    with months as (
      select date_trunc('month', dateadd(month, -seq4(), current_date())) as month_start
      from table(generator(rowcount => ?))
    ),
    rev as (
      select date_trunc('month', recorded_at) as month_start, sum(amount) as revenue
      from REVENUE group by 1
    ),
    exp as (
      select date_trunc('month', recorded_at) as month_start, sum(amount) as expenses
      from EXPENSES group by 1
    )
    select
      to_varchar(m.month_start, 'YYYY-MM') as MONTH,
      coalesce(r.revenue, 0) as REVENUE,
      coalesce(e.expenses, 0) as EXPENSES
    from months m
    left join rev r on r.month_start = m.month_start
    left join exp e on e.month_start = m.month_start
    order by m.month_start asc
    `,
    [months]
  );

  return rows.map((r) =>
    revenueTrendPointSchema.parse({ month: r.MONTH, revenue: r.REVENUE, expenses: r.EXPENSES })
  );
}

export async function getRecentActivity(
  workspaceRole: string,
  limit = 8
): Promise<ActivityItem[]> {
  const rows = await queryAsWorkspace<{
    ID: string;
    TYPE: string;
    DESCRIPTION: string;
    AMOUNT: number | null;
    STATUS: string | null;
    OCCURRED_AT: string;
  }>(
    workspaceRole,
    `
    select * from (
      select
        order_id as ID, 'order' as TYPE,
        'Order ' || order_id as DESCRIPTION,
        total_amount as AMOUNT, status as STATUS,
        ordered_at as OCCURRED_AT
      from ORDERS
      union all
      select
        invoice_id as ID, 'invoice' as TYPE,
        'Invoice ' || invoice_id as DESCRIPTION,
        amount as AMOUNT, status as STATUS,
        issued_at::timestamp_ntz as OCCURRED_AT
      from INVOICES
    )
    order by OCCURRED_AT desc
    limit ?
    `,
    [limit]
  );

  return rows.map((r) =>
    activityItemSchema.parse({
      id: r.ID,
      type: r.TYPE,
      description: r.DESCRIPTION,
      amount: r.AMOUNT,
      status: r.STATUS,
      occurredAt: r.OCCURRED_AT,
    })
  );
}

export async function getInventoryAlerts(workspaceRole: string): Promise<InventoryAlert[]> {
  const rows = await queryAsWorkspace<{
    SKU: string;
    PRODUCT_NAME: string;
    QUANTITY_ON_HAND: number;
    REORDER_THRESHOLD: number;
  }>(
    workspaceRole,
    `
    select sku as SKU, product_name as PRODUCT_NAME,
           quantity_on_hand as QUANTITY_ON_HAND, reorder_threshold as REORDER_THRESHOLD
    from INVENTORY
    where quantity_on_hand < reorder_threshold
    order by (reorder_threshold - quantity_on_hand) desc
    limit 10
    `
  );

  return rows.map((r) =>
    inventoryAlertSchema.parse({
      sku: r.SKU,
      productName: r.PRODUCT_NAME,
      quantityOnHand: r.QUANTITY_ON_HAND,
      reorderThreshold: r.REORDER_THRESHOLD,
    })
  );
}

/**
 * Six-month window rather than an "all time" aggregate — category
 * mix drifts (a supplier gets swapped, a product line launches), and
 * an all-time view would bury that under years of historical noise.
 * Limited to the top 8 categories per side; a long tail of one-off
 * categories isn't useful on a pie/bar chart and would just crowd
 * the legend.
 */
export async function getCategoryBreakdown(workspaceRole: string): Promise<CategoryBreakdown> {
  const revenueRows = await queryAsWorkspace<{ SOURCE: string; AMOUNT: number }>(
    workspaceRole,
    `
    select coalesce(source, 'Other') as SOURCE, sum(amount) as AMOUNT
    from REVENUE
    where recorded_at >= dateadd(month, -6, current_date())
    group by 1
    order by 2 desc
    limit 8
    `
  );

  const expenseRows = await queryAsWorkspace<{ CATEGORY: string; AMOUNT: number }>(
    workspaceRole,
    `
    select coalesce(category, 'Other') as CATEGORY, sum(amount) as AMOUNT
    from EXPENSES
    where recorded_at >= dateadd(month, -6, current_date())
    group by 1
    order by 2 desc
    limit 8
    `
  );

  return categoryBreakdownSchema.parse({
    revenueBySource: revenueRows.map((r) => ({ label: r.SOURCE, amount: r.AMOUNT })),
    expensesByCategory: expenseRows.map((r) => ({ label: r.CATEGORY, amount: r.AMOUNT })),
  });
}
