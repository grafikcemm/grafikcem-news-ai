import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { generateWithGemini } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const { message, leadContext = [] } = await req.json();

    // Fetch stats for context
    const { data: leads, error } = await supabase.from("leads").select("business_name, status, potential_score, city, sector");
    
    if (error) throw error;

    const total = leads.length;
    const stats = {
      new: leads.filter(l => ['discovered', 'researched'].includes(l.status)).length,
      contacted: leads.filter(l => l.status === 'contacted').length,
      won: leads.filter(l => l.status === 'won').length,
      lost: leads.filter(l => l.status === 'lost').length,
      avg_score: Math.round(leads.reduce((acc, curr) => acc + (curr.potential_score || 0), 0) / (total || 1)),
    };

    const topLeads = leads
      .sort((a, b) => (b.potential_score || 0) - (a.potential_score || 0))
      .slice(0, 5)
      .map(l => `${l.business_name} (${l.city}, ${l.potential_score}pt)`)
      .join(", ");

    const systemPrompt = `
      Sen GrafikCem Lead Sistemi'nin AI asistanısın. Adın JARVIS.
      GrafikCem İstanbul merkezli freelance grafik tasarım stüdyosu.
      Hizmetler: Logo, Sosyal Medya, Web Tasarımı, AI Görseller.
      Türkçe yanıtla. Kısa, net, aksiyonel yanıtlar ver.
      Teknik detay yerine pratik öneri ver.
      Yanıtlar max 3 cümle olsun.

      Mevcut lead verileri:
      Toplam lead: ${total}
      Stats: New: ${stats.new} | Contacted: ${stats.contacted} | Won: ${stats.won}
      Ortalama Skor: ${stats.avg_score}
      En yüksek skorlu leadler: ${topLeads}

      Eğer kullanıcı "tara", "bul" veya "araştır" gibi bir komut verirse (örn: "İstanbul'da güzellik salonlarını tara"), yanıtın sonunda mutlaka şu JSON formatını ekle:
      {"action": "scan", "sector": "sektör_adı", "city": "şehir_adı"}
      Sektör adı şunlardan biri olmalı: guzellik, moda, emlak, spor, egitim.
    `;

    const reply = await generateWithGemini(message, 'analytical', systemPrompt);

    // Parse action if present
    let finalReply = reply;
    let action = null;
    let sector = null;
    let city = null;

    try {
      const jsonMatch = reply.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
         const parsed = JSON.parse(jsonMatch[0]);
         if (parsed.action === 'scan') {
           action = 'scan';
           sector = parsed.sector;
           city = parsed.city;
           finalReply = reply.replace(jsonMatch[0], '').trim();
         }
      }
    } catch (e) {
      // Failed to parse action, just send plain text
    }

    return NextResponse.json({ 
      reply: finalReply,
      action,
      sector,
      city
    });

  } catch (error: any) {
    console.error("Jarvis API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
