import { NextRequest, NextResponse } from "next/server";
import { validateApiRequest, unauthorizedResponse } from "@/lib/auth";
import { genAI, GEMINI_FAST } from "@/lib/gemini";
import { clampText } from "@/lib/tweet-engine";

export const maxDuration = 60;

interface SearchSource {
  title: string;
  url: string;
  snippet: string;
}

export async function POST(request: NextRequest) {
  if (!validateApiRequest(request)) return unauthorizedResponse();

  try {
    const body = await request.json();
    const query = typeof body.query === "string" ? body.query.trim() : "";

    if (!query) {
      return NextResponse.json({ error: "query required" }, { status: 400 });
    }

    const completion = await genAI.chat.completions.create({
      model: GEMINI_FAST,
      messages: [
        { role: "system", content: "You are a helpful assistant providing a brief summary of information. If asked about real-time info, provide what you know." },
        { role: "user", content: query }
      ],
      max_tokens: 500,
    });

    const text = completion.choices[0]?.message?.content ?? "";
    const summary = clampText(text, 300);
    
    // Fallback empty sources since DeepSeek doesn't natively return Google Search grounding metadata
    const sources: SearchSource[] = [];

    const webContext = clampText(summary, 300);

    return NextResponse.json({
      summary,
      sources,
      totalSources: sources.length,
      webSearchQueries: [query],
      webContext,
    });
  } catch (err) {
    console.error("[tweet/web-search] error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
