import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { GRAFIKCEM_SYSTEM, buildGrafikcemUserPrompt } from "@/lib/prompts/grafikcem.prompt";
import { MASKULENKOD_SYSTEM, buildMaskulenkodUserPrompt, getNextCategory } from "@/lib/prompts/maskulenkod.prompt";
import { LINKEDIN_SYSTEM, buildLinkedInUserPrompt } from "@/lib/prompts/linkedin.prompt";
import { validateApiRequest, unauthorizedResponse } from "@/lib/auth";
import { parseClaudeJSON } from "@/lib/parse-claude";

export const maxDuration = 30;

function getSourceName(sources: any): string | undefined {
  if (!sources) return undefined;
  if (Array.isArray(sources)) return (sources[0] as { name?: string })?.name;
  return (sources as { name?: string })?.name;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  if (!validateApiRequest(request)) return unauthorizedResponse();

  const { channelId } = await params;
  const validChannels = ["grafikcem", "maskulenkod", "linkedin"];
  if (!validChannels.includes(channelId)) {
    return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 });
  }

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

      const items = news || [];
      const unusedNews = items.find((n) => !n.used_by?.includes(channelId));
      
      if (!unusedNews) {
        return NextResponse.json({ error: "No unused news in last 24h. Fetch news first." }, { status: 422 });
      }

      const system = channelId === "grafikcem" ? GRAFIKCEM_SYSTEM : LINKEDIN_SYSTEM;
      const sourceName = getSourceName(unusedNews.sources);
      const userPrompt = channelId === "grafikcem"
        ? buildGrafikcemUserPrompt({
            title: unusedNews.title,
            summary: unusedNews.summary || "",
            source: sourceName,
            category: unusedNews.category,
          })
        : buildLinkedInUserPrompt({
            title: unusedNews.title,
            summary: unusedNews.summary || "",
            source: sourceName,
            category: unusedNews.category,
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
          system: system,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });

      if (!anthropicRes.ok) {
        const errorText = await anthropicRes.text();
        console.error("Claude API Error Status:", anthropicRes.status, errorText);
        throw new Error(`Claude API Error: ${anthropicRes.status}`);
      }

      const response = await anthropicRes.json();
      const rawText = response.content[0].type === "text" ? response.content[0].text : "";
      const text = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

      let parsed: { content: string; pattern_used?: string; linkedin_format?: string };
      try {
        parsed = parseClaudeJSON<any>(text);
      } catch {
        console.error(`[channels/${channelId}/generate] Invalid JSON:`, text.slice(0, 300));
        return NextResponse.json({ error: "AI returned invalid response" }, { status: 502 });
      }

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

      const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 512,
          system: MASKULENKOD_SYSTEM,
          messages: [{ role: "user", content: buildMaskulenkodUserPrompt(category, inspiration) }],
        }),
      });

      if (!anthropicRes.ok) {
        const errorText = await anthropicRes.text();
        console.error("Claude API Error Status:", anthropicRes.status, errorText);
        throw new Error(`Claude API Error: ${anthropicRes.status}`);
      }

      const response = await anthropicRes.json();
      const rawText = response.content[0].type === "text" ? response.content[0].text : "";
      const text = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

      let parsed: { content: string };
      try {
        parsed = parseClaudeJSON<any>(text);
      } catch {
        console.error(`[channels/maskulenkod/generate] Invalid JSON:`, text.slice(0, 300));
        return NextResponse.json({ error: "AI returned invalid response" }, { status: 502 });
      }

      const { data: record, error } = await supabaseAdmin
        .from("generated_content")
        .insert({ channel: "maskulenkod", content: parsed.content, content_category: category })
        .select()
        .single();

      if (error) throw error;

      await supabaseAdmin.from("channel_settings")
        .update({ last_post_category: category, updated_at: new Date().toISOString() })
        .eq("channel_id", "maskulenkod");

      return NextResponse.json({ content: record });
    }
  } catch (err: any) {
    console.error(`[channels/${channelId}/generate] error:`, err);
    return NextResponse.json({ error: "Generation failed: " + (err.message || "") }, { status: 500 });
  }
}
