require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-client');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const competitors = [
  { handle: 'webrazzi', name: 'Webrazzi', category: 'Teknoloji Haberleri', follower_count: 250000, avg_engagement_rate: 1.2, posts_per_week: 35, last_format: 'Haber/Link', trend: 'stable', notes: "Türkiye'nin en büyük teknoloji haber sitesi." },
  { handle: 'shiftdeletenet', name: 'ShiftDelete.Net', category: 'Teknoloji/Yaşam', follower_count: 450000, avg_engagement_rate: 0.8, posts_per_week: 50, last_format: 'Video/Reels', trend: 'rising', notes: 'Video odaklı teknoloji içeriği.' },
  { handle: 'webtekno', name: 'Webtekno', category: 'Teknoloji/Eğlence', follower_count: 800000, avg_engagement_rate: 2.1, posts_per_week: 40, last_format: 'Reels/Meme', trend: 'stable', notes: 'Genç kitleye hitap eden eğlenceli teknoloji içeriği.' },
  { handle: 'bundleapp', name: 'Bundle', category: 'Haber/Kürasyon', follower_count: 120000, avg_engagement_rate: 1.5, posts_per_week: 100, last_format: 'Link/Haber', trend: 'stable', notes: 'Haber kürasyonu ve bildirim odaklı.' }
];

async function seed() {
  const { data, error } = await supabase
    .from('competitors')
    .upsert(competitors, { onConflict: 'handle' });

  if (error) {
    console.error('Seed Error:', error);
  } else {
    console.log('Seed Successful');
  }
}

seed();
