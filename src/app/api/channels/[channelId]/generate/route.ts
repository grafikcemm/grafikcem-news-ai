import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";
import { GRAFIKCEM_SYSTEM, buildGrafikcemUserPrompt } from "@/lib/prompts/grafikcem.prompt";
import { MASKULENKOD_SYSTEM, buildMaskulenkodUserPrompt, getNextCategory } from "@/lib/prompts/maskulenkod.prompt";
import { LINKEDIN_SYSTEM, buildLinkedInUserPrompt } from "@/lib/prompts/linkedin.prompt";

export const maxDuration = 30;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const { channelId } = await params;
  const validChannels = ["grafikcem", "maskulenkod", "linkedin"];
  if (!validChannels.includes(channelId)) {
    return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  try {
    if (channelId === "grafikcem" || channelId === "linkedin") {
      const { data: news } = await supabaseAdmin
        .from("news_items")
        .select("id, title, summary, sources(name), category, viral_score, used_by")
        .gte("fetched_at", yesterday)
        .gt("viral_score", 0)
        .order("viral_score", { ascending: false })
        .limit(20);

      const unusedNews = news?.find((n) => !n.used_by?.includes(channelId));
      if (!unusedNews) {
        return NextResponse.json({ error: "No unused news in last 24h. Fetch news first." }, { status: 422 });
      }

      const system = channelId === "grafikcem" ? GRAFIKCEM_SYSTEM : LINKEDIN_SYSTEM;
      const userPrompt = channelId === "grafikcem"
        ? buildGrafikcemUserPrompt({
            title: unusedNews.title,
            summary: unusedNews.summary || "",
            source: (unusedNews.sources as unknown as { name: string } | null)?.name,
            category: unusedNews.category,
          })
        : buildLinkedInUserPrompt({
            title: unusedNews.title,
            summary: unusedNews.summary || "",
            source: (unusedNews.sources as unknown as { name: string } | null)?.name,
            category: unusedNews.category,
          });

      const raw = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: channelId === "linkedin" ? 1024 : 512,
        system,
        messages: [{ role: "user", content: userPrompt }],
      });

      const text = (raw.content[0].type === "text" ? raw.content[0].text : "")
        .replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      const parsed = JSON.parse(text);

      const { data: record, error } = await supabaseAdmin
        .from("generated_content")
        .insert({
          channel: channelId,
          content: parsed.content,
          content_category: parsed.pattern_used || null,
          linkedin_format: parsed.linkedin_format || null,
          news_item_id: unusedNews.id,
        })
        .select()
        .single();

      if (error) throw error;

      const currentUsedBy: string[] = unusedNews.used_by || [];
      await supabaseAdmin.from("news_items").update({
        used_by: [...currentUsedBy, channelId],
      }).eq("id", unusedNews.id);

      return NextResponse.json({ content: record });
    }

    if (channelId === "maskulenkod") {
      const { data: channelSettings } = await supabaseAdmin
        .from("channel_settings")
        .select("last_post_category")
        .eq("channel_id", "maskulenkod")
        .single();

      const category = getNextCategory(channelSettings?.last_post_category || null);

      // Optional AI news inspiration
      const { data: topNews } = await supabaseAdmin
        .from("news_items")
        .select("title, summary")
        .gte("fetched_at", yesterday)
        .gt("viral_score", 0)
        .order("viral_score", { ascending: false })
        .limit(1)
        .single();

      const inspiration = topNews
        ? `${topNews.title} — ${topNews.summary?.substring(0, 150)}`
        : undefined;

      const raw = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        system: MASKULENKOD_SYSTEM,
        messages: [{ role: "user", content: buildMaskulenkodUserPrompt(category, inspiration) }],
      });

      const text = (raw.content[0].type === "text" ? raw.content[0].text : "")
        .replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      const parsed = JSON.parse(text);

      const { data: record, error } = await supabaseAdmin
        .from("generated_content")
        .insert({
          channel: "maskulenkod",
          content: parsed.content,
          content_category: category,
        })
        .select()
        .single();

      if (error) throw error;

      await supabaseAdmin.from("channel_settings")
        .update({ last_post_category: category, updated_at: new Date().toISOString() })
        .eq("channel_id", "maskulenkod");

      return NextResponse.json({ content: record });
    }
  } catch (err) {
    console.error(`[channels/${channelId}/generate] error:`, err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
