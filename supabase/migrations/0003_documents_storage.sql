-- ============================================================
-- INSIGHTOS — Supabase Storage setup
-- Migration: 0003_documents_storage.sql
--
-- Uploads go directly from the browser to this bucket (see
-- use-upload-document.ts) rather than proxied through a Next.js
-- Route Handler — avoids serverless function body-size limits for
-- larger files. Storage RLS is what makes that safe: a client
-- can't upload into or read another workspace's folder even though
-- it's talking to Storage directly, because every object path is
-- prefixed with the workspace_id folder segment and these policies
-- check that segment against real membership.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Path convention enforced by use-upload-document.ts:
-- {workspace_id}/{uuid}-{original_file_name}
-- storage.foldername(name) splits the object path into an array;
-- [1] is that first workspace_id segment.

create policy "workspace members can read own documents"
on storage.objects for select
using (
  bucket_id = 'documents'
  and is_workspace_member((storage.foldername(name))[1]::uuid)
);

create policy "workspace members can upload documents"
on storage.objects for insert
with check (
  bucket_id = 'documents'
  and is_workspace_member((storage.foldername(name))[1]::uuid)
);
