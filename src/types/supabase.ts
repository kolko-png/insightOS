/**
 * This file is normally generated, not hand-written:
 *
 *   npx supabase gen types typescript --project-id <ref> > src/types/supabase.ts
 *
 * (or --local against a running `supabase start` instance, pointed
 * at the migrations in supabase/migrations/). Every Supabase client
 * factory in this codebase (lib/supabase/client.ts, server.ts,
 * admin.ts) imports `Database` from here to get compile-time types
 * for every table, enum, and RPC used throughout — that typing is
 * what catches a typo'd column name at build time instead of a
 * runtime null.
 *
 * Falling back to `any` here rather than hand-authoring the full
 * generated shape — hand-maintaining a type that's supposed to be a
 * mechanical reflection of the live schema would drift the moment
 * anyone runs a migration without also updating this file by hand,
 * which defeats the point. Run the command above once the Supabase
 * project is provisioned (immediately after applying the
 * migrations in supabase/migrations/), commit the real output, and
 * every `.from('table_name')` call across the app gains full
 * column-level autocomplete and type-checking with no other code
 * changes required.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
