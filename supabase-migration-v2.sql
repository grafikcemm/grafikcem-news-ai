-- ============================================================
-- Migration v2 — Multi-channel content system
-- ============================================================

-- Channel settings (one row per channel)
CREATE TABLE IF NOT EXISTS channel_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  daily_generate_limit INTEGER DEFAULT 3,
  last_post_category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated content (drafts for each channel)
CREATE TABLE IF NOT EXISTS generated_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL,           -- 'grafikcem' | 'maskulenkod' | 'linkedin'
  content TEXT NOT NULL,
  content_category TEXT,           -- maskulenkod category rotation
  linkedin_format TEXT,            -- linkedin template type
  status TEXT DEFAULT 'draft',     -- 'draft' | 'used' | 'rejected'
  used_at TIMESTAMPTZ,
  news_item_id UUID REFERENCES news_items(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add used_by column to news_items (tracks which channels used this news)
ALTER TABLE news_items ADD COLUMN IF NOT EXISTS used_by TEXT[] DEFAULT '{}';

-- Seed channel settings
INSERT INTO channel_settings (channel_id) VALUES
  ('grafikcem'), ('maskulenkod'), ('linkedin')
ON CONFLICT (channel_id) DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_generated_content_channel ON generated_content(channel);
CREATE INDEX IF NOT EXISTS idx_generated_content_status ON generated_content(status);
CREATE INDEX IF NOT EXISTS idx_generated_content_created ON generated_content(created_at DESC);
