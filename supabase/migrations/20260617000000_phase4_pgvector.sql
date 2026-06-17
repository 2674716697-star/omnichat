-- =============================================================================
-- Phase 4 Migration: Enable pgvector + add embedding column to memory_facts
-- =============================================================================
-- Run this AFTER the base schema migration.
-- Uses BGE-M3 embedding model (1024 dimensions, Chinese-optimized, free via SiliconFlow).
-- =============================================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add embedding column to memory_facts (1024-dim for BGE-M3)
ALTER TABLE memory_facts
  ADD COLUMN IF NOT EXISTS embedding vector(1024);

-- 3. Create IVFFlat index for approximate nearest neighbor search
--    This significantly speeds up ORDER BY embedding <=> query_vec for large tables.
--    The index is rebuilt periodically; `lists` should be roughly sqrt(row_count).
--    Start with 100 lists (good for up to ~10k rows).
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
