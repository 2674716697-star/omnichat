-- =============================================================================
-- Incremental Migration: add client_conversation_id to conversations
-- =============================================================================
-- Run this AFTER the base schema (20260612130000_create_memory_schema) has been
-- applied.  This migration is idempotent -- safe to run multiple times.
--
-- Purpose: the frontend generates conversation IDs via generateId()
-- (Date.now().toString(36) + random), which are NOT UUIDs.  The conversations
-- table retains its uuid PK (id), but we add a client_conversation_id column
-- so Edge Functions can resolve frontend conv.id -> internal uuid.
-- =============================================================================

-- 1. Add the column (idempotent -- no-op if it already exists)
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS client_conversation_id text NOT NULL DEFAULT '';

-- 2. Unique index on non-empty values.
--    Empty-string rows (old data, direct DB inserts) are allowed to coexist.
--    Any non-empty client_conversation_id must be unique.
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_client_conv_id
  ON conversations (client_conversation_id)
  WHERE client_conversation_id != '';
