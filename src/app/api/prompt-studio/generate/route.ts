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

    const modeConfig = getModeConfig(mode);
    if (!modeConfig) {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }

    const text = await generateWithGemini(userInput, 'creative', modeConfig.systemPrompt);

    let parsed: { variations: unknown[] };
    const jsonParsed = parseAIJSON<any>(text);
    if (!jsonParsed) {
      console.error("[prompt-studio] Invalid JSON from Gemini:", text.slice(0, 400));
      return NextResponse.json(
        { error: "AI yanıtı parse edilemedi. Tekrar deneyin." },
        { status: 502 }
      );
    }
    parsed = jsonParsed;

    return NextResponse.json({ mode, variations: parsed.variations });
  } catch (err: any) {
    console.error("[prompt-studio] generate error:", err);
    return NextResponse.json({ error: "Internal server error: " + (err.message || "") }, { status: 500 });
  }
}
