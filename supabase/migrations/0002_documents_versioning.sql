-- ============================================================
-- INSIGHTOS — Supabase schema addition
-- Migration: 0002_documents_versioning.sql
--
-- A new upload with the same file_name in the same workspace
-- supersedes the previous one via parent_document_id rather than
-- creating an unrelated record — this is what the Document Center's
-- version history view groups on.
-- ============================================================

alter table documents
  add column parent_document_id uuid references documents(id) on delete set null;

create index idx_documents_file_name on documents(workspace_id, file_name, version desc);
