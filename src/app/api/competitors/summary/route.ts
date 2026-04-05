import { NextRequest, NextResponse } from "next/server";
import { validateApiRequest, unauthorizedResponse } from "@/lib/auth";

export async function POST(request: NextRequest) {
  if (!validateApiRequest(request)) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { competitors } = body as { competitors: any[] };

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 });
    }
    
    const systemPrompt = "Sen bir sosyal medya stratejistisin.";
    const competitorsStr = competitors.map((c: any) => `${c.handle} (${c.trend}) - Format: ${c.last_format} - Not: ${c.notes}`).join('\n');
    
    const userPrompt = `Aşağıda sektördeki güncel rakip verileri bulunmaktadır:\n${competitorsStr}\n\nBu verilere göre: Bu hafta hangi rakipler öne çıktı, hangi formatlar trend, biz ne yapmalıyız şeklinde bir özet üret. Kısa, net ve stratejik olsun.`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
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
    const text = response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ summary: text });
  } catch (err: any) {
    console.error("Summary error:", err);
    return NextResponse.json({ error: "Internal server error: " + (err.message || "") }, { status: 500 });
  }
}
