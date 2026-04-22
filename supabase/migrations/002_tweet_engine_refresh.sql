-- Tweet engine refresh
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE channel_settings
  ADD COLUMN IF NOT EXISTS style_profile JSONB;

INSERT INTO channel_settings (channel_id)
VALUES ('sporhaberleri')
ON CONFLICT (channel_id) DO NOTHING;

ALTER TABLE tweet_drafts
  ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'grafikcem',
  ADD COLUMN IF NOT EXISTS format TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_tweet_drafts_channel ON tweet_drafts(channel);
CREATE INDEX IF NOT EXISTS idx_tweet_drafts_channel_status ON tweet_drafts(channel, status);

CREATE TABLE IF NOT EXISTS viral_references (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account TEXT NOT NULL,
  tweet_text TEXT NOT NULL,
  engagement_score INTEGER DEFAULT 0,
  format TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_viral_references_unique
  ON viral_references(account, tweet_text);

INSERT INTO viral_references (account, tweet_text, format) VALUES
  ('grafikcem', 'clawdbot denen şey sessiz sedasız 8000 github star toplamış. adam self hosted ai agent kuruyor, kendi sunucusunda çalışıyor, verisi hiçbir yere gitmiyor. chatgpt gibi ama senin kontrolünde. senin makinende. senin verinle.', 'spark'),
  ('grafikcem', 'insanlar openaia ayda 20 dolar verip verisini teslim ediyor. bu adam aynı işi kendi vpsinde yapıyor. privacy denen şeyi laf olsun diye değil gerçekten çözüyor.', 'punch'),
  ('maskulenkod', 'disiplin motivasyona ihtiyaç duymaz. motivasyon gelir geçer. disiplin sistem kurar.', 'micro'),
  ('maskulenkod', 'başarısız olmak değil, başarısızlıktan sonra kalkmamak kaybettirir.', 'micro')
ON CONFLICT (account, tweet_text) DO NOTHING;
