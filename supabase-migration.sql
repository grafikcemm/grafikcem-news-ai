-- ═══════════════════════════════════════════
-- GrafikCem News AI — Feature Upgrade Migration
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════

-- 1. Viral tweets (for Quote & Reply features)
CREATE TABLE IF NOT EXISTS viral_tweets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  x_tweet_id text UNIQUE NOT NULL,
  content text NOT NULL,
  author_handle text,
  author_name text,
  likes integer DEFAULT 0,
  retweets integer DEFAULT 0,
  fetched_at timestamptz DEFAULT now()
);

-- 2. AI Coach chat history
CREATE TABLE IF NOT EXISTS coach_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 3. Style profile analyses history
CREATE TABLE IF NOT EXISTS style_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_handle text NOT NULL,
  profile_json jsonb NOT NULL,
  tweets_analyzed integer,
  analyzed_at timestamptz DEFAULT now()
);

-- 4. Ensure settings table has a unique constraint on key
--    (it likely already does — this is a safety check)
-- ALTER TABLE settings ADD CONSTRAINT settings_key_unique UNIQUE (key);
-- Uncomment the line above only if you get a duplicate key error on upsert.
