import 'server-only';
import { getWorkspaceContext } from '@/lib/services/workspace-context.service';
import * as analyticsService from '@/lib/services/analytics.service';

export async function getTrend(months = 12) {
  const { snowflakeRole } = await getWorkspaceContext();
  return analyticsService.getRevenueTrend(snowflakeRole, months);
}

export async function getCategoryBreakdown() {
  const { snowflakeRole } = await getWorkspaceContext();
  return analyticsService.getCategoryBreakdown(snowflakeRole);
}
