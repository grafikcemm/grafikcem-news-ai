import { createClient } from '@supabase/supabase-js';
import Parser from 'rss-parser';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const parser = new Parser({ timeout: 8000 });

async function run() {
  const { data: sources } = await supabase.from('sources').select('*').eq('is_active', true);
  const newItems = [];
  
  for (const source of sources.slice(0, 5)) { // Test with first 5
    try {
      const feed = await parser.parseURL(source.rss_url);
      for (const item of feed.items.slice(0, 10)) {
        newItems.push({
          source_id: source.id,
          title: item.title,
          summary: item.contentSnippet || item.content?.substring(0, 500) || "",
          url: item.link,
          category: source.category,
          published_at: item.pubDate || item.isoDate || null,
        });
      }
    } catch (e) {}
  }
  
  if (newItems.length > 0) {
    const { data, error } = await supabase.from('news_items').upsert(newItems, { onConflict: 'url', ignoreDuplicates: true }).select('id');
    console.log(`Successfully added ${data?.length || 0} news items.`);
  }
}

run();
