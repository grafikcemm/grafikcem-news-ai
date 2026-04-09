import { createClient } from '@supabase/supabase-js';
import Parser from 'rss-parser';
import * as dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);
const parser = new Parser({ timeout: 8000 });

async function run() {
  const { data: sources, error } = await supabase.from('sources').select('*').eq('is_active', true);
  if (error) {
    console.error('Error fetching sources:', error);
    return;
  }
  
  const results = [];
  
  for (const source of sources) {
    const res = { name: source.name, url: source.rss_url, status: null, items: 0, error: null };
    try {
      const feed = await parser.parseURL(source.rss_url);
      res.status = 'Success';
      res.items = feed.items.length;
    } catch (err) {
      res.status = 'Error';
      res.error = err.message;
    }
    results.push(res);
  }
  
  fs.writeFileSync('tmp/test_sources.json', JSON.stringify(results, null, 2), 'utf8');
  console.log('DONE');
}

run();
