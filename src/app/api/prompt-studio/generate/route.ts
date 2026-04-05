import { NextRequest, NextResponse } from "next/server";
import { getModeConfig } from "@/lib/prompt-studio/modes.config";
import type { Mode } from "@/lib/prompt-studio/types";
import { validateApiRequest, unauthorizedResponse } from "@/lib/auth";
import { parseClaudeJSON } from "@/lib/parse-claude";

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

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 });
    }

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 2000,
        system: modeConfig.systemPrompt,
        messages: [{ role: "user", content: userInput }],
      }),
    });

    if (!anthropicRes.ok) {
      const errorText = await anthropicRes.text();
      console.error("Claude API Error Status:", anthropicRes.status, errorText);
      throw new Error(`Claude API Error: ${anthropicRes.status}`);
    }

    const raw = await anthropicRes.json();
    const text = (raw.content[0].type === "text" ? raw.content[0].text : "")
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed: { variations: unknown[] };
    try {
      parsed = parseClaudeJSON<any>(text);
    } catch {
      console.error("[prompt-studio] Invalid JSON from Claude:", text.slice(0, 400));
      return NextResponse.json(
        { error: "AI yanıtı parse edilemedi. Tekrar deneyin." },
        { status: 502 }
      );
    }

    return NextResponse.json({ mode, variations: parsed.variations });
  } catch (err) {
    console.error("[prompt-studio] generate error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
