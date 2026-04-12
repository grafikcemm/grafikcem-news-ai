const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve('.env.local');
const env = fs.readFileSync(envPath, 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length > 0) {
    acc[key.trim()] = vals.join('=').replace(/\"/g, '').trim();
  }
  return acc;
}, {});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSchema() {
  const channelId = 'grafikcem';
  const status = 'used';
  
  console.log(`Testing query for channel: ${channelId}, status: ${status}`);
  
  const { data, error } = await supabase
    .from('generated_content')
    .select('*, news_items(title, url)')
    .eq('channel', channelId)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Query Error:', error);
  } else {
    console.log('Query Result Count:', data.length);
    if (data.length > 0) console.log('First Item:', data[0]);
  }
}

checkSchema();
