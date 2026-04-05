import { NextRequest, NextResponse } from "next/server";


export async function POST(request: NextRequest) {
  try {
    const { data } = await request.json();

    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: "Analiz edilecek veri bulunamadı" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Anthropic API key not configured (ANTHROPIC_API_KEY)" }, { status: 500 });
    }


    const systemPrompt = "Sen bir sosyal medya analistsin.";
    const userPrompt = `Şu veriler var: ${JSON.stringify(data.slice(-20))}. 3 önemli içgörü ve 3 aksiyon önerisi ver. Türkçe, maddeler halinde, kısa ve net.`;

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

    return NextResponse.json({ analysis: text });
  } catch (err) {
    console.error("Analyze error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
