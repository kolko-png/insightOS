# Deploying INSIGHTOS

## Setup order (this matters — later steps depend on earlier ones)

1. **Create the Snowflake account objects**, in order:
   `snowflake/ddl/01_analytics_schema.sql` → `02_provisioning.sql` →
   `04_cortex_privileges.sql` → `05_purchase_requests_and_future_grants.sql`.
   Run as a role with `ACCOUNTADMIN`-level privileges (role/warehouse/
   database creation, `MANAGE GRANTS`) — the app's own runtime role
   deliberately can't do this itself (Phase 4).
2. **Create the Supabase project**, then apply
   `supabase/migrations/*.sql` in numeric order (Supabase CLI:
   `supabase db push`, or paste into the SQL editor in order).
3. **Generate real Supabase types**: `npx supabase gen types typescript --project-id <ref> > src/types/supabase.ts`
   — replaces the `Database = any` placeholder from Phase 10 with
   real column-level types across every `.from('table')` call.
4. **Create the Snowflake key pair** for `SNOWFLAKE_APP_RUNTIME_USER`
   (used by both the SDK connection and, if `SNOWFLAKE_PAT` is unset,
   the Cortex REST JWT fallback) and/or generate a Programmatic
   Access Token in Snowsight for `SNOWFLAKE_PAT`.
5. **Set every variable in `.env.local.example`** in Vercel Project
   Settings → Environment Variables (Production, Preview, and
   Development as appropriate — `NEXT_PUBLIC_SITE_URL` in particular
   needs a different value per environment).
6. **Deploy to Vercel.** `vercel.json`'s cron entry registers
   automatically on deploy.
7. **Configure Supabase Storage**: the `documents` bucket and its RLS
   policies are created by `0003_documents_storage.sql` — no manual
   dashboard step needed if migrations ran in order.
8. **Configure Google OAuth** (Phase 4): add the deployed domain's
   callback URL (`https://<your-domain>/auth/callback`) to both
   Supabase Auth provider settings and the Google Cloud OAuth client's
   authorized redirect URIs.

## A real deployment constraint found in this phase

`vercel.json`'s cron schedule is `0 9 * * *` (once daily), not the
`*/15 * * * *` used in earlier phase write-ups. **Vercel's Hobby
(free) plan rejects any cron expression that would fire more than
once a day — the deployment fails outright, it doesn't silently
throttle.** If a workflow genuinely needs sub-daily threshold
checking:

- **Upgrade to Vercel Pro** ($20/mo/seat) for per-minute cron
  cadence, or
- **Keep Hobby and use an external scheduler** — `/api/cron/automation`
  is a normal HTTP route protected by `CRON_SECRET`; any scheduler
  (GitHub Actions on a `schedule:` trigger, cron-job.org, Upstash
  QStash) can `curl` it with `Authorization: Bearer $CRON_SECRET`
  on whatever cadence you need, entirely outside Vercel's limit.

## Pre-launch checklist — every "verify before production" flag, in one place

These were flagged as reasoned-through-but-unconfirmed at the time
each phase was written. Confirm each against your actual Snowflake
account before a live demo:

- [ ] **Cortex Inference REST endpoint** (`/api/v2/cortex/inference:complete`)
      — verified against docs in Phase 8; confirm the streaming SSE
      response still parses correctly against your account's actual
      response (`lib/snowflake/cortex.ts`).
- [ ] **`SNOWFLAKE_CORTEX_MODEL`** (`llama3.1-70b` default) — confirm
      it's enabled in your account's region via
      `SHOW MODELS IN SNOWFLAKE.CORTEX`; swap via env var if not.
- [ ] **`AI_PARSE_DOCUMENT`** (`lib/services/document-processing.service.ts`)
      — corrected in Phase 8 from the legacy `PARSE_DOCUMENT` syntax;
      confirm the `TO_FILE()` + `{'mode': 'LAYOUT'}` call succeeds
      against a real staged PDF.
- [ ] **`EMBED_TEXT_768` with `e5-base-v2`** — confirmed valid in
      Phase 8; run one real document through the ingest pipeline
      (Phase 7) and check `DOCUMENT_CHUNKS` populates with non-null
      `embedding` values.
- [ ] **`SNOWFLAKE.CORTEX_USER` grant** — the Phase 8 fix to
      `PROVISION_WORKSPACE`. If any workspace was created *before*
      applying `04_cortex_privileges.sql`, its role needs the grant
      backfilled (the script includes this, but confirm it actually
      ran).
- [ ] **`SNOWFLAKE_PAT` expiry** — PATs default to 15 days. Either
      set a longer expiry via an authentication policy at creation,
      or set a calendar reminder to rotate it before a scheduled
      demo.
- [ ] **`eslint-plugin-boundaries` config syntax** (`eslint.config.mjs`,
      Phase 11) — the `!${from.featureName}` negated-capture pattern
      should be confirmed against the installed plugin version; run
      `npm run lint` and check the boundary rule actually fires on a
      deliberate cross-feature import before trusting it silently.
- [ ] **Google OAuth redirect URIs** — must exactly match the
      deployed domain in both Supabase and Google Cloud Console; the
      single most common OAuth setup failure.

## Known scope gaps (not bugs — features not built in phases 1-11)

Worth stating plainly rather than discovering at demo time:

- **No full executive PDF report generator.** The original spec's
  "Reports" page (page #9 in the app structure) wasn't in the
  12-phase list actually executed — Analytics (Phase 9) shipped CSV
  export only.
- **No document deletion.** Upload, list, search, version, and
  download are complete; delete needs a small saga (Storage object +
  Supabase row + orphaned `DOCUMENT_CHUNKS` cleanup) similar in shape
  to the workspace-provisioning rollback from Phase 4.
- **No dedicated Tasks feature.** Automation's "create task" action
  writes a `type: 'task'` notification instead.
- **No drag-and-drop workflow canvas.** The automation builder
  (Phase 10) is a structured form, not a node-based visual editor.
- **No component/E2E test coverage.** Phase 11 covers pure logic
  only — see `TESTING.md` for the reasoning and what a Playwright
  layer would need to add.

## Post-deploy smoke test

A minimal path that exercises every major system end to end:

1. Register a new account (creates a workspace → provisions a
   Snowflake role — confirms Phases 3, 4, 8 together).
2. Upload a small PDF in Document Center (confirms Storage RLS,
   staging, `AI_PARSE_DOCUMENT`, chunking, embedding — Phase 7).
3. Ask the Copilot a data question ("show revenue this month") and a
   document question (something answerable from the uploaded PDF) —
   confirms NL→SQL + the safety validator, RAG retrieval, and
   streaming (Phases 6, 8).
4. Create a threshold-trigger automation workflow and use "Run now"
   (confirms the execution engine and notifications, without waiting
   for cron — Phase 10).
5. Check the Dashboard and Analytics pages render real numbers
   matching what was just seeded (Phases 5, 9).
