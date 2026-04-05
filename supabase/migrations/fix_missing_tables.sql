-- ============================================================
-- Migration: Fix Missing Tables
-- Description: Creates all core tables if they don't exist.
-- Author: Antigravity
-- ============================================================

-- 1. Competitors
CREATE TABLE IF NOT EXISTS competitors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  handle TEXT NOT NULL,
  platform TEXT DEFAULT 'instagram',
  category TEXT,
  follower_count INTEGER DEFAULT 0,
  avg_engagement_rate DECIMAL(5, 2) DEFAULT 0,
  posts_per_week DECIMAL(4, 1) DEFAULT 0,
  last_format TEXT,
  trend TEXT DEFAULT 'normal',
  notes TEXT,
  last_updated DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Prompts
CREATE TABLE IF NOT EXISTS prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_favorited BOOLEAN DEFAULT FALSE,
  use_count INTEGER DEFAULT 0,
  title_tr TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Analytics Entries
CREATE TABLE IF NOT EXISTS analytics_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL,
  week_start DATE NOT NULL,
  reach INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  new_followers INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5, 2) DEFAULT 0,
  best_post_title TEXT,
  best_post_reach INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Focus Tasks
CREATE TABLE IF NOT EXISTS focus_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Learning Resources
CREATE TABLE IF NOT EXISTS learning_resources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  source TEXT,
  category TEXT,
  relevance_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Pricing Reports
CREATE TABLE IF NOT EXISTS pricing_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_name TEXT NOT NULL,
  min_price DECIMAL(12, 2),
  max_price DECIMAL(12, 2),
  currency TEXT DEFAULT 'TRY',
  avg_price_market DECIMAL(12, 2),
  source_urls TEXT[],
  analysis TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Content Items
CREATE TABLE IF NOT EXISTS content_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  caption TEXT,
  platform TEXT NOT NULL,
  format TEXT,
  status TEXT DEFAULT 'draft',
  scheduled_date DATE,
  published_at TIMESTAMPTZ,
  notes TEXT,
  hook TEXT,
  storyboard_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Storyboards
CREATE TABLE IF NOT EXISTS storyboards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  platform TEXT,
  format TEXT,
  hook TEXT,
  scenes JSONB,
  shooting_tips JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Weekly Content Plans
CREATE TABLE IF NOT EXISTS weekly_content_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start DATE NOT NULL,
  theme TEXT,
  content_json JSONB,
  ai_insights TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Leads
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_name TEXT NOT NULL,
  website_url TEXT,
  contact_phone TEXT,
  sector TEXT,
  city TEXT,
  district TEXT,
  potential_score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'discovered',
  ai_analysis TEXT,
  why_they_need_us TEXT,
  recommended_services TEXT[],
  estimated_price_min DECIMAL(12, 2) DEFAULT 0,
  estimated_price_max DECIMAL(12, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Lead Contacts
CREATE TABLE IF NOT EXISTS lead_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  contact_type TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Topics
CREATE TABLE IF NOT EXISTS topics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  priority TEXT DEFAULT 'medium',
  keywords TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Content Formats
CREATE TABLE IF NOT EXISTS content_formats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  icon TEXT,
  description TEXT,
  max_length TEXT,
  pattern TEXT,
  structure TEXT[],
  example TEXT,
  viral_level INTEGER DEFAULT 1,
  best_for TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Topics Seed
INSERT INTO topics (name, category, priority, is_active)
VALUES 
  ('Tasarım', 'design', 'high', true),
  ('AI', 'ai_tools', 'high', true),
  ('Freelance', 'freelance', 'medium', true),
  ('İş Geliştirme', 'growth', 'medium', true),
  ('Kişisel Gelişim', 'growth', 'low', true)
ON CONFLICT DO NOTHING;

-- Content Formats Seed
INSERT INTO content_formats (label, icon, description, viral_level)
VALUES 
  ('Reel', '🎬', 'Kısa dikey video formatı', 5),
  ('Carousel', '🎠', 'Kaydırmalı görsel serisi', 4),
  ('Story', '📸', '24 saatlik geçici içerik', 3),
  ('Post', '🖼️', 'Standart görsel paylaşımı', 3),
  ('Thread', '🧵', 'Seri tweet akışı', 5),
  ('LinkedIn Article', '📝', 'Uzun form profesyonel makale', 4)
ON CONFLICT DO NOTHING;
