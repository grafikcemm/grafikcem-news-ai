import { NextRequest, NextResponse } from "next/server";

import { parseClaudeJSON } from "@/lib/parse-claude";
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idea, format, location } = body as { idea: string; format: string; location: string };

    if (!idea || !format || !location) {
      return NextResponse.json({ error: "Eksik parametre" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 });
    }
    
    const systemPrompt = "Sen iPhone 16 Pro Max ile profesyonel sosyal medya içerikleri çeken bir sinematografi uzmanısın. Mikrofon kullanılmıyor, ses sonradan ekleniyor.";
    const userPrompt = `İçerik: ${idea}, Format: ${format}, Yer: ${location}. 6 sahnelik detaylı storyboard oluştur. SADECE JSON döndür:
{
  "title": "string",
  "total_duration": "string",
  "scenes": [
    {
      "scene_number": 1,
      "duration": "string",
      "description": "string",
      "angle": "string",
      "movement": "string",
      "lighting": "string",
      "iphone_tip": "string"
    }
  ],
  "general_tips": {
    "microphone_note": "string",
    "stabilization": "string",
    "settings": "string",
    "editing_note": "string"
  }
}`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const errorText = await anthropicRes.text();
      console.error("Claude API Error Status:", anthropicRes.status, errorText);
      throw new Error(`Claude API Error: ${anthropicRes.status}`);
    }

    const response = await anthropicRes.json();
    const rawText = response.content[0].type === "text" ? response.content[0].text : "";
    const text = rawText.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

    let parsed;
    try {
      parsed = parseClaudeJSON<any>(text);
    } catch {
      console.error("Claude JSON Parse Error:", text);
      return NextResponse.json({ error: "AI geçersiz format döndürdü" }, { status: 500 });
    }

    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error("Storyboard generate error:", err);
    return NextResponse.json({ error: `Storyboard oluşturma hatası: ${err.message || 'Bilinmeyen hata'}` }, { status: 500 });
  }
}
