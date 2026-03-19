import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";
import { buildCoachSystemPrompt } from "@/lib/prompts";
import { validateApiRequest, unauthorizedResponse } from "@/lib/auth";

export async function POST(request: NextRequest) {
  if (!validateApiRequest(request)) return unauthorizedResponse();

  // Validate input before starting stream
  let messages: Array<{ role: "user" | "assistant"; content: string }>;
  try {
    const body = await request.json();
    messages = body.messages;
    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages required" }), { status: 400 });
    }
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400 });
  }

  // Load context before opening stream
  const [styleResult, tweetCountResult] = await Promise.all([
    supabaseAdmin.from("settings").select("value").eq("key", "style_profile").single(),
    supabaseAdmin
      .from("tweet_drafts")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved")
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const styleProfile = styleResult.data?.value
    ? JSON.stringify(styleResult.data.value)
    : "Henüz analiz edilmedi";
  const tweetCount = tweetCountResult.count || 0;
  const systemPrompt = buildCoachSystemPrompt(styleProfile, tweetCount, "AI araçları ve freelance ipuçları");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Anthropic API key not configured" }), { status: 500 });
  }
  const anthropic = new Anthropic({ apiKey });

  // All validation done — now open stream
  let stream: Awaited<ReturnType<typeof anthropic.messages.stream>>;
  try {
    stream = await anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
  } catch (err) {
    console.error("Coach stream init error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        console.error("Coach stream error:", err);
        // Signal stream end gracefully — client will see truncated response
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
