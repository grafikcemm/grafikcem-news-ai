const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const allowedSources = [
    "The Verge AI",
    "TechCrunch AI",
    "Anthropic Blog",
    "OpenAI Blog",
    "Hugging Face Blog",
    "Simon Willison",
    "Latent Space",
    "Webrazzi",
    "The Verge",
    "TechCrunch",
    "Anthropic",
    "OpenAI",
    "Hugging Face",
  ];

  // Set all to false first
  const { error: err1 } = await supabase.from('sources').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000');
  if (err1) console.error("Error setting false:", err1);

  // Set allowed ones to true
  const { error: err2 } = await supabase.from('sources').update({ is_active: true }).in('name', allowedSources);
  if (err2) console.error("Error setting true:", err2);
  
  console.log("Sources updated.");
}

run();
