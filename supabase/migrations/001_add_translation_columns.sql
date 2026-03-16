-- Add translation columns to news_items
ALTER TABLE news_items ADD COLUMN IF NOT EXISTS title_tr TEXT;
ALTER TABLE news_items ADD COLUMN IF NOT EXISTS title_original TEXT;
ALTER TABLE news_items ADD COLUMN IF NOT EXISTS full_summary_tr TEXT;
