import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { GRAFIKCEM_SYSTEM, buildGrafikcemUserPrompt } from "@/lib/prompts/grafikcem.prompt";
import { MASKULENKOD_SYSTEM, buildMaskulenkodUserPrompt, getNextCategory } from "@/lib/prompts/maskulenkod.prompt";
import { LINKEDIN_SYSTEM, buildLinkedInUserPrompt } from "@/lib/prompts/linkedin.prompt";
import { validateCronRequest, unauthorizedResponse } from "@/lib/auth";
import { parseAIJSON } from "@/lib/parse-ai";
import { generateWithGemini } from "@/lib/gemini";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}

async function handler(request: NextRequest) {
  if (!validateCronRequest(request)) return unauthorizedResponse();

  const results: Record<string, string> = {};

  // Fetch active channels
  const { data: channels } = await supabaseAdmin
    .from("channel_settings")
    .select("*")
    .eq("is_active", true);

  if (!channels?.length) {
    return NextResponse.json({ message: "No active channels" });
  }

  // Get top news from last 7 days
  const yesterday = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
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

        const text = await generateWithGemini(userPrompt, 'creative', GRAFIKCEM_SYSTEM);
        const parsed = parseAIJSON<any>(text);

        if (parsed) {

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

        const userPrompt = buildMaskulenkodUserPrompt(category, inspiration);
        const text = await generateWithGemini(userPrompt, 'creative', MASKULENKOD_SYSTEM);
        const parsed = parseAIJSON<any>(text);

        if (parsed) {

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

        const text = await generateWithGemini(userPrompt, 'creative', LINKEDIN_SYSTEM);
        const parsed = parseAIJSON<any>(text);

        if (parsed) {

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
