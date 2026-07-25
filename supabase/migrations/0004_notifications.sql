-- ============================================================
-- INSIGHTOS — Notifications
-- Migration: 0004_notifications.sql
--
-- Added for Phase 10: the automation engine's "notify" and
-- "create task" actions both write here (a task is modeled as a
-- notification with type='task' rather than a separate Tasks
-- feature — see Phase 10 notes on why a full task-management system
-- is intentionally out of scope for this build).
-- ============================================================

create type notification_type as enum ('info', 'task', 'alert');

create table notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade, -- null = workspace-wide
  type notification_type not null default 'info',
  title text not null,
  body text,
  source text not null default 'system', -- e.g. 'automation'
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_notifications_workspace on notifications(workspace_id, created_at desc);

alter table notifications enable row level security;

-- Members can read workspace-wide notifications (user_id is null)
-- and their own personal ones.
create policy "members can read workspace notifications" on notifications
  for select using (
    is_workspace_member(workspace_id)
    and (user_id is null or user_id = auth.uid())
  );

-- Only personal notifications support a read/unread toggle in this
-- version — marking a shared, workspace-wide notification "read" on
-- behalf of everyone else isn't a well-defined action, so that's
-- intentionally not exposed.
create policy "members can mark own notifications read" on notifications
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- No insert policy: notifications are written exclusively by
-- server-side code via the service-role client (automation engine,
-- system events) — regular users never insert directly.
