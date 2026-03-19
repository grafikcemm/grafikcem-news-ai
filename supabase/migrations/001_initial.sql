-- GrafikCem News AI — Initial Schema
-- Run this in Supabase SQL Editor

-- RSS sources
CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rss_url TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'ai_news',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aggregated news items
CREATE TABLE IF NOT EXISTS news_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  title_tr TEXT,
  title_original TEXT,
  summary TEXT,
  full_summary_tr TEXT,
  url TEXT NOT NULL UNIQUE,
  category TEXT,
  viral_score INTEGER DEFAULT 0,
  viral_reason TEXT,
  used_by TEXT[] DEFAULT '{}',
  published_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Channel settings (grafikcem, maskulenkod, linkedin)
CREATE TABLE IF NOT EXISTS channel_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  daily_generate_limit INTEGER DEFAULT 3,
  last_post_category TEXT,
  style_profile JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI-generated content drafts per channel
CREATE TABLE IF NOT EXISTS generated_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL,
  content TEXT NOT NULL,
  content_category TEXT,
  linkedin_format TEXT,
  status TEXT DEFAULT 'draft',
  used_at TIMESTAMPTZ,
  news_item_id UUID REFERENCES news_items(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tweet drafts (from tweet generator)
CREATE TABLE IF NOT EXISTS tweet_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  news_id UUID REFERENCES news_items(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  tweet_type TEXT DEFAULT 'single',
  thread_tweets TEXT[],
  ai_score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  is_recommended BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Global key-value settings (style_profile, custom_voice_prompt, etc.)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cached viral tweets from X API
CREATE TABLE IF NOT EXISTS viral_tweets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  x_tweet_id TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  author_handle TEXT,
  author_name TEXT,
  likes INTEGER DEFAULT 0,
  retweets INTEGER DEFAULT 0,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Historical style analyses
CREATE TABLE IF NOT EXISTS style_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_handle TEXT NOT NULL,
  profile_json JSONB,
  tweets_analyzed INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default channel settings
INSERT INTO channel_settings (channel_id) VALUES ('grafikcem'), ('maskulenkod'), ('linkedin')
ON CONFLICT (channel_id) DO NOTHING;

-- Add style_profile column if upgrading from v1
ALTER TABLE channel_settings ADD COLUMN IF NOT EXISTS style_profile JSONB;
