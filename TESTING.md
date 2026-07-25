# Testing strategy

## What's covered

Unit tests target pure, side-effect-free logic — the pieces where a
wrong answer would be a silent correctness or security bug, not
something a manual click-through would obviously catch:

- **`lib/utils/sql-validation.ts`** — the actual security boundary
  for NL→SQL (Phase 6/8). Every forbidden-keyword path, the
  single-statement guard, the table allowlist, and the auto-LIMIT
  behavior are covered. This is the single highest-value test file
  in the project: it's the one thing standing between an LLM output
  and a live Snowflake connection.
- **`lib/utils/chunk-text.ts`** — the document-ingestion text
  splitter (Phase 7). Covers boundary preference, index sequencing,
  line-ending normalization, and the hard-cut fallback.
- **`lib/utils/forecast.ts`** — the deterministic revenue forecast
  (Phase 9). Covers trend direction, the zero floor, month-label
  rollover across a year boundary, and the confidence-band ordering.
- **`lib/utils/automation-rules.ts`** — condition evaluation and
  schedule matching (Phase 10), extracted specifically to make this
  testable without mocking Supabase/Snowflake.
- **`lib/snowflake/roles.ts`** — the role-naming convention that
  must stay byte-for-byte in sync with the Snowflake stored
  procedure (Phase 3/4), plus the injection guard on `USE ROLE`.

Each of these files was moved or kept free of `import 'server-only'`
and any Supabase/Snowflake client construction specifically so it
*can* be unit tested — see the extraction rationale comments in
`nl-to-sql.service.ts` and `automation-engine.service.ts`.

## What's deliberately not covered here

- **Component/UI tests.** No React Testing Library coverage of chat
  streaming, the workflow builder, or chart rendering. These are
  better suited to integration/E2E tools (Playwright) that can
  exercise real streaming responses and real user interactions,
  rather than heavily-mocked unit tests that mostly test the mocks.
- **API route integration tests.** Route handlers are thin adapters
  by design (Phase 2 rule) — the logic worth testing already lives
  in the service/utils layer above. Testing the routes themselves
  would mean standing up a Next.js test server or mocking `NextRequest`
  in ways that mostly verify plumbing, not behavior.
- **Live external API contracts.** Nothing here can verify that
  Snowflake's Cortex REST endpoints, `AI_PARSE_DOCUMENT`, or
  `EMBED_TEXT_768` behave the way Phase 8's research says they do —
  that only gets confirmed by running against a real Snowflake
  account. This is exactly the gap the "VERIFY BEFORE PRODUCTION"
  comments scattered through `lib/snowflake/*` are flagging: unit
  tests validate *our* logic, not a third party's API surface.

## Running tests

```bash
npm install
npm test          # single run
npm run test:watch
npm run typecheck  # tsc --noEmit — catches the class of bug tests don't
```

I haven't executed these against a real `npm install` in this
environment (no network access here) — the test logic itself has
been reasoned through by hand, but treat a first real `npm test` run
as the actual verification step, the same way Phase 8's Snowflake
corrections needed a real account to fully confirm.
