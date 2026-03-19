import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getModeConfig } from "@/lib/prompt-studio/modes.config";
import type { Mode } from "@/lib/prompt-studio/types";
import { validateApiRequest, unauthorizedResponse } from "@/lib/auth";

export const maxDuration = 60;

// In-memory rate limiter (resets on cold start — acceptable for personal tool)
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

  const body = await request.json();
  const { userInput, mode } = body as { userInput: string; mode: Mode };

  if (!userInput?.trim()) {
    return NextResponse.json({ error: "userInput is required" }, { status: 400 });
  }

  const modeConfig = getModeConfig(mode);
  if (!modeConfig) {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const raw = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: modeConfig.systemPrompt,
    messages: [{ role: "user", content: userInput.trim() }],
  });

  const text = (raw.content[0].type === "text" ? raw.content[0].text : "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: { variations: unknown[] };
  try {
    parsed = JSON.parse(text);
  } catch {
    console.error("[prompt-studio] Invalid JSON from Claude:", text.slice(0, 400));
    return NextResponse.json(
      { error: "AI yanıtı parse edilemedi. Tekrar deneyin." },
      { status: 502 }
    );
  }

  return NextResponse.json({ mode, variations: parsed.variations });
}
