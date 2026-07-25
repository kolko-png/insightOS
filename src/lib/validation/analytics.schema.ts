import { z } from 'zod';

export const kpiSummarySchema = z.object({
  revenue: z.number(),
  priorRevenue: z.number(),
  expenses: z.number(),
  profit: z.number(),
  growthPercent: z.number(),
  orders: z.number(),
  customers: z.number(),
});
export type KpiSummary = z.infer<typeof kpiSummarySchema>;

export const revenueTrendPointSchema = z.object({
  month: z.string(), // 'YYYY-MM'
  revenue: z.number(),
  expenses: z.number(),
});
export type RevenueTrendPoint = z.infer<typeof revenueTrendPointSchema>;

export const activityItemSchema = z.object({
  id: z.string(),
  type: z.enum(['order', 'invoice']),
  description: z.string(),
  amount: z.number().nullable(),
  status: z.string().nullable(),
  occurredAt: z.string(),
});
export type ActivityItem = z.infer<typeof activityItemSchema>;

export const inventoryAlertSchema = z.object({
  sku: z.string(),
  productName: z.string(),
  quantityOnHand: z.number(),
  reorderThreshold: z.number(),
});
export type InventoryAlert = z.infer<typeof inventoryAlertSchema>;

export const categoryAmountSchema = z.object({ label: z.string(), amount: z.number() });
export const categoryBreakdownSchema = z.object({
  revenueBySource: z.array(categoryAmountSchema),
  expensesByCategory: z.array(categoryAmountSchema),
});
export type CategoryBreakdown = z.infer<typeof categoryBreakdownSchema>;
