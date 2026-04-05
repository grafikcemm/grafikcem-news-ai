import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { GRAFIKCEM_SYSTEM, buildGrafikcemUserPrompt } from "@/lib/prompts/grafikcem.prompt";
import { MASKULENKOD_SYSTEM, buildMaskulenkodUserPrompt, getNextCategory } from "@/lib/prompts/maskulenkod.prompt";
import { LINKEDIN_SYSTEM, buildLinkedInUserPrompt } from "@/lib/prompts/linkedin.prompt";
import { validateCronRequest, unauthorizedResponse } from "@/lib/auth";
import { parseClaudeJSON } from "@/lib/parse-claude";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}

async function handler(request: NextRequest) {
  if (!validateCronRequest(request)) return unauthorizedResponse();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[cron/generate] ANTHROPIC_API_KEY is missing");
    return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 });
  }

  const results: Record<string, string> = {};

  // Fetch active channels
  const { data: channels } = await supabaseAdmin
    .from("channel_settings")
    .select("*")
    .eq("is_active", true);

  if (!channels?.length) {
    return NextResponse.json({ message: "No active channels" });
  }

  // Get top news from last 24h
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: topNews } = await supabaseAdmin
    .from("news_items")
    .select("id, title, summary, sources(name), category, viral_score, used_by")
    .gte("fetched_at", yesterday)
    .gt("viral_score", 0)
    .order("viral_score", { ascending: false })
    .limit(20);

  const items = topNews || [];

  for (const channel of channels) {
    try {
      if (channel.channel_id === "grafikcem") {
        const news = items.find((n) => !n.used_by?.includes("grafikcem"));
        if (!news) { results.grafikcem = "no_news"; continue; }

        const sourceName = (news.sources as any)?.name || "Unknown";
        const userPrompt = buildGrafikcemUserPrompt({
          title: news.title,
          summary: news.summary || "",
          source: sourceName,
          category: news.category,
        });

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
            system: GRAFIKCEM_SYSTEM,
            messages: [{ role: "user", content: userPrompt }],
          }),
        });

        if (anthropicRes.ok) {
          const response = await anthropicRes.json();
          const rawText = response.content[0].type === "text" ? response.content[0].text : "";
          const parsed = parseClaudeJSON<any>(rawText);

          await supabaseAdmin.from("generated_content").insert({
            channel: "grafikcem",
            content: parsed.content,
            content_category: parsed.pattern_used || null,
            news_item_id: news.id,
          });

          const currentUsedBy: string[] = news.used_by || [];
          await supabaseAdmin.from("news_items").update({
            used_by: [...currentUsedBy, "grafikcem"],
          }).eq("id", news.id);

          results.grafikcem = "ok";
        }
      }

      if (channel.channel_id === "maskulenkod") {
        const category = getNextCategory(channel.last_post_category);
        const inspiration = items[0]?.title
          ? `${items[0].title} — ${items[0].summary?.substring(0, 150)}`
          : undefined;

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
            system: MASKULENKOD_SYSTEM,
            messages: [{ role: "user", content: buildMaskulenkodUserPrompt(category, inspiration) }],
          }),
        });

        if (anthropicRes.ok) {
          const response = await anthropicRes.json();
          const rawText = response.content[0].type === "text" ? response.content[0].text : "";
          const parsed = parseClaudeJSON<any>(rawText);

          await supabaseAdmin.from("generated_content").insert({
            channel: "maskulenkod",
            content: parsed.content,
            content_category: category,
          });

          await supabaseAdmin.from("channel_settings")
            .update({ last_post_category: category, updated_at: new Date().toISOString() })
            .eq("channel_id", "maskulenkod");

          results.maskulenkod = "ok";
        }
      }

      if (channel.channel_id === "linkedin") {
        const news = items.find((n) => !n.used_by?.includes("linkedin"));
        if (!news) { results.linkedin = "no_news"; continue; }

        const sourceName = (news.sources as any)?.name || "Unknown";
        const userPrompt = buildLinkedInUserPrompt({
          title: news.title,
          summary: news.summary || "",
          source: sourceName,
          category: news.category,
        });

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
            system: LINKEDIN_SYSTEM,
            messages: [{ role: "user", content: userPrompt }],
          }),
        });

        if (anthropicRes.ok) {
          const response = await anthropicRes.json();
          const rawText = response.content[0].type === "text" ? response.content[0].text : "";
          const parsed = parseClaudeJSON<any>(rawText);

          await supabaseAdmin.from("generated_content").insert({
            channel: "linkedin",
            content: parsed.content,
            linkedin_format: parsed.linkedin_format || null,
            news_item_id: news.id,
          });

          const currentUsedBy: string[] = news.used_by || [];
          await supabaseAdmin.from("news_items").update({
            used_by: [...currentUsedBy, "linkedin"],
          }).eq("id", news.id);

          results.linkedin = "ok";
        }
      }
    } catch (err) {
      console.error(`[generate] Channel ${channel.channel_id} error:`, err);
      results[channel.channel_id] = "error";
    }
  }

  return NextResponse.json({ message: "Generate complete", results });
}
