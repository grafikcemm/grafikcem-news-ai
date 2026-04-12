import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const API_BASE = 'http://localhost:3000/api';

let passedTests = 0;
let totalTests = 0;

async function apiTest(name, url, options, validator) {
  totalTests++;
  try {
    const res = await fetch(API_BASE + url, options);
    if (!res.ok) {
        let errText = await res.text();
        console.log(`\nTEST ${name}: ❌ HATALI (Status: ${res.status})`);
        console.log(`- Backend Error: ${errText.substring(0, 500)}`);
        return false;
    }
    const data = await res.json();
    
    if (validator && !validator(data)) {
      console.log(`\nTEST ${name}: ❌ HATALI`);
      console.log(`- Çalışmayan: Yanıt formatı veya verify doğrulama hatası. (Veri: ${JSON.stringify(data).substring(0,250)})`);
      return false;
    }

    console.log(`\nTEST ${name}: ✅ GEÇTİ`);
    console.log(`- Çalışan: Endpoint yanıt verdi ve format doğru.`);
    passedTests++;
    return true;
  } catch (err) {
    console.log(`\nTEST ${name}: ❌ HATALI`);
    console.log(`- Çalışmayan: Sunucu veya ağ hatası - ${err.message}`);
    return false;
  }
}

async function logTest(name, isPass, error) {
  totalTests++;
  console.log(`\nTEST ${name}: ${isPass ? '✅ GEÇTİ' : '❌ HATALI'}`);
  if (isPass) {
    passedTests++;
    console.log(`- Çalışan: Endpoint yanıt verdi ve format doğru.`);
  }
  if (error) {
    console.log(`- Çalışmayan: ${error}`);
  }
}

async function fetchNewsItem() {
   const { data } = await supabase.from('news_items').select('id, title, summary').order('fetched_at', { ascending: false }).limit(1);
   return data?.[0];
}

async function fetchLead() {
   const { data } = await supabase.from('leads').select('id, company_name, sector, city').limit(1);
   return data?.[0];
}

async function fetchCompetitor() {
   const { data } = await supabase.from('competitors').select('id, handle').limit(1);
   return data?.[0];
}

async function runTests() {
  console.log("=== GRAFİKcem NEWS AI OTOMATİK API TESTİ ===");

  const newsItem = await fetchNewsItem();
  const lead = await fetchLead();
  const competitor = await fetchCompetitor();

  // TEST 4: TWEET ÜRETİCİ
  if (newsItem) {
    try {
      const res = await fetch(`${API_BASE}/tweet/generate`, {
        method: 'POST', 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ news_id: newsItem.id })
      });
      const d = await res.json();
      logTest('4 — TWEET ÜRETİCİ', Array.isArray(d.options) && d.options.length > 0, d.error);
    } catch(e) { logTest('4 — TWEET ÜRETİCİ', false, e.message); }
  } else {
    logTest('4 — TWEET ÜRETİCİ', false, 'Haber bulunamadı');
  }

  // TEST 5: STORYBOARD STUDIO
  try {
    const res = await fetch(`${API_BASE}/storyboard/hook`, {
      method: 'POST', 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: 'Desk setup sinematik çekim', platform: '@grafikcem', format: 'Reel', tone: 'Merak' })
    });
    const d = await res.json();
    logTest('5 — STORYBOARD (HOOK)', Array.isArray(d.hooks) && d.hooks.length > 0, d.error);
  } catch(e) { logTest('5 — STORYBOARD (HOOK)', false, e.message); }

  try {
    const res = await fetch(`${API_BASE}/storyboard/scenes`, {
      method: 'POST', 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idea: 'AI araçlarını tanıtan desk setup videosu', format: 'Reel 30sn', location: 'Masa başı' })
    });
    const d = await res.json();
    logTest('5 — STORYBOARD (SCENES)', Array.isArray(d.scenes) && d.scenes.length > 0, d.error);
  } catch(e) { logTest('5 — STORYBOARD (SCENES)', false, e.message); }

  // TEST 7: HAFTALIK İÇERİK PLANI
  try {
    const res = await fetch(`${API_BASE}/content-plan/generate`, { method: 'POST' });
    const d = await res.json();
    // Check for either content_json or contents to be flexible
    const contents = d.content_json || d.contents;
    const isValid = !!contents && Array.isArray(contents) && contents.length > 0;
    logTest('7 — HAFTALIK İÇERİK PLANI', isValid, d.error || (isValid ? null : `İçerik listesi boş veya eksik. (Keys: ${Object.keys(d).join(', ')})`));
  } catch(e) { logTest('7 — HAFTALIK İÇERİK PLANI', false, e.message); }

  // TEST 8: LEAD AI, TEST 10: OUTREACH
  if (lead) {
     try {
        const res = await fetch(`${API_BASE}/leads/analyze`, {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ leadId: lead.id })
        });
        const d = await res.json();
        logTest('8 — LEAD AI ANALİZ', d.success === true, d.error);
     } catch(e) { logTest('8 — LEAD AI ANALİZ', false, e.message); }

     try {
        const res = await fetch(`${API_BASE}/leads/generate-outreach`, {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ leadId: lead.id, format: 'Instagram DM', language: 'Türkçe' })
        });
        const d = await res.json();
        logTest('10 — İLETİŞİM MERKEZİ (OUTREACH)', !!d.message_content, d.error);
     } catch(e) { logTest('10 — İLETİŞİM MERKEZİ (OUTREACH)', false, e.message); }
  }

  // TEST 11: RAKİP AI (No parameters needed)
  try {
     const res = await fetch(`${API_BASE}/competitors/analyze`, {
         method: 'POST',
         headers: { "Content-Type": "application/json" }
     });
     const d = await res.json();
     // Route returns { analysis: "..." }
     const isValid = !!d.analysis;
     logTest('11 — RAKİP TAKİP AI ANALİZ', isValid, d.error || (isValid ? null : "analiz metni boş"));
  } catch(e) { logTest('11 — RAKİP TAKİP AI ANALİZ', false, e.message); }

  // TEST 12: PROMPT STUDIO
  try {
    const res = await fetch(`${API_BASE}/prompt-studio/generate`, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: 'image_video', userInput: 'gece yarısı istanbul silueti sinematik' })
    });
    const d = await res.json();
    // Success returns variations array
    const isValid = !!d.variations && Array.isArray(d.variations);
    logTest('12 — PROMPT STUDIO', isValid, d.error || (isValid ? null : "variations eksik"));
  } catch(e) { logTest('12 — PROMPT STUDIO', false, e.message); }

  // TEST 14: QUOTE & REPLY
  if (newsItem) {
     try {
        const res = await fetch(`${API_BASE}/news/quote-reply`, {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ news_id: newsItem.id, format: 'Quote Tweet' })
        });
        const d = await res.json();
        // Route returns { content, hook_strength, reason, original }
        const isValid = !!d.content && !!d.hook_strength;
        logTest('14 — QUOTE & REPLY', isValid, d.error || (isValid ? null : "yanıt içeriği veya kanca gücü eksik"));
     } catch(e) { logTest('14 — QUOTE & REPLY', false, e.message); }
  }

  // TEST 15: KAYNAK RADARI
  try {
    const res = await fetch(`${API_BASE}/learning/find-resources`, { method: 'POST' });
    const d = await res.json();
    // Route returns { message, count }
    const isValid = res.ok && d.count > 0;
    logTest('15 — KAYNAK RADARI', isValid, d.error || (isValid ? null : "kaynak bulunamadı veya kaydedilemedi"));
  } catch(e) { logTest('15 — KAYNAK RADARI', false, e.message); }

  // TEST 16: DB KONTROLÜ
  try {
    const { data: prompts } = await supabase.from('prompts').select('id').limit(1);
    const { data: newsItems } = await supabase.from('news_items').select('id').limit(1);
    logTest('16 — GENEL SİSTEM (DB ROW CHECK)', !!prompts && !!newsItems);
  } catch(e) { logTest('16 — GENEL SİSTEM', false, e.message); }

  console.log(`\nGENEL SKOR: ${passedTests}/${totalTests} test geçti`);
}

runTests();
