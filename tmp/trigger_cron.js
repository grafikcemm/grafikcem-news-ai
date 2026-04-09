import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function trigger() {
  const url = 'http://localhost:3000/api/cron/fetch-news';
  const secret = process.env.CRON_SECRET || 'grafikcem2026';
  
  console.log(`Triggering cron at ${url}...`);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'authorization': secret
      }
    });
    
    const data = await res.json();
    console.log('Response Status:', res.status);
    console.log('Response Data:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error triggering cron:', err.message);
    console.log('Make sure the dev server is running at http://localhost:3000');
  }
}

trigger();
