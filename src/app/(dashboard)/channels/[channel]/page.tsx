"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Copy, ExternalLink, ImagePlus, LoaderCircle, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type ChannelId = "grafikcem" | "maskulenkod" | "sporhaberleri" | "linkedin";

interface TweetDraftItem {
  id: string;
  channel: string;
  content: string;
  format: string | null;
  status: string;
  metadata?: {
    sources?: Array<{ title: string; url: string }>;
  } | null;
  created_at: string;
}

interface GeneratedContentItem {
  id: string;
  content: string;
  content_category: string | null;
  status: string;
  created_at: string;
}

const CHANNEL_CONFIG: Record<ChannelId, {
  label: string;
  description: string;
  color: string;
  filters?: string[];
}> = {
  grafikcem: {
    label: "@grafikcem",
    description: "AI, tasarım ve yaratıcı teknoloji için kayıtlı tweet taslakları",
    color: "var(--channel-grafikcem)",
  },
  maskulenkod: {
    label: "@maskulenkod",
    description: "Disiplin ve erkek gelişimi için tweet arşivi",
    color: "var(--channel-maskulenkod)",
    filters: ["Tümü", "Disiplin", "İlişki", "Para", "Zihin", "Fizik", "Kimlik"],
  },
  sporhaberleri: {
    label: "@sporhaberleri",
    description: "Spor haberleri tweet arşivi ve görsel prompt üretimi",
    color: "var(--channel-sporhaberleri)",
    filters: ["Tümü", "Futbol", "Basketbol", "Milli Takım", "Dünya", "Diğer"],
  },
  linkedin: {
    label: "LinkedIn",
    description: "Profesyonel içerik havuzu",
    color: "var(--channel-linkedin)",
  },
};

const KEYWORD_FILTERS: Record<string, string[]> = {
  Disiplin: ["disiplin", "alışkanlık", "rutin", "irade"],
  "İlişki": ["ilişki", "kadın", "evlilik", "bağ"],
  Para: ["para", "kazanç", "gelir", "servet"],
  Zihin: ["zihin", "psikoloji", "mental", "odak"],
  Fizik: ["fizik", "güç", "antrenman", "sağlık"],
  Kimlik: ["erkek", "kimlik", "sorumluluk", "karakter"],
  Futbol: ["futbol", "gol", "süper lig", "şampiyonlar ligi", "uefa"],
  Basketbol: ["basketbol", "euroleague", "nba", "pota"],
  "Milli Takım": ["milli takım", "ayyıldız", "ulusal takım", "a milli"],
  Dünya: ["premier league", "la liga", "serie a", "bundesliga", "formula", "olimpiyat"],
  Diğer: [],
};

function parseThread(content: string) {
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function matchesFilter(channel: ChannelId, filter: string, item: TweetDraftItem): boolean {
  if (filter === "Tümü") return true;

  const haystack = `${item.content} ${JSON.stringify(item.metadata ?? {})}`.toLowerCase();
  const keywords = KEYWORD_FILTERS[filter] ?? [];

  if (channel === "sporhaberleri" && filter === "Diğer") {
    const primaryGroups = ["Futbol", "Basketbol", "Milli Takım", "Dünya"];
    return !primaryGroups.some((group) => matchesFilter(channel, group, item));
  }

  return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
}

function TweetDraftCard({
  item,
  onChange,
  onArchive,
}: {
  item: TweetDraftItem;
  onChange: (id: string, content: string) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
}) {
  const [content, setContent] = useState(item.content);
  const [saving, setSaving] = useState(false);
  const thread = item.format === "thread" ? parseThread(item.content) : null;

  async function save() {
    if (content === item.content) return;
    setSaving(true);
    await onChange(item.id, content);
    setSaving(false);
  }

  return (
    <Card className="border-white/10 bg-[var(--surface-card)]">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
              {item.format || "tweet"}
            </span>
            <span className="text-xs text-[var(--text-tertiary)]">
              {new Date(item.created_at).toLocaleString("tr-TR")}
            </span>
          </div>
          <span className="text-xs text-[var(--text-secondary)]">
            {item.content.length} karakter
          </span>
        </div>

        {thread ? (
          <div className="space-y-3">
            {thread.map((tweet: { step?: number; text?: string; type?: string }, index: number) => (
              <div key={`${item.id}-${index}`} className="rounded-2xl border border-white/8 bg-black/15 p-3">
                <div className="mb-2 flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                  <span>{tweet.step ?? index + 1}/</span>
                  <span>{tweet.type ?? "tweet"}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">
                  {tweet.text}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onBlur={save}
            className="min-h-[220px] resize-none border-white/10 bg-black/20 text-sm leading-7"
          />
        )}

        {item.metadata?.sources?.length ? (
          <div className="flex flex-wrap gap-2">
            {item.metadata.sources.map((source) => (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-[var(--text-secondary)]"
              >
                <ExternalLink className="size-3.5" />
                {source.title}
              </a>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="border-white/10"
            onClick={() => {
              navigator.clipboard.writeText(item.content);
              toast.success("İçerik kopyalandı.");
            }}
          >
            <Copy className="size-4" />
            Kopyala
          </Button>
          {!thread && (
            <Button variant="outline" className="border-white/10" onClick={save} disabled={saving}>
              {saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
              Kaydet
            </Button>
          )}
          <Button
            variant="ghost"
            className="text-red-300 hover:bg-red-500/10 hover:text-red-200"
            onClick={() => onArchive(item.id)}
          >
            <Trash2 className="size-4" />
            Arşivle
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LinkedInCard({ item }: { item: GeneratedContentItem }) {
  return (
    <Card className="border-white/10 bg-[var(--surface-card)]">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
            {item.content_category || "linkedin"}
          </span>
          <span className="text-xs text-[var(--text-tertiary)]">
            {new Date(item.created_at).toLocaleString("tr-TR")}
          </span>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">{item.content}</p>
        <Button
          variant="outline"
          className="border-white/10"
          onClick={() => {
            navigator.clipboard.writeText(item.content);
            toast.success("İçerik kopyalandı.");
          }}
        >
          <Copy className="size-4" />
          Kopyala
        </Button>
      </CardContent>
    </Card>
  );
}

export default function ChannelPage() {
  const params = useParams();
  const channel = params.channel as ChannelId;
  const config = CHANNEL_CONFIG[channel];
  const isTweetChannel = channel !== "linkedin";

  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<TweetDraftItem[]>([]);
  const [linkedinItems, setLinkedinItems] = useState<GeneratedContentItem[]>([]);
  const [activeFilter, setActiveFilter] = useState("Tümü");

  const [sportsHeadline, setSportsHeadline] = useState("");
  const [sportsSubjects, setSportsSubjects] = useState("");
  const [sportsTheme, setSportsTheme] = useState("Dramatik");
  const [sportsPrompt, setSportsPrompt] = useState<Record<string, string> | null>(null);
  const [sportsLoading, setSportsLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const channelId = channel;
      console.log("Channel ID:", channelId);
      setLoading(true);
      try {
        if (channelId === "linkedin") {
          const res = await fetch(`/api/channels/${channelId}/content?status=all`);
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "İçerikler yüklenemedi.");
          setLinkedinItems(data.content || []);
        } else {
          const { data, error } = await supabase
            .from("tweet_drafts")
            .select("*")
            .eq("channel", channelId)
            .neq("status", "rejected")
            .order("created_at", { ascending: false });

          if (error) throw new Error(error.message);
          setDrafts(data || []);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Yükleme başarısız.");
      } finally {
        setLoading(false);
      }
    }

    setActiveFilter("Tümü");
    load();
  }, [channel]);

  const filteredDrafts = useMemo(() => {
    if (!isTweetChannel) return [];
    return drafts.filter((item) => matchesFilter(channel, activeFilter, item));
  }, [activeFilter, channel, drafts, isTweetChannel]);

  if (!config) {
    return <div className="p-8 text-[var(--text-secondary)]">Kanal bulunamadı: {channel}</div>;
  }

  async function updateDraft(id: string, content: string) {
    try {
      const res = await fetch("/api/tweet/drafts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Güncelleme başarısız.");
      setDrafts((prev) => prev.map((item) => (item.id === id ? { ...item, content } : item)));
      toast.success("Taslak güncellendi.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Güncelleme başarısız.");
    }
  }

  async function archiveDraft(id: string) {
    try {
      const res = await fetch("/api/tweet/drafts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "rejected" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Arşivleme başarısız.");
      setDrafts((prev) => prev.filter((item) => item.id !== id));
      toast.success("Taslak arşive taşındı.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Arşivleme başarısız.");
    }
  }

  async function generateSportsPrompt() {
    if (!sportsHeadline.trim()) {
      toast.error("Önce haber başlığı gir.");
      return;
    }

    setSportsLoading(true);
    try {
      const res = await fetch("/api/tweet/sports-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline: sportsHeadline,
          subjects: sportsSubjects,
          theme: sportsTheme,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Prompt üretilemedi.");
      setSportsPrompt(data.result || null);
      toast.success("Spor görsel promptu hazır.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Prompt üretilemedi.");
    } finally {
      setSportsLoading(false);
    }
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,24,39,0.96),rgba(2,6,23,0.96))] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <span className="size-3 rounded-full" style={{ backgroundColor: config.color }} />
                <h1 className="text-3xl font-semibold">{config.label}</h1>
              </div>
              <p className="text-sm text-[var(--text-tertiary)]">{config.description}</p>
            </div>

            {isTweetChannel ? (
              <Link href={`/tweet-generator?account=${channel}`}>
                <Button className="rounded-full bg-orange-500 text-black hover:bg-orange-400">
                  Tweet Üreticiye Git
                </Button>
              </Link>
            ) : null}
          </div>

          {config.filters && (
            <div className="mt-5 flex flex-wrap gap-2">
              {config.filters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm transition",
                    activeFilter === filter
                      ? "border-orange-400 bg-orange-500/15 text-orange-200"
                      : "border-white/10 bg-white/5 text-[var(--text-secondary)]"
                  )}
                >
                  {filter}
                </button>
              ))}
            </div>
          )}
        </div>

        {channel === "sporhaberleri" && (
          <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(6,78,59,0.28),rgba(2,6,23,0.96))]">
            <CardContent className="space-y-4 p-5">
              <div>
                <p className="text-sm font-medium">📸 Haber Görseli Üret</p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  Promptu Midjourney, Ideogram veya DALL-E için kullan.
                </p>
              </div>

              <Input
                value={sportsHeadline}
                onChange={(event) => setSportsHeadline(event.target.value)}
                placeholder="Haber başlığı"
                className="border-white/10 bg-black/20"
              />
              <Input
                value={sportsSubjects}
                onChange={(event) => setSportsSubjects(event.target.value)}
                placeholder="Takımlar / kişiler (opsiyonel)"
                className="border-white/10 bg-black/20"
              />

              <div className="flex flex-wrap gap-2">
                {["Dramatik", "Minimal", "Energetik"].map((theme) => (
                  <button
                    key={theme}
                    type="button"
                    onClick={() => setSportsTheme(theme)}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm transition",
                      sportsTheme === theme
                        ? "border-emerald-300 bg-emerald-300 text-black"
                        : "border-white/10 bg-white/5 text-[var(--text-secondary)]"
                    )}
                  >
                    {theme}
                  </button>
                ))}
              </div>

              <Button
                onClick={generateSportsPrompt}
                disabled={sportsLoading}
                className="w-full rounded-full bg-emerald-400 text-black hover:bg-emerald-300"
              >
                {sportsLoading ? <LoaderCircle className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                Prompt Üret
              </Button>

              {sportsPrompt && (
                <div className="rounded-[18px] border border-white/10 bg-black/15 p-4">
                  <pre className="overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-[var(--text-secondary)]">
                    {JSON.stringify(sportsPrompt, null, 2)}
                  </pre>
                  <Button
                    variant="outline"
                    className="mt-3 border-white/10"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(sportsPrompt, null, 2));
                      toast.success("Prompt JSON kopyalandı.");
                    }}
                  >
                    <Copy className="size-4" />
                    Kopyala
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-52 w-full rounded-[24px]" />
            ))}
          </div>
        ) : isTweetChannel ? (
          filteredDrafts.length ? (
            <div className="space-y-4">
              {filteredDrafts.map((item) => (
                <TweetDraftCard
                  key={item.id}
                  item={item}
                  onChange={updateDraft}
                  onArchive={archiveDraft}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Bu filtrede kayıtlı tweet yok"
              description="Tweet Üretici’den taslak kaydedince burada görünecek."
            />
          )
        ) : linkedinItems.length ? (
          <div className="space-y-4">
            {linkedinItems.map((item) => (
              <LinkedInCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Henüz LinkedIn içeriği yok"
            description="Mevcut LinkedIn üretim akışı tamamlandığında burada görünür."
          />
        )}
      </div>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[28px] border border-dashed border-white/10 bg-[var(--surface-card)] px-6 py-16 text-center">
      <p className="text-lg font-medium text-[var(--text-primary)]">{title}</p>
      <p className="mt-2 text-sm text-[var(--text-tertiary)]">{description}</p>
    </div>
  );
}
