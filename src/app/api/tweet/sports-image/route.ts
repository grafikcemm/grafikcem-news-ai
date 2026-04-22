import { NextRequest, NextResponse } from "next/server";
import { validateApiRequest, unauthorizedResponse } from "@/lib/auth";
import { GEMINI_FAST, generateWithGemini } from "@/lib/gemini";
import { parseAIJSON } from "@/lib/parse-ai";

export async function POST(request: NextRequest) {
  if (!validateApiRequest(request)) return unauthorizedResponse();

  try {
    const body = await request.json();
    const headline = typeof body.headline === "string" ? body.headline.trim() : "";
    const subjects = typeof body.subjects === "string" ? body.subjects.trim() : "";
    const theme = typeof body.theme === "string" ? body.theme.trim() : "Dramatik";

    if (!headline) {
      return NextResponse.json({ error: "headline required" }, { status: 400 });
    }

    const systemPrompt = `You create concise, production-ready sports image prompts.
Return only valid JSON in English.`;

    const prompt = `
Create a professional sports news image prompt for:
Headline: ${headline}
Teams/People: ${subjects || "Not specified"}
Theme: ${theme}

Generate JSON:
{
  "prompt": "Cinematic sports photography...",
  "negative_prompt": "...",
  "style": "...",
  "aspect_ratio": "16:9",
  "model_suggestion": "Ideogram / Midjourney"
}
    `.trim();

    const text = await generateWithGemini(prompt, "creative", systemPrompt, GEMINI_FAST);
    const parsed = parseAIJSON<Record<string, string>>(text);

    if (!parsed?.prompt) {
      return NextResponse.json({ error: "AI response could not be parsed" }, { status: 502 });
    }

    return NextResponse.json({ result: parsed });
  } catch (err) {
    console.error("[tweet/sports-image] error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
