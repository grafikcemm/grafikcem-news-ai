import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";
import {
  FULL_ARTICLE_TRANSLATE_SYSTEM_PROMPT,
  buildFullArticleTranslatePrompt,
} from "@/lib/prompts";
import { validateApiRequest, unauthorizedResponse } from "@/lib/auth";

// Allowed domains for article fetching (SSRF protection)
const ALLOWED_DOMAINS = [
  "techcrunch.com",
  "theverge.com",
  "wired.com",
  "arstechnica.com",
  "thenextweb.com",
  "venturebeat.com",
  "producthunt.com",
  "latent.space",
  "simonwillison.net",
  "openai.com",
  "anthropic.com",
  "huggingface.co",
  "towardsdatascience.com",
  "medium.com",
  "substack.com",
  "bloomberg.com",
  "reuters.com",
  "forbes.com",
  "businessinsider.com",
  "wsj.com",
  "nytimes.com",
  "bbc.com",
  "cnn.com",
  "apnews.com",
];

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    return ALLOWED_DOMAINS.some((domain) => parsed.hostname.endsWith(domain));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!validateApiRequest(request)) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { news_id } = body as { news_id: string };

    if (!news_id) {
      return NextResponse.json({ error: "news_id required" }, { status: 400 });
    }

    // Fetch news item with source
    const { data: newsItem, error } = await supabaseAdmin
      .from("news_items")
      .select("*, sources(name)")
      .eq("id", news_id)
      .single();

    if (error || !newsItem) {
      return NextResponse.json({ error: "News item not found" }, { status: 404 });
    }

    const sourceName = (newsItem.sources as { name: string } | null)?.name || "Unknown";

    // If full_summary_tr already exists, return cached data
    if (newsItem.full_summary_tr) {
      return NextResponse.json({
        id: newsItem.id,
        title: newsItem.title,
        title_tr: newsItem.title_tr || newsItem.title,
        title_original: newsItem.title_original || newsItem.title,
        full_summary_tr: newsItem.full_summary_tr,
        summary: newsItem.summary,
        url: newsItem.url,
        source_name: sourceName,
        fetched_at: newsItem.fetched_at,
        viral_score: newsItem.viral_score,
        viral_reason: newsItem.viral_reason,
        category: newsItem.category,
      });
    }

    // Fetch original article content (only from allowed domains)
    let articleContent = newsItem.summary || "";
    if (isAllowedUrl(newsItem.url)) {
      try {
        const res = await fetch(newsItem.url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; GrafikCemBot/1.0)" },
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          const html = await res.text();
          articleContent = html
            .replace(/<script[\s\S]*?<\/script>/gi, "")
            .replace(/<style[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/\s+/g, " ")
            .trim()
            .substring(0, 8000);
        }
      } catch (fetchErr) {
        console.error("Failed to fetch original article:", fetchErr);
      }
    } else {
      console.warn(`[article] Blocked URL (not in allowlist): ${newsItem.url}`);
    }

    // Call Claude for translation
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 });
    }
    const anthropic = new Anthropic({ apiKey });

    const claudeResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: FULL_ARTICLE_TRANSLATE_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildFullArticleTranslatePrompt({
            title: newsItem.title,
            content: articleContent,
            url: newsItem.url,
            source_name: sourceName,
          }),
        },
      ],
    });

    const rawText =
      claudeResponse.content[0].type === "text" ? claudeResponse.content[0].text : "";
    const text = rawText.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

    let parsed: { title_tr: string; full_summary_tr: string };
    try {
      parsed = JSON.parse(text);
    } catch {
      console.error("Claude returned invalid JSON for article translation:", rawText);
      return NextResponse.json({ error: "AI returned invalid response" }, { status: 500 });
    }

    // Save to database
    const updateData: Record<string, string> = {
      full_summary_tr: parsed.full_summary_tr,
      title_original: newsItem.title,
    };
    if (parsed.title_tr) updateData.title_tr = parsed.title_tr;

    await supabaseAdmin.from("news_items").update(updateData).eq("id", news_id);

    return NextResponse.json({
      id: newsItem.id,
      title: newsItem.title,
      title_tr: parsed.title_tr || newsItem.title_tr || newsItem.title,
      title_original: newsItem.title,
      full_summary_tr: parsed.full_summary_tr,
      summary: newsItem.summary,
      url: newsItem.url,
      source_name: sourceName,
      published_at: newsItem.published_at,
      viral_score: newsItem.viral_score,
      viral_reason: newsItem.viral_reason,
      category: newsItem.category,
    });
  } catch (err) {
    console.error("Article API error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    const isCreditError = msg.includes("credit balance");
    return NextResponse.json(
      { error: isCreditError ? "API kredi yetersiz — Anthropic Console'dan kredi yükleyin" : "Internal server error" },
      { status: 500 }
    );
  }
}
