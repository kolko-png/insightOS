import { describe, it, expect } from 'vitest';
import { evaluateCondition, matchesSchedule, startOfDay } from './automation-rules';

describe('evaluateCondition', () => {
  it('equals compares strictly', () => {
    expect(evaluateCondition('draft', 'equals', 'draft')).toBe(true);
    expect(evaluateCondition('draft', 'equals', 'sent')).toBe(false);
  });

  it('not_equals inverts equals', () => {
    expect(evaluateCondition('draft', 'not_equals', 'sent')).toBe(true);
    expect(evaluateCondition('draft', 'not_equals', 'draft')).toBe(false);
  });

  it('greater_than and less_than coerce to numbers', () => {
    expect(evaluateCondition('100', 'greater_than', 50)).toBe(true);
    expect(evaluateCondition(50, 'less_than', '100')).toBe(true);
    expect(evaluateCondition(50, 'greater_than', 100)).toBe(false);
  });

  it('contains does a substring check on stringified values', () => {
    expect(evaluateCondition('document_processed', 'contains', 'processed')).toBe(true);
    expect(evaluateCondition('document_processed', 'contains', 'failed')).toBe(false);
  });

  it('returns false for an unrecognized operator rather than throwing', () => {
    // @ts-expect-error deliberately invalid operator to test the fallback
    expect(evaluateCondition(1, 'unknown_operator', 1)).toBe(false);
  });
});

describe('matchesSchedule', () => {
  it('hourly always matches regardless of the hour', () => {
    expect(matchesSchedule({ frequency: 'hourly', atHour: 9 }, new Date(2026, 0, 1, 3))).toBe(true);
  });

  it('daily only matches at the configured hour', () => {
    const config = { frequency: 'daily' as const, atHour: 9 };
    expect(matchesSchedule(config, new Date(2026, 0, 1, 9, 30))).toBe(true);
    expect(matchesSchedule(config, new Date(2026, 0, 1, 10, 0))).toBe(false);
  });

  it('weekly matches only the configured day and hour', () => {
    // 2026-01-05 is a Monday (dayOfWeek 1)
    const config = { frequency: 'weekly' as const, atHour: 9, dayOfWeek: 1 };
    expect(matchesSchedule(config, new Date(2026, 0, 5, 9))).toBe(true);
    expect(matchesSchedule(config, new Date(2026, 0, 6, 9))).toBe(false); // Tuesday
    expect(matchesSchedule(config, new Date(2026, 0, 5, 10))).toBe(false); // wrong hour
  });

  it('weekly with no dayOfWeek specified matches any day at the right hour', () => {
    const config = { frequency: 'weekly' as const, atHour: 9 };
    expect(matchesSchedule(config, new Date(2026, 0, 5, 9))).toBe(true);
    expect(matchesSchedule(config, new Date(2026, 0, 6, 9))).toBe(true);
  });
});

describe('startOfDay', () => {
  it('zeroes out the time component', () => {
    const result = startOfDay(new Date(2026, 5, 15, 14, 32, 9));
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getDate()).toBe(15);
  });
});
