-- =============================================================================
-- Migration: Grant service_role privileges on memory schema tables
-- =============================================================================
-- Edge Functions (memory-update, memory-retrieve) use the service_role key to
-- bypass RLS and access tables directly.  Supabase does NOT auto-grant table
-- permissions to service_role -- they must be applied explicitly.
--
-- This migration is idempotent (GRANT is safe to re-run).
-- =============================================================================

GRANT USAGE ON SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON conversations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages     TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON story_states TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON story_chapters TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON memory_facts TO service_role;
-- user_profiles GRANT is in 20260614172000_add_user_profiles.sql
-- (the table doesn't exist yet at this migration time)

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
