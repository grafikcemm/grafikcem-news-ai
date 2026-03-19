import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";
import { GRAFIKCEM_SYSTEM, buildGrafikcemUserPrompt } from "@/lib/prompts/grafikcem.prompt";
import { MASKULENKOD_SYSTEM, buildMaskulenkodUserPrompt, getNextCategory } from "@/lib/prompts/maskulenkod.prompt";
import { LINKEDIN_SYSTEM, buildLinkedInUserPrompt } from "@/lib/prompts/linkedin.prompt";
import { validateCronRequest, unauthorizedResponse } from "@/lib/auth";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}

async function handler(request: NextRequest) {
  if (!validateCronRequest(request)) return unauthorizedResponse();

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const results: Record<string, string> = {};

  // Fetch active channels
  const { data: channels } = await supabaseAdmin
    .from("channel_settings")
    .select("*")
    .eq("is_active", true);

  if (!channels?.length) {
    return NextResponse.json({ message: "No active channels" });
  }

  // Get top news from last 24h for grafikcem + linkedin
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: topNews } = await supabaseAdmin
    .from("news_items")
    .select("id, title, summary, sources(name), category, viral_score, used_by")
    .gte("fetched_at", yesterday)
    .gt("viral_score", 0)
    .order("viral_score", { ascending: false })
    .limit(20);

  for (const channel of channels) {
    try {
      if (channel.channel_id === "grafikcem") {
        const news = topNews?.find((n) => !n.used_by?.includes("grafikcem"));
        if (!news) { results.grafikcem = "no_news"; continue; }

        const raw = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 512,
          system: GRAFIKCEM_SYSTEM,
          messages: [{ role: "user", content: buildGrafikcemUserPrompt({
            title: news.title,
            summary: news.summary || "",
            source: (news.sources as unknown as { name: string } | null)?.name,
            category: news.category,
          }) }],
        });

        const text = (raw.content[0].type === "text" ? raw.content[0].text : "")
          .replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
        const parsed = JSON.parse(text);

        await supabaseAdmin.from("generated_content").insert({
          channel: "grafikcem",
          content: parsed.content,
          content_category: parsed.pattern_used || null,
          news_item_id: news.id,
        });

        // Mark news as used by grafikcem
        const currentUsedBy: string[] = news.used_by || [];
        await supabaseAdmin.from("news_items").update({
          used_by: [...currentUsedBy, "grafikcem"],
        }).eq("id", news.id);

        results.grafikcem = "ok";
      }

      if (channel.channel_id === "maskulenkod") {
        const category = getNextCategory(channel.last_post_category);
        // Use top news as optional inspiration
        const inspiration = topNews?.[0]?.title
          ? `${topNews[0].title} — ${topNews[0].summary?.substring(0, 150)}`
          : undefined;

        const raw = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 512,
          system: MASKULENKOD_SYSTEM,
          messages: [{ role: "user", content: buildMaskulenkodUserPrompt(category, inspiration) }],
        });

        const text = (raw.content[0].type === "text" ? raw.content[0].text : "")
          .replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
        const parsed = JSON.parse(text);

        await supabaseAdmin.from("generated_content").insert({
          channel: "maskulenkod",
          content: parsed.content,
          content_category: category,
        });

        // Update last_post_category
        await supabaseAdmin.from("channel_settings")
          .update({ last_post_category: category, updated_at: new Date().toISOString() })
          .eq("channel_id", "maskulenkod");

        results.maskulenkod = "ok";
      }

      if (channel.channel_id === "linkedin") {
        const news = topNews?.find((n) => !n.used_by?.includes("linkedin"));
        if (!news) { results.linkedin = "no_news"; continue; }

        const raw = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          system: LINKEDIN_SYSTEM,
          messages: [{ role: "user", content: buildLinkedInUserPrompt({
            title: news.title,
            summary: news.summary || "",
            source: (news.sources as unknown as { name: string } | null)?.name,
            category: news.category,
          }) }],
        });

        const text = (raw.content[0].type === "text" ? raw.content[0].text : "")
          .replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
        const parsed = JSON.parse(text);

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
    } catch (err) {
      console.error(`[generate] Channel ${channel.channel_id} error:`, err);
      results[channel.channel_id] = "error";
    }
  }

  return NextResponse.json({ message: "Generate complete", results });
}
