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

async function checkCompetitorSchema() {
  const { data, error } = await supabase.from('competitors').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Columns:', Object.keys(data[0] || {}));
    console.log('Sample Data:', data[0]);
  }
}

checkCompetitorSchema();
