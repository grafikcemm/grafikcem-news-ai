import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getModeConfig } from "@/lib/prompt-studio/modes.config";
import type { Mode } from "@/lib/prompt-studio/types";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
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

  const parsed = JSON.parse(text);

  return NextResponse.json({ mode, variations: parsed.variations });
}
