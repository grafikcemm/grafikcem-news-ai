import { NextRequest, NextResponse } from "next/server";
import { validateApiRequest, unauthorizedResponse } from "@/lib/auth";
import { genAI, GEMINI_STANDARD } from "@/lib/gemini";
import { clampText } from "@/lib/tweet-engine";

export const maxDuration = 60;

interface SearchSource {
  title: string;
  url: string;
  snippet: string;
}

function uniqueSources(items: SearchSource[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item.url || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

export async function POST(request: NextRequest) {
  if (!validateApiRequest(request)) return unauthorizedResponse();

  try {
    const body = await request.json();
    const query = typeof body.query === "string" ? body.query.trim() : "";

    if (!query) {
      return NextResponse.json({ error: "query required" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({
      model: GEMINI_STANDARD,
      tools: [{ googleSearch: {} } as any],
    });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: query }] }],
    });

    const response = await result.response;
    const summary = clampText(response.text() ?? "", 1400);
    const candidate = response.candidates?.[0];
    const groundingMetadata = candidate?.groundingMetadata;
    const chunks = groundingMetadata?.groundingChunks ?? [];
    const sources = uniqueSources(
      chunks
        .map((chunk) => ({
          title: chunk.web?.title?.trim() ?? "Kaynak",
          url: chunk.web?.uri?.trim() ?? "",
          snippet: "",
        }))
        .filter((item) => item.url)
    )
      .slice(0, 3)
      .map((item) => ({
        ...item,
        snippet: clampText(summary, 100),
      }));

    const compactContext = clampText(
      [
        summary,
        sources
          .map((source) => `${source.title} | ${source.url} | ${source.snippet}`)
          .join("\n"),
      ]
        .filter(Boolean)
        .join("\n\n"),
      2200
    );

    return NextResponse.json({
      summary,
      sources,
      totalSources: chunks.length || sources.length,
      webSearchQueries: groundingMetadata?.webSearchQueries ?? [],
      webContext: compactContext,
    });
  } catch (err) {
    console.error("[tweet/web-search] error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
