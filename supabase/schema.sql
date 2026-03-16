-- GrafikCem News AI — Supabase Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════
-- TABLES
-- ═══════════════════════════════

CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  rss_url TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('ai_news', 'design', 'automation', 'dev_tools', 'turkish')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE news_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID REFERENCES sources(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  url TEXT UNIQUE NOT NULL,
  category TEXT,
  published_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  viral_score INTEGER DEFAULT 0 CHECK (viral_score >= 0 AND viral_score <= 100),
  viral_reason TEXT,
  is_used BOOLEAN DEFAULT FALSE,
  title_tr TEXT,
  title_original TEXT,
  full_summary_tr TEXT
);

CREATE TABLE tweet_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  news_id UUID REFERENCES news_items(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  tweet_type TEXT NOT NULL CHECK (tweet_type IN ('single', 'thread')),
  thread_tweets JSONB,
  ai_score INTEGER DEFAULT 0 CHECK (ai_score >= 0 AND ai_score <= 100),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'published')),
  is_recommended BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE published_tweets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  draft_id UUID REFERENCES tweet_drafts(id) ON DELETE CASCADE,
  x_post_id TEXT,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  impressions INTEGER DEFAULT 0
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════
-- INDEXES
-- ═══════════════════════════════

CREATE INDEX idx_news_items_viral_score ON news_items(viral_score DESC);
CREATE INDEX idx_news_items_fetched_at ON news_items(fetched_at DESC);
CREATE INDEX idx_news_items_url ON news_items(url);
CREATE INDEX idx_tweet_drafts_status ON tweet_drafts(status);
CREATE INDEX idx_tweet_drafts_news_id ON tweet_drafts(news_id);

-- ═══════════════════════════════
-- SEED DATA — Default RSS Sources
-- ═══════════════════════════════

INSERT INTO sources (name, rss_url, category) VALUES
  ('The Verge AI', 'https://www.theverge.com/ai-artificial-intelligence/rss/index.xml', 'ai_news'),
  ('TechCrunch AI', 'https://techcrunch.com/category/artificial-intelligence/feed/', 'ai_news'),
  ('Anthropic Blog', 'https://www.anthropic.com/news/rss.xml', 'ai_news'),
  ('OpenAI Blog', 'https://openai.com/blog/rss.xml', 'ai_news'),
  ('Simon Willison', 'https://simonwillison.net/atom/everything/', 'ai_news'),
  ('Hugging Face Blog', 'https://huggingface.co/blog/feed.xml', 'ai_news'),
  ('Ben''s Bites', 'https://www.bensbites.com/feed', 'ai_news'),
  ('Figma Blog', 'https://www.figma.com/blog/feed/', 'design'),
  ('n8n Blog', 'https://n8n.io/blog/rss.xml', 'automation'),
  ('Product Hunt', 'https://www.producthunt.com/feed', 'dev_tools'),
  ('Webrazzi', 'https://webrazzi.com/feed/', 'turkish');

-- ═══════════════════════════════
-- Default settings
-- ═══════════════════════════════

INSERT INTO settings (key, value) VALUES
  ('custom_voice_prompt', '');
