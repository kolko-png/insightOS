import type { z } from 'zod';

/**
 * With `noUncheckedIndexedAccess` (tsconfig.json, Phase 11),
 * `error.issues[0]` types as `ZodIssue | undefined` even though Zod
 * guarantees at least one issue on a failed parse — the compiler
 * only sees the array type, not that guarantee. Centralized here
 * once every route/action needing the first validation message hit
 * the same compile error independently (Phase 12 bugfix round).
 */
export function firstIssueMessage(error: z.ZodError, fallback = 'Invalid input'): string {
  return error.issues[0]?.message ?? fallback;
}
