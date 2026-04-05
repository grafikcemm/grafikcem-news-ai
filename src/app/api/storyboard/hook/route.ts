import { NextRequest, NextResponse } from "next/server";
import { parseClaudeJSON } from "@/lib/parse-claude";
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, platform, format, tone } = body as { topic: string; platform: string; format: string; tone: string };

    if (!topic || !platform || !format || !tone) {
      return NextResponse.json({ error: "Eksik parametre" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Anthropic API key not configured (ANTHROPIC_API_KEY)" }, { status: 500 });
    }

    const systemPrompt = "Sen viral sosyal medya içerikleri için hook yazan bir uzman içerik stratejistsin.";
    const userPrompt = `İçerik: ${topic}, Platform: ${platform}, Format: ${format}, Ton: ${tone}. 3 farklı hook üret, her biri farklı psikolojik tetikleyici kullansın. SADECE JSON döndür, başka hiçbir şey yazma:
{
  "hooks": [
    { "text": "string", "type": "string", "why": "string" },
    { "text": "string", "type": "string", "why": "string" },
    { "text": "string", "type": "string", "why": "string" }
  ]
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
        max_tokens: 1024,
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
  } catch (err) {
    console.error("Hook generate error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
