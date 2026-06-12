-- =============================================================================
-- Mira Memory Schema — Supabase CLI Migration Mirror
-- =============================================================================
-- This file is a CLI-compatible copy of supabase/memory_schema.sql.
-- The canonical source of truth is supabase/memory_schema.sql.
-- When the schema changes, BOTH files must be updated in sync.
--
-- Usage:
--   - For Dashboard SQL Editor: copy & paste supabase/memory_schema.sql
--   - For Supabase CLI:         supabase db push   (uses this file)
--   - For local dev:            supabase migration up (uses this file)
-- =============================================================================

-- =============================================================================
-- Mira Memory Schema — Phase 2 Supabase Prototype
-- =============================================================================
-- Before executing:
--   1. Decide whether to enable Auth / RLS (Row Level Security).
--      - Personal mode (single-user, no auth): skip RLS — all policies are
--        commented out below.  Tables are world-readable/writable by default.
--      - Multi-user mode: enable the RLS blocks at the end of this file,
--        ensure Supabase Auth is configured, and verify that user_id is
--        populated on every row.
--   2. This schema does NOT include an API Key storage table.
--      Key management stays local (see BACKEND_MEMORY_PLAN.md § API Key 策略).
--   3. pgvector is NOT required yet — embedding fields are commented out.
--      Uncomment them when reaching Phase 4 (向量检索).
-- =============================================================================

-- =============================================================================
-- Extensions
-- =============================================================================

-- Required: UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Optional (Phase 4): vector similarity search.
-- Uncomment when pgvector is installed in your Supabase project:
-- CREATE EXTENSION IF NOT EXISTS vector;

-- =============================================================================
-- Helper: updated_at trigger function
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Table: conversations
-- =============================================================================

CREATE TABLE IF NOT EXISTS conversations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid,                         -- nullable: personal mode doesn't require auth
  title         text NOT NULL DEFAULT '',
  provider      text NOT NULL DEFAULT '',
  model         text NOT NULL DEFAULT '',
  settings_json jsonb NOT NULL DEFAULT '{}',
  archived      boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_updated
  ON conversations (user_id, updated_at DESC);

-- Attach updated_at trigger
DROP TRIGGER IF EXISTS trg_conversations_updated_at ON conversations;
CREATE TRIGGER trg_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- Table: messages
-- =============================================================================
-- Stores only the FINAL complete message, NOT streaming deltas.
-- Each row is one turn (user or assistant) after the response finishes.

CREATE TABLE IF NOT EXISTS messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         text NOT NULL DEFAULT '',
  display_content text NOT NULL DEFAULT '',    -- UI-only version (e.g. truncated world card)
  request_content text NOT NULL DEFAULT '',    -- raw content sent to the model API
  metadata_json   jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conv_created
  ON messages (conversation_id, created_at);

-- =============================================================================
-- Table: story_states
-- =============================================================================
-- One row per conversation that has story mode active.
-- Holds the current "now" snapshot: character, world, status, NPCs, scene direction.

CREATE TABLE IF NOT EXISTS story_states (
  conversation_id  uuid PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
  scene_state_json jsonb NOT NULL DEFAULT '{}',
  world_json       jsonb NOT NULL DEFAULT '{}',
  character_json   jsonb NOT NULL DEFAULT '{}',
  status_json      jsonb NOT NULL DEFAULT '{}',
  npcs_json        jsonb NOT NULL DEFAULT '[]',
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Attach updated_at trigger
DROP TRIGGER IF EXISTS trg_story_states_updated_at ON story_states;
CREATE TRIGGER trg_story_states_updated_at
  BEFORE UPDATE ON story_states
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- Table: story_chapters
-- =============================================================================
-- Chapter-level summaries produced by the auxiliary model.
-- Each chapter covers a range of message turns [turn_start, turn_end].

CREATE TABLE IF NOT EXISTS story_chapters (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id        uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  chapter_index          integer NOT NULL DEFAULT 0,
  turn_start             integer NOT NULL DEFAULT 0,
  turn_end               integer NOT NULL DEFAULT 0,
  title                  text NOT NULL DEFAULT '',
  summary                text NOT NULL DEFAULT '',
  key_events_json        jsonb NOT NULL DEFAULT '[]',
  character_changes_json jsonb NOT NULL DEFAULT '[]',
  relationship_changes_json jsonb NOT NULL DEFAULT '[]',
  unresolved_threads_json   jsonb NOT NULL DEFAULT '[]',
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_story_chapters_conv_index
  ON story_chapters (conversation_id, chapter_index);

-- =============================================================================
-- Table: memory_facts
-- =============================================================================
-- Long-term, retrievable facts: world rules, character identities, promises,
-- relationships, plot threads, etc.
--
-- type values:
--   world_rule, character_fact, relationship, plot_thread,
--   promise, location, preference
--
-- status values:
--   active, resolved, contradicted, archived
--
-- embedding (Phase 4):
--   Uncomment the line below when pgvector is enabled.
--   ALTER TABLE memory_facts ADD COLUMN embedding vector(1536);

CREATE TABLE IF NOT EXISTS memory_facts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  chapter_id      uuid REFERENCES story_chapters(id) ON DELETE SET NULL,
  type            text NOT NULL DEFAULT 'character_fact',
  content         text NOT NULL DEFAULT '',
  importance      integer NOT NULL DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),
  status          text NOT NULL DEFAULT 'active',
  source          text NOT NULL DEFAULT '',     -- e.g. "chapter:3" or "message:<uuid>"
  -- embedding    vector(1536),                 -- Phase 4: uncomment after CREATE EXTENSION vector
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  last_used_at    timestamptz
);

-- Composite index for filtering active facts of a given type within a conversation
CREATE INDEX IF NOT EXISTS idx_memory_facts_conv_status_type
  ON memory_facts (conversation_id, status, type);

-- Time-based index for retrieving recently updated facts
CREATE INDEX IF NOT EXISTS idx_memory_facts_conv_updated
  ON memory_facts (conversation_id, updated_at DESC);

-- Attach updated_at trigger
DROP TRIGGER IF EXISTS trg_memory_facts_updated_at ON memory_facts;
CREATE TRIGGER trg_memory_facts_updated_at
  BEFORE UPDATE ON memory_facts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- Row Level Security (RLS) — COMMENTED OUT by default
-- =============================================================================
-- Personal mode (no Supabase Auth) should leave RLS disabled.
-- When migrating to multi-user mode with Supabase Auth, uncomment the blocks
-- below to enforce per-user isolation.
--
-- Usage:
--   1. Enable Auth in your Supabase project.
--   2. Ensure every INSERT/UPDATE sets user_id = auth.uid().
--   3. Uncomment and run the following statements.

/*
-- conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own conversations"
  ON conversations
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage messages in their conversations"
  ON messages
  FOR ALL
  USING (
    auth.uid() = (
      SELECT c.user_id FROM conversations c WHERE c.id = messages.conversation_id
    )
  )
  WITH CHECK (
    auth.uid() = (
      SELECT c.user_id FROM conversations c WHERE c.id = messages.conversation_id
    )
  );

-- story_states
ALTER TABLE story_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage story states in their conversations"
  ON story_states
  FOR ALL
  USING (
    auth.uid() = (
      SELECT c.user_id FROM conversations c WHERE c.id = story_states.conversation_id
    )
  )
  WITH CHECK (
    auth.uid() = (
      SELECT c.user_id FROM conversations c WHERE c.id = story_states.conversation_id
    )
  );

-- story_chapters
ALTER TABLE story_chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage chapters in their conversations"
  ON story_chapters
  FOR ALL
  USING (
    auth.uid() = (
      SELECT c.user_id FROM conversations c WHERE c.id = story_chapters.conversation_id
    )
  )
  WITH CHECK (
    auth.uid() = (
      SELECT c.user_id FROM conversations c WHERE c.id = story_chapters.conversation_id
    )
  );

-- memory_facts
ALTER TABLE memory_facts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage facts in their conversations"
  ON memory_facts
  FOR ALL
  USING (
    auth.uid() = (
      SELECT c.user_id FROM conversations c WHERE c.id = memory_facts.conversation_id
    )
  )
  WITH CHECK (
    auth.uid() = (
      SELECT c.user_id FROM conversations c WHERE c.id = memory_facts.conversation_id
    )
  );
*/
