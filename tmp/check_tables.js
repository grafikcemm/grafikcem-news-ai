const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env.local manually
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)="?([^"]*)"?$/);
  if (match) env[match[1]] = match[2];
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const tables = [
  'competitors',
  'prompts',
  'analytics_entries',
  'focus_tasks',
  'learning_resources',
  'pricing_reports',
  'content_items',
  'storyboards',
  'weekly_content_plans',
  'leads',
  'lead_contacts',
  'topics',
  'content_formats'
];

async function checkTables() {
  const results = {};
  for (const table of tables) {
    const { data, error } = await supabase.rpc('check_table_exists', { t_name: table });
    
    // Fallback if RPC doesn't exist
    if (error) {
       const { error: selectError } = await supabase.from(table).select('count', { count: 'exact', head: true }).limit(0);
       results[table] = !selectError;
    } else {
       results[table] = data;
    }
  }
  console.log(JSON.stringify(results, null, 2));
}

checkTables();
