-- ============================================================
-- Migration v3 — Full System Update Features
-- Run in Supabase SQL Editor
-- ============================================================

-- news_items table
ALTER TABLE news_items ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
ALTER TABLE news_items ADD COLUMN IF NOT EXISTS is_favorited BOOLEAN DEFAULT FALSE;

-- tweet_drafts table
ALTER TABLE tweet_drafts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
-- status values: 'pending', 'used', 'editing'

-- prompts table
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS title_tr TEXT;
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS use_count INTEGER DEFAULT 0;
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS is_favorited BOOLEAN DEFAULT FALSE;

-- analytics table (new)
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL, -- 'draft_generated', 'draft_used', 'prompt_copied', etc.
  channel TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
