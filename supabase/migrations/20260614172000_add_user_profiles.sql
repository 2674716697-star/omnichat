-- =============================================================================
-- Incremental Migration: add user_profiles table
-- =============================================================================
-- Run this after the base schema and client_conversation_id migration have been
-- applied.  This migration is idempotent -- safe to run multiple times.
--
-- Purpose: reserve backend space for future Auth user profiles (display name,
-- avatar, bio, profile background, personalization preferences).  No frontend
-- integration yet.  No FK to auth.users (avoids Dashboard/CLI environment
-- differences breaking the migration).
--
-- This table does NOT store model API keys or provider secrets.
-- =============================================================================

-- 1. Create the table (idempotent)
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

-- 2. Index on lower(display_name) for future name search
CREATE INDEX IF NOT EXISTS idx_user_profiles_display_name
  ON user_profiles (lower(display_name));

-- 3. updated_at trigger (uses existing set_updated_at() function)
DROP TRIGGER IF EXISTS trg_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4. Grant service_role privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON user_profiles TO service_role;

-- =============================================================================
-- RLS block — COMMENTED OUT until Supabase Auth is enabled in production
-- =============================================================================
-- Uncomment when migrating to multi-user mode:
/*
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own profile"
  ON user_profiles
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
*/
