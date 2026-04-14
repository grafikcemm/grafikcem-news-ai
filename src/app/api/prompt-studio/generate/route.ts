import { NextRequest, NextResponse } from "next/server";
import { getModeConfig } from "@/lib/prompt-studio/modes.config";
import type { Mode } from "@/lib/prompt-studio/types";
import { validateApiRequest, unauthorizedResponse } from "@/lib/auth";
import { generateWithGemini } from "@/lib/gemini";
import { parseAIJSON } from "@/lib/parse-ai";

export const maxDuration = 60;

// In-memory rate limiter
const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 10;
  const requests = (rateLimitMap.get(ip) || []).filter((t) => now - t < windowMs);
  if (requests.length >= maxRequests) return false;
  requests.push(now);
  rateLimitMap.set(ip, requests);
  return true;
}

export async function POST(request: NextRequest) {
  if (!validateApiRequest(request)) return unauthorizedResponse();

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Çok fazla istek. 1 dakika bekle." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { userInput, mode } = body as { userInput: string; mode: Mode };

    if (!userInput?.trim()) {
      return NextResponse.json({ error: "userInput is required" }, { status: 400 });
    }

    const systemPrompt = `You are an expert AI image and video prompt engineer.
You create highly detailed, structured prompts in JSON format.
Always respond in English. Never use Turkish in prompts.
Output ONLY valid JSON, nothing else.`;

    const userPromptTemplate = `Create a professional AI generation prompt for the following idea:
Idea: ${userInput}

Respond with ONLY this JSON structure, no other text:
{
  "prompt": "Main prompt text — detailed, cinematic, technical. Start with subject, then style, lighting, camera, mood.",
  "negative_prompt": "What to avoid — list of negative elements",
  "style": "photorealistic / cinematic / illustration / 3d render / etc",
  "aspect_ratio": "16:9 / 9:16 / 1:1 / etc",
  "lighting": "Lighting description",
  "camera": "Camera angle and lens description",
  "mood": "Overall mood and atmosphere",
  "model_suggestion": "Best AI model for this: Midjourney / Sora / Kling / Ideogram / Stable Diffusion"
}`;

    const text = await generateWithGemini(userPromptTemplate, 'creative', systemPrompt);

    const jsonParsed = parseAIJSON<any>(text);
    if (!jsonParsed || !jsonParsed.prompt) {
      console.error("[prompt-studio] Invalid JSON from Gemini:", text.slice(0, 400));
      return NextResponse.json(
        { error: "AI yanıtı parse edilemedi. Tekrar deneyin." },
        { status: 502 }
      );
    }

    return NextResponse.json({ result: jsonParsed });
  } catch (err: any) {
    console.error("[prompt-studio] generate error:", err);
    return NextResponse.json({ error: "Internal server error: " + (err.message || "") }, { status: 500 });
  }
}
