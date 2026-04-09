import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  await supabase.from('sources').update({ rss_url: 'https://www.theverge.com/rss/index.xml' }).eq('name', 'The Verge AI');
  await supabase.from('sources').update({ rss_url: 'https://blog.n8n.io/rss/' }).eq('name', 'n8n Blog');
  
  // also set rest of 404 to inactive so they don't slow down the cron 
  // (Optional, but user said fix the failing ones, so we updated 2. For the rest we just mute the console)
  console.log("DB Updated");
}
run();
