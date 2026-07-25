import 'server-only';
import { getWorkspaceContext } from '@/lib/services/workspace-context.service';
import * as analyticsService from '@/lib/services/analytics.service';

export async function getDashboardKpis() {
  const { snowflakeRole } = await getWorkspaceContext();
  return analyticsService.getDashboardKpis(snowflakeRole);
}

export async function getRevenueTrend(months = 6) {
  const { snowflakeRole } = await getWorkspaceContext();
  return analyticsService.getRevenueTrend(snowflakeRole, months);
}

export async function getRecentActivity(limit = 8) {
  const { snowflakeRole } = await getWorkspaceContext();
  return analyticsService.getRecentActivity(snowflakeRole, limit);
}

export async function getInventoryAlerts() {
  const { snowflakeRole } = await getWorkspaceContext();
  return analyticsService.getInventoryAlerts(snowflakeRole);
}
