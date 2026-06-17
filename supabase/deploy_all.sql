-- =============================================================================
-- OMNICHAT — 完整 Supabase 部署脚本（合并所有 migration）
-- =============================================================================
-- 使用方法：打开 https://supabase.com/dashboard/project/lazsvokcrbykzjgzegpq/sql/new
-- 粘贴全部内容 → 点 Run。所有语句都用了 IF NOT EXISTS，可重复执行。
-- =============================================================================

-- =============================================================================
-- PART 1: Extensions & Helpers
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- PART 2: conversations
-- =============================================================================

CREATE TABLE IF NOT EXISTS conversations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid,
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

DROP TRIGGER IF EXISTS trg_conversations_updated_at ON conversations;
CREATE TRIGGER trg_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- PART 3: messages
-- =============================================================================

CREATE TABLE IF NOT EXISTS messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         text NOT NULL DEFAULT '',
  display_content text NOT NULL DEFAULT '',
  request_content text NOT NULL DEFAULT '',
  metadata_json   jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conv_created
  ON messages (conversation_id, created_at);

-- =============================================================================
-- PART 4: story_states
-- =============================================================================

CREATE TABLE IF NOT EXISTS story_states (
  conversation_id  uuid PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
  scene_state_json jsonb NOT NULL DEFAULT '{}',
  world_json       jsonb NOT NULL DEFAULT '{}',
  character_json   jsonb NOT NULL DEFAULT '{}',
  status_json      jsonb NOT NULL DEFAULT '{}',
  npcs_json        jsonb NOT NULL DEFAULT '[]',
  updated_at       timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_story_states_updated_at ON story_states;
CREATE TRIGGER trg_story_states_updated_at
  BEFORE UPDATE ON story_states
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- PART 5: story_chapters
-- =============================================================================

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
-- PART 6: memory_facts
-- =============================================================================

CREATE TABLE IF NOT EXISTS memory_facts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  chapter_id      uuid REFERENCES story_chapters(id) ON DELETE SET NULL,
  type            text NOT NULL DEFAULT 'character_fact',
  content         text NOT NULL DEFAULT '',
  importance      integer NOT NULL DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),
  status          text NOT NULL DEFAULT 'active',
  source          text NOT NULL DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  last_used_at    timestamptz
);

CREATE INDEX IF NOT EXISTS idx_memory_facts_conv_status_type
  ON memory_facts (conversation_id, status, type);

CREATE INDEX IF NOT EXISTS idx_memory_facts_conv_updated
  ON memory_facts (conversation_id, updated_at DESC);

DROP TRIGGER IF EXISTS trg_memory_facts_updated_at ON memory_facts;
CREATE TRIGGER trg_memory_facts_updated_at
  BEFORE UPDATE ON memory_facts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- PART 7: client_conversation_id (migration 20260614170000)
-- =============================================================================

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS client_conversation_id text NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_client_conv_id
  ON conversations (client_conversation_id)
  WHERE client_conversation_id != '';

-- =============================================================================
-- PART 8: user_profiles (migration 20260614172000)
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id                   uuid PRIMARY KEY,
  schema_version            integer NOT NULL DEFAULT 1,
  display_name              text NOT NULL DEFAULT '',
  bio                       text NOT NULL DEFAULT '',
  avatar_url                text NOT NULL DEFAULT '',
  profile_background_url    text NOT NULL DEFAULT '',
  profile_background_position text NOT NULL DEFAULT 'center center',
  profile_theme_json        jsonb NOT NULL DEFAULT '{}',
  personalization_json      jsonb NOT NULL DEFAULT '{}',
  preferences_json          jsonb NOT NULL DEFAULT '{}',
  public_profile_json       jsonb NOT NULL DEFAULT '{}',
  private_profile_json      jsonb NOT NULL DEFAULT '{}',
  ui_state_json             jsonb NOT NULL DEFAULT '{}',
  asset_settings_json       jsonb NOT NULL DEFAULT '{}',
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_display_name
  ON user_profiles (lower(display_name));

DROP TRIGGER IF EXISTS trg_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- PART 9: cloud_backups (migration 20260617100000)
-- =============================================================================

CREATE TABLE IF NOT EXISTS cloud_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  backup_data jsonb NOT NULL,
  backup_version integer NOT NULL DEFAULT 1,
  conversation_count integer NOT NULL DEFAULT 0,
  message_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cloud_backups_user_id
  ON cloud_backups (user_id);

ALTER TABLE cloud_backups ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can manage own backups'
    AND tablename = 'cloud_backups'
  ) THEN
    CREATE POLICY "Users can manage own backups"
      ON cloud_backups FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- =============================================================================
-- PART 10: service_role grants
-- =============================================================================

GRANT USAGE ON SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON conversations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages     TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON story_states TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON story_chapters TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON memory_facts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_profiles TO service_role;
GRANT ALL ON TABLE cloud_backups TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- =============================================================================
-- PART 11: Phase 4 — pgvector + embedding (migration 20260617000000)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE memory_facts
  ADD COLUMN IF NOT EXISTS embedding vector(1024);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_memory_facts_embedding_ivfflat'
  ) THEN
    CREATE INDEX idx_memory_facts_embedding_ivfflat
      ON memory_facts
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
  END IF;
END $$;

-- =============================================================================
-- DONE
-- =============================================================================
-- 验证：SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;
-- 应该看到：cloud_backups, conversations, memory_facts, messages, story_chapters, story_states, user_profiles
