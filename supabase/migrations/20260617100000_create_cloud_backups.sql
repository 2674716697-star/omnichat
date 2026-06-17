-- =============================================================================
-- Incremental Migration: create cloud_backups table for full-state backup
-- =============================================================================
-- Purpose: stores periodic full backups of all user conversations + settings
-- (excluding API keys). One row per user — upsert pattern.
-- Depends on: auth.users table (Supabase managed)
-- =============================================================================

-- 1. Create the table
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

-- 2. One backup per user (upsert by user_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_cloud_backups_user_id
  ON cloud_backups (user_id);

-- 3. RLS: users can only read/write their own backup
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

-- 4. Grant service_role permissions (so Edge Functions can bypass RLS if needed)
GRANT ALL ON TABLE cloud_backups TO service_role;
GRANT USAGE, SELECT ON SEQUENCE cloud_backups_id_seq TO service_role;
