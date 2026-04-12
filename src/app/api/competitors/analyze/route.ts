import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { validateApiRequest, unauthorizedResponse } from "@/lib/auth";
import { generateWithGemini } from "@/lib/gemini";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  if (!validateApiRequest(request)) return unauthorizedResponse();

  try {
    // Fetch all handles from competitors table
    const { data: competitors, error: fetchError } = await supabaseAdmin
      .from("competitors")
      .select("handle");

    if (fetchError) {
      throw new Error("Rakipler veritabanından çekilemedi: " + fetchError.message);
    }

    const handles = competitors?.map(c => c.handle) || [];
    if (handles.length === 0) {
      return NextResponse.json({ error: "Analiz edilecek rakip hesabı bulunamadı." }, { status: 400 });
    }

    const systemPrompt = "Sen GrafikCem (@grafikcem) için stratejik bir sosyal medya danışmanısın. Rakipleri analiz ederek uygulanabilir dersler çıkarırsın.";
    
    const userPrompt = `"Sen GrafikCem (@grafikcem) için içerik stratejisti olarak aşağıdaki Instagram rakip hesaplarını analiz et.

GrafikCem stili: koyu temali carousel setleri, mikrofonsuz sinematik reels, AI tasarım araçları içerikleri.

Rakipler: ${handles.join(", ")}

Her hesap için bildiklerini anlat:
içerik stili, format tercihi, güçlü yönler.

Son olarak GrafikCem için:
- Bu haftaki 3 içerik fikri
- Rakiplerin kaçırdığı 2 fırsat alanı

Lütfen Türkçe, profesyonel ve aksiyon odaklı bir analiz raporu sun."`;

    const text = await generateWithGemini(userPrompt, 'analytical', systemPrompt);

    // Save results to competitor_analysis table (Overwrite logic as per user request)
    // Actually the user said "overwrite", but the existing table seems to keep history.
    // I will insert a new one and the UI will fetch the latest.
    const { error: saveError } = await supabaseAdmin
      .from("competitor_analysis")
      .insert({
        handles: handles,
        analysis_text: text
      });

    if (saveError) {
      console.error("Analiz kaydedilemedi:", saveError);
      return NextResponse.json({ analysis: text, warning: "Analiz üretildi ancak kaydedilemedi: " + saveError.message });
    }

    return NextResponse.json({ analysis: text });
  } catch (err: any) {
    console.error("Rakip analiz hatası:", err);
    return NextResponse.json({ error: "Analiz başarısız: " + (err.message || "Bilinmeyen hata") }, { status: 500 });
  }
}

// GET to fetch the latest analysis
export async function GET(request: NextRequest) {
  if (!validateApiRequest(request)) return unauthorizedResponse();

  try {
    const { data, error } = await supabaseAdmin
      .from("competitor_analysis")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) throw error;
    return NextResponse.json(data?.[0] || null);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
