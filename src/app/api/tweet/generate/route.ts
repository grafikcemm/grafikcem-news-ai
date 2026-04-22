import { NextRequest, NextResponse } from "next/server";
import { validateApiRequest, unauthorizedResponse } from "@/lib/auth";
import { generateWithGemini, GEMINI_FAST } from "@/lib/gemini";
import { parseAIJSON } from "@/lib/parse-ai";
import {
  ACCOUNT_CONFIGS,
  buildTweetInstruction,
  clampText,
  ThreadTweet,
  TweetAccount,
  TweetCharacter,
  TweetFormat,
  TweetKnowledge,
  TweetLanguage,
  TweetMode,
  TweetTone,
  truncateReference,
} from "@/lib/tweet-engine";
import { supabaseAdmin } from "@/lib/supabase";

export const maxDuration = 60;

interface GenerateBody {
  topic: string;
  format: TweetFormat;
  character: TweetCharacter;
  tone: TweetTone;
  knowledge: TweetKnowledge;
  language: TweetLanguage;
  account: TweetAccount;
  webContext?: string;
  mode?: TweetMode;
}

interface SingleTweetResult {
  text: string;
}

function isValidFormat(value: string): value is TweetFormat {
  return ["micro", "punch", "spark", "storm", "thread"].includes(value);
}

function isValidAccount(value: string): value is TweetAccount {
  return value in ACCOUNT_CONFIGS;
}

function buildLanguageRule(language: TweetLanguage) {
  if (language === "English") {
    return "Dil: only English.";
  }
  if (language === "Türkçe") {
    return "Dil: yalnızca Türkçe.";
  }
  return "Dil: konunun doğal dilini seç ama öncelik Türkçe.";
}

function buildSinglePrompt({
  topic,
  format,
  character,
  tone,
  knowledge,
  language,
  mode,
  webContext,
  references,
}: GenerateBody & {
  mode: TweetMode;
  references: string[];
}) {
  const referenceBlock = references.length
    ? `VIRAL REFERANS TWEET'LER (yalnızca ritim ve kalıp için):
${references.map((item) => `---\n${item}`).join("\n")}

Bu tweet'lerin cümle yapısını, ritim ve akışını referans al.
İçeriklerini kopyalama, sadece yazım kalıbını kullan.
`
    : "";

  const webBlock = webContext?.trim()
    ? `ARAŞTIRMA VERİLERİ (gerçek kaynaklardan):
${clampText(webContext, 2200)}

Bu verileri kullanarak tweet üret. Gerçek rakam ve bilgileri dahil et.
`
    : "";

  return `
Konu: ${topic}
${buildTweetInstruction(mode, format)}

AYARLAR:
- Karakter: ${character}
- Ton: ${tone}
- Knowledge lens: ${knowledge}
- ${buildLanguageRule(language)}

${webBlock}
${referenceBlock}
Kurallar:
- Çıkış yalın, insani ve akışkan olsun.
- Robotik girişler ve genel geçer sonuç cümleleri kullanma.
- İçeriği kopyalama, özgün fikir kur.
- Eğer veri verildiyse rakamları yanlış uydurma.

SADECE geçerli JSON döndür:
{"text":"tweet metni"}
  `.trim();
}

function buildThreadPrompt({
  topic,
  account,
  webContext,
  character,
  tone,
  knowledge,
  language,
  references,
}: GenerateBody & { references: string[] }) {
  return `
Şu konu için 5 tweetlik ${language === "English" ? "English" : "Türkçe"} thread üret.

Konu: ${topic}
Hesap: ${ACCOUNT_CONFIGS[account].handle} — ${ACCOUNT_CONFIGS[account].description}
Karakter: ${character}
Ton: ${tone}
Knowledge: ${knowledge}
Dil: ${language}
Web verileri: ${webContext ? clampText(webContext, 2200) : "Yok"}
Viral referanslar: ${references.length ? references.join(" || ") : "Yok"}

THREAD YAPISI:
1. Tweet: Hook — okuyucuyu yakala, merak uyandır
2-4. Tweetler: Value — bilgi, fikir, gerçek, veri
5. Tweet: CTA veya güçlü kapanış cümlesi

KURAL:
- Her tweet bağımsız okunabilmeli ama zincir akışı bozulmamalı.
- İçerikleri kopyalama.
- Rakam varsa uydurma değil, verilen araştırmadan yararlan.

SADECE JSON array döndür, başka hiçbir şey yazma:
[{"step":1,"type":"hook","text":"..."},{"step":2,"type":"value","text":"..."},{"step":3,"type":"value","text":"..."},{"step":4,"type":"value","text":"..."},{"step":5,"type":"cta","text":"..."}]
  `.trim();
}

async function getReferenceTweets(account: TweetAccount) {
  const { data } = await supabaseAdmin
    .from("viral_references")
    .select("tweet_text")
    .eq("account", account)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(5);

  return (data ?? [])
    .map((item) => truncateReference(item.tweet_text, 140))
    .filter(Boolean)
    .slice(0, 3);
}

function normalizeThread(raw: unknown): ThreadTweet[] | null {
  if (!Array.isArray(raw)) return null;

  const thread = raw
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const candidate = item as Partial<ThreadTweet>;
      if (typeof candidate.text !== "string") return null;

      return {
        step: typeof candidate.step === "number" ? candidate.step : index + 1,
        type:
          candidate.type === "hook" || candidate.type === "cta" || candidate.type === "value"
            ? candidate.type
            : index === 0
              ? "hook"
              : index === raw.length - 1
                ? "cta"
                : "value",
        text: candidate.text.trim(),
      } satisfies ThreadTweet;
    })
    .filter((item): item is ThreadTweet => {
      return item !== null && typeof item.text === "string" && item.text.length > 0;
    });

  return thread.length ? thread : null;
}

export async function POST(request: NextRequest) {
  if (!validateApiRequest(request)) return unauthorizedResponse();

  try {
    const body = (await request.json()) as Partial<GenerateBody>;
    const topic = body.topic?.trim();
    const mode = body.mode ?? "tweet";

    if (!topic) {
      return NextResponse.json({ error: "topic required" }, { status: 400 });
    }

    if (!body.format || !isValidFormat(body.format)) {
      return NextResponse.json({ error: "invalid format" }, { status: 400 });
    }

    if (!body.account || !isValidAccount(body.account)) {
      return NextResponse.json({ error: "invalid account" }, { status: 400 });
    }

    const accountConfig = ACCOUNT_CONFIGS[body.account];
    const references = await getReferenceTweets(body.account);

    if (body.format === "thread") {
      const prompt = buildThreadPrompt({
        topic,
        account: body.account,
        format: body.format,
        character: body.character ?? accountConfig.defaults.character,
        tone: body.tone ?? accountConfig.defaults.tone,
        knowledge: body.knowledge ?? accountConfig.defaults.knowledge,
        language: body.language ?? accountConfig.defaults.language,
        webContext: body.webContext,
        mode,
        references,
      });

      const text = await generateWithGemini(prompt, "creative", accountConfig.systemPrompt, GEMINI_FAST);
      const parsed = parseAIJSON<unknown>(text);
      const thread = normalizeThread(parsed);

      if (!thread) {
        return NextResponse.json({ error: "thread parse failed" }, { status: 502 });
      }

      return NextResponse.json({
        mode,
        format: body.format,
        account: body.account,
        thread,
        referencesUsed: references,
      });
    }

    const prompt = buildSinglePrompt({
      topic,
      account: body.account,
      format: body.format,
      character: body.character ?? accountConfig.defaults.character,
      tone: body.tone ?? accountConfig.defaults.tone,
      knowledge: body.knowledge ?? accountConfig.defaults.knowledge,
      language: body.language ?? accountConfig.defaults.language,
      webContext: body.webContext,
      mode,
      references,
    });

    const text = await generateWithGemini(prompt, "creative", accountConfig.systemPrompt, GEMINI_FAST);
    const parsed = parseAIJSON<SingleTweetResult>(text);

    if (!parsed?.text?.trim()) {
      return NextResponse.json({ error: "tweet parse failed" }, { status: 502 });
    }

    return NextResponse.json({
      mode,
      format: body.format,
      account: body.account,
      tweet: parsed.text.trim(),
      referencesUsed: references,
    });
  } catch (err) {
    console.error("[tweet/generate] error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
