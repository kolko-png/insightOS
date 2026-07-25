create extension if not exists "pgcrypto";

-- ---------- ENUMS ----------
create type workspace_role as enum ('owner', 'admin', 'member');
create type business_role as enum (
  'ceo', 'finance_manager', 'sales_manager',
  'operations', 'warehouse', 'hr', 'business_owner'
);
create type automation_trigger_type as enum ('schedule', 'event', 'threshold');
create type automation_run_status as enum ('pending', 'running', 'success', 'failed');
create type document_status as enum ('uploading', 'processing', 'embedded', 'failed');

-- ============================================================
-- WORKSPACES & IDENTITY
-- ============================================================

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  -- Every workspace maps 1:1 to a workspace_id used as the
  -- tenancy key in Snowflake's ANALYTICS schema (see Phase 3 diagram).
  snowflake_workspace_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table workspace_members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  workspace_role workspace_role not null default 'member',
  business_role business_role not null,
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  primary key (workspace_id, user_id)
);

create index idx_workspace_members_user on workspace_members(user_id);

-- ============================================================
-- COPILOT: CONVERSATIONS + MESSAGES
-- ============================================================

create table conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_conversations_workspace on conversations(workspace_id, updated_at desc);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  -- citations: [{ "source": "invoices.csv", "chunk_id": "...", "snowflake_query_id": "..." }]
  citations jsonb not null default '[]',
  -- reasoning: explainability trace — retrieved chunks, generated SQL, confidence
  reasoning jsonb,
  created_at timestamptz not null default now()
);

create index idx_messages_conversation on messages(conversation_id, created_at);

-- ============================================================
-- DOCUMENTS (metadata only — bytes in Supabase Storage,
-- parsed/embedded content lives in Snowflake AI.DOCUMENT_CHUNKS)
-- ============================================================

create table documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  uploaded_by uuid not null references profiles(id),
  file_name text not null,
  file_type text not null,
  storage_path text not null,        -- Supabase Storage object path
  snowflake_stage_path text,         -- populated once copied into DOCUMENT_STAGE
  status document_status not null default 'uploading',
  category text,
  version int not null default 1,
  created_at timestamptz not null default now()
);

create index idx_documents_workspace on documents(workspace_id, created_at desc);

-- ============================================================
-- AUTOMATION
-- ============================================================

create table automation_workflows (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  trigger_type automation_trigger_type not null,
  trigger_config jsonb not null,     -- e.g. {"metric":"inventory","operator":"<","value":100}
  conditions jsonb not null default '[]',
  actions jsonb not null default '[]',
  is_active boolean not null default true,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create table automation_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references automation_workflows(id) on delete cascade,
  status automation_run_status not null default 'pending',
  trigger_payload jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table automation_logs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references automation_runs(id) on delete cascade,
  step_name text not null,
  status text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index idx_automation_runs_workflow on automation_runs(workflow_id, started_at desc);

-- ============================================================
-- API KEYS & AUDIT LOG
-- ============================================================

create table api_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  key_hash text not null,            -- store a hash only, never the raw key
  created_by uuid not null references profiles(id),
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  actor_id uuid references profiles(id),
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_log_workspace on audit_log(workspace_id, created_at desc);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table documents enable row level security;
alter table automation_workflows enable row level security;
alter table automation_runs enable row level security;
alter table automation_logs enable row level security;
alter table api_keys enable row level security;
alter table audit_log enable row level security;

-- security definer functions so policies don't need to
-- re-express the membership join in every single policy
create or replace function is_workspace_member(ws_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = ws_id and user_id = auth.uid()
  );
$$;

create or replace function is_workspace_admin(ws_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = ws_id
      and user_id = auth.uid()
      and workspace_role in ('owner', 'admin')
  );
$$;

-- workspaces
create policy "workspace members can read" on workspaces
  for select using (is_workspace_member(id));

create policy "workspace admins can update" on workspaces
  for update using (is_workspace_admin(id));

-- workspace_members
create policy "members can read roster" on workspace_members
  for select using (is_workspace_member(workspace_id));

create policy "admins can manage roster" on workspace_members
  for all using (is_workspace_admin(workspace_id));

-- conversations
create policy "members can read workspace conversations" on conversations
  for select using (is_workspace_member(workspace_id));

create policy "members can create conversations" on conversations
  for insert with check (is_workspace_member(workspace_id) and user_id = auth.uid());

create policy "owners can update own conversations" on conversations
  for update using (user_id = auth.uid());

-- messages (scoped through parent conversation's workspace)
create policy "members can read messages" on messages
  for select using (
    exists (
      select 1 from conversations c
      where c.id = conversation_id and is_workspace_member(c.workspace_id)
    )
  );

create policy "members can insert messages" on messages
  for insert with check (
    exists (
      select 1 from conversations c
      where c.id = conversation_id and is_workspace_member(c.workspace_id)
    )
  );

-- documents
create policy "members can read documents" on documents
  for select using (is_workspace_member(workspace_id));

create policy "members can upload documents" on documents
  for insert with check (is_workspace_member(workspace_id) and uploaded_by = auth.uid());

-- automation
create policy "members can read workflows" on automation_workflows
  for select using (is_workspace_member(workspace_id));

create policy "admins can create workflows" on automation_workflows
  for insert with check (is_workspace_admin(workspace_id));

create policy "admins can update workflows" on automation_workflows
  for update using (is_workspace_admin(workspace_id));

create policy "members can read runs" on automation_runs
  for select using (
    exists (
      select 1 from automation_workflows w
      where w.id = workflow_id and is_workspace_member(w.workspace_id)
    )
  );

create policy "members can read logs" on automation_logs
  for select using (
    exists (
      select 1 from automation_runs r
      join automation_workflows w on w.id = r.workflow_id
      where r.id = run_id and is_workspace_member(w.workspace_id)
    )
  );

-- api_keys: admin-only, both read and write
create policy "admins can manage api keys" on api_keys
  for all using (is_workspace_admin(workspace_id));

-- audit_log: admin read-only, writes happen only via service-role (server-side)
create policy "admins can read audit log" on audit_log
  for select using (is_workspace_admin(workspace_id));
