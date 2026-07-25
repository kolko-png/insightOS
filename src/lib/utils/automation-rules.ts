import type { Condition, ScheduleTriggerConfig } from '@/lib/validation/automation.schema';

/**
 * Extracted from automation-engine.service.ts on purpose: that file
 * is full of Supabase/Snowflake calls (createAdminClient,
 * queryAsWorkspace), so testing its condition/schedule logic would
 * otherwise mean mocking a database client just to check that
 * "greater_than" compares numbers correctly. Pulling the pure
 * decision logic out here — same pattern already used for
 * chunk-text.ts and forecast.ts — makes it unit-testable in
 * isolation and reusable if a future feature (e.g. a condition
 * preview in the workflow builder UI) needs the same evaluation
 * without touching a database at all.
 */

export function evaluateCondition(
  actual: unknown,
  operator: Condition['operator'],
  expected: unknown
): boolean {
  switch (operator) {
    case 'equals':
      return actual === expected;
    case 'not_equals':
      return actual !== expected;
    case 'greater_than':
      return Number(actual) > Number(expected);
    case 'less_than':
      return Number(actual) < Number(expected);
    case 'contains':
      return String(actual).includes(String(expected));
    default:
      return false;
  }
}

export function matchesSchedule(config: ScheduleTriggerConfig, now: Date): boolean {
  const hourMatches = now.getHours() === config.atHour;
  if (config.frequency === 'hourly') return true;
  if (config.frequency === 'daily') return hourMatches;
  if (config.frequency === 'weekly') {
    return hourMatches && (config.dayOfWeek === undefined || now.getDay() === config.dayOfWeek);
  }
  return false;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
