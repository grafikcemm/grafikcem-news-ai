const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const competitorsToSeed = [
  { handle: 'tasarimci_mert', category: 'Tasarım', follower_count: 15400, posts_per_week: 5, last_format: 'Carousel', trend: 'yukseliyor', notes: 'Figma ipuçları paylaşıyor' },
  { handle: 'ai_uzmani_kaan', category: 'AI', follower_count: 32000, posts_per_week: 3, last_format: 'Reel', trend: 'yukseliyor', notes: 'Midjourney promptları' },
  { handle: 'freelance_dunyasi', category: 'Freelance', follower_count: 8500, posts_per_week: 7, last_format: 'Post', trend: 'normal', notes: 'Müşteri bulma taktikleri' },
  { handle: 'kodvefikir', category: 'Geliştirme', follower_count: 45000, posts_per_week: 2, last_format: 'Thread', trend: 'dusuyor', notes: 'Uzun teknik yazılar' },
  { handle: 'maskulengucu', category: 'Kişisel Gelişim', follower_count: 12000, posts_per_week: 14, last_format: 'Reel', trend: 'yukseliyor', notes: 'Motivasyon videoları' }
];

async function seed() {
  console.log('Seeding competitors...');
  const { error } = await supabase.from('competitors').insert(competitorsToSeed);
  if (error) {
    console.error('Error seeding competitors:', error);
  } else {
    console.log('Successfully seeded 5 competitors.');
  }
}

seed();
