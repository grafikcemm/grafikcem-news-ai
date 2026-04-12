"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { ScoreBadge } from "@/components/ui/score-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { HelpCircleIcon } from "lucide-react";

interface NewsItem {
  id: string;
  title: string;
  title_tr: string | null;
  summary_tr: string | null;
  title_original: string | null;
  summary: string;
  full_summary_tr: string | null;
  url: string;
  category: string;
  viral_score: number;
  viral_reason: string;
  published_at: string;
  fetched_at: string;
  is_used: boolean;
  is_read: boolean;
  sources?: { name: string };
}

interface ArticleData {
  id: string;
  title: string;
  title_tr: string;
  title_original: string;
  full_summary_tr: string;
  summary: string;
  url: string;
  source_name: string;
  fetched_at: string;
  viral_score: number;
  viral_reason: string;
  category: string;
}

const categories = [
  { value: "all", label: "Hepsi" },
  { value: "unread", label: "Okunmadı" },
  { value: "ai_news", label: "AI" },
  { value: "design", label: "Design" },
  { value: "automation", label: "Otomasyon" },
  { value: "dev_tools", label: "Dev Tools" },
  { value: "turkish", label: "Türkçe" },
  { value: "turkish_eco", label: "Türk Ekosistem" },
  { value: "tool_update", label: "Araç Güncellemeleri" },
];

function ScoreBar({ score }: { score: number }) {
  const color = score <= 40 ? "var(--danger)" : score <= 70 ? "var(--warning)" : "var(--success)";
  return (
    <div style={{ width: 40, height: 3, background: "var(--surface-overlay)", borderRadius: 2, overflow: "hidden" }}>
      <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: 2 }} />
    </div>
  );
}

export default function NewsPoolPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeSource, setActiveSource] = useState<string>("all");
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null);
  const [articleData, setArticleData] = useState<ArticleData | null>(null);
  const [articleLoading, setArticleLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchNews();
  }, [activeCategory]);

  async function fetchNews() {
    setLoading(true);
    try {
      let query = supabase
        .from("news_items")
        .select("*, sources(name)")
        .order("fetched_at", { ascending: false })
        .limit(50);

      if (activeCategory === "unread") {
        query = query.eq("is_read", false);
      } else if (activeCategory === "turkish_eco") {
        query = query.eq("custom_tag", "turkish_eco");
      } else if (activeCategory === "tool_update") {
        query = query.eq("custom_tag", "tool_update");
      } else if (activeCategory !== "all") {
        query = query.eq("category", activeCategory);
      }

      const { data, error } = await query;
      if (!error && data) {
        setNews(data as NewsItem[]);
      }
    } catch (err) {
      console.error("News pool fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate(newsId: string) {
    setGeneratingId(newsId);

    setNews(prev => prev.map(n => n.id === newsId ? { ...n, is_read: true } : n));
    supabase.from("news_items").update({ is_read: true }).eq("id", newsId).then(() => {}, () => {});

    try {
      const res = await fetch("/api/tweet/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ news_id: newsId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Tweet seçenekleri üretildi!");
        router.push(`/tweet-generator?news_id=${newsId}`);
      } else {
        toast.error(data?.error || "Tweet üretimi başarısız oldu");
      }
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setGeneratingId(null);
    }
  }

  async function handleOpenArticle(newsId: string) {
    setSelectedNewsId(newsId);
    setArticleData(null);
    setArticleLoading(true);

    setNews(prev => prev.map(n => n.id === newsId ? { ...n, is_read: true } : n));
    supabase.from("news_items").update({ is_read: true }).eq("id", newsId).then(() => {}, () => {});

    try {
      const res = await fetch("/api/news/article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ news_id: newsId }),
      });

      const data = await res.json();
      if (res.ok) {
        setArticleData(data);
      } else {
        toast.error(data?.error || "Makale yüklenemedi");
      }
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setArticleLoading(false);
    }
  }

  const filtered = news.filter((item) => {
    const matchSearch =
      (item.title_tr || item.title).toLowerCase().includes(search.toLowerCase()) ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      (item.summary && item.summary.toLowerCase().includes(search.toLowerCase()));

    if (!matchSearch) return false;
    if (activeSource !== "all") {
      if (item.sources?.name !== activeSource) return false;
    }
    return true;
  });

  const uniqueSources = Array.from(new Set(news.map(n => n.sources?.name).filter(Boolean))) as string[];

  return (
    <div className="flex flex-col lg:flex-row" style={{ height: "calc(100vh - 56px)" }}>
      {/* LEFT PANEL — List */}
      <div
        className="w-full lg:w-[38%] flex flex-col h-full overflow-hidden"
        style={{ background: "var(--surface-raised)", borderRight: "1px solid var(--border-subtle)" }}
      >
        {/* Header */}
        <div
          className="shrink-0"
          style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)", background: "var(--surface-raised)" }}
        >
          {/* Search */}
          <div className="flex items-center gap-[8px]" style={{
            background: "var(--surface-elevated)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            padding: "8px 14px",
            marginBottom: 12,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--text-tertiary)" }}>
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Haberlerde ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--text-primary)",
                fontSize: 13,
                flex: 1,
              }}
            />
          </div>

          {/* Category pills */}
          <div className="flex flex-wrap gap-[6px]" style={{ marginBottom: 8 }}>
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 500,
                  background: activeCategory === cat.value ? "var(--accent-subtle)" : "var(--surface-elevated)",
                  color: activeCategory === cat.value ? "var(--accent)" : "var(--text-secondary)",
                  border: `1px solid ${activeCategory === cat.value ? "var(--accent-muted)" : "var(--border-default)"}`,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Source pills */}
          <div className="flex flex-wrap gap-[6px] items-center">
            <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 500 }}>Kaynak:</span>
            <button
              onClick={() => setActiveSource("all")}
              style={{
                padding: "3px 8px",
                borderRadius: "var(--radius-sm)",
                fontSize: 10,
                fontWeight: 500,
                background: activeSource === "all" ? "var(--accent-subtle)" : "var(--surface-elevated)",
                color: activeSource === "all" ? "var(--accent)" : "var(--text-tertiary)",
                border: "none",
                cursor: "pointer",
              }}
            >
              Hepsi
            </button>
            {uniqueSources.map(src => (
              <button
                key={src}
                onClick={() => setActiveSource(src)}
                style={{
                  padding: "3px 8px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 10,
                  fontWeight: 500,
                  background: activeSource === src ? "var(--accent-subtle)" : "var(--surface-elevated)",
                  color: activeSource === src ? "var(--accent)" : "var(--text-tertiary)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {src}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div style={{ padding: 20 }} className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-[70px] w-full" style={{ background: "var(--surface-elevated)", borderRadius: "var(--radius-md)" }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: "var(--text-tertiary)", fontSize: 13 }}>Haber bulunamadı</div>
          ) : (
            <div className="flex flex-col">
              {filtered.map(item => {
                const isSelected = selectedNewsId === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleOpenArticle(item.id)}
                    className="cursor-pointer transition-colors duration-100"
                    style={{
                      padding: "14px 20px",
                      borderBottom: "1px solid var(--border-subtle)",
                      background: isSelected ? "var(--accent-subtle)" : "transparent",
                      borderLeft: isSelected ? "2px solid var(--accent)" : "2px solid transparent",
                    }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "var(--surface-elevated)"; }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                  >
                    <div className="flex items-center gap-[8px]" style={{ marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{item.sources?.name}</span>
                      <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                        · {formatDistanceToNow(new Date(item.fetched_at), { addSuffix: true, locale: tr })}
                      </span>
                      {!item.is_read && (
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)", boxShadow: "0 0 6px var(--accent)" }} />
                      )}
                    </div>
                    <p
                      className="line-clamp-2"
                      style={{
                        fontSize: 13,
                        fontWeight: item.is_read ? 400 : 500,
                        color: item.is_read ? "var(--text-secondary)" : "var(--text-primary)",
                        lineHeight: 1.4,
                        marginBottom: 4,
                      }}
                    >
                      {item.title_tr || item.title}
                    </p>
                    <p
                      className="line-clamp-2"
                      style={{
                        fontSize: 11,
                        color: "var(--text-tertiary)",
                        lineHeight: 1.4,
                        marginBottom: 8,
                      }}
                    >
                      {item.summary_tr || item.summary}
                    </p>
                    <div className="flex items-center gap-[8px]">
                      <ScoreBar score={item.viral_score} />
                      <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{item.viral_score}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL — Detail */}
      <div
        className="w-full lg:w-[62%] flex flex-col h-full overflow-y-auto"
        style={{ background: "var(--surface-base)", padding: "32px 40px" }}
      >
        {!selectedNewsId ? (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              icon={<HelpCircleIcon size={40} />}
              title="Bir haber seçin"
              description="Haberi özetlemek ve tweet formatında içerik üretmek için sol taraftan bir haber seçin."
            />
          </div>
        ) : articleLoading ? (
          <div className="space-y-6 max-w-3xl animate-pulse">
            <Skeleton className="w-[100px] h-6" style={{ background: "var(--surface-elevated)" }} />
            <Skeleton className="w-full h-12" style={{ background: "var(--surface-elevated)" }} />
            <Skeleton className="w-3/4 h-12" style={{ background: "var(--surface-elevated)" }} />
            <div className="pt-10 space-y-3">
              <Skeleton className="w-full h-4" style={{ background: "var(--surface-elevated)" }} />
              <Skeleton className="w-full h-4" style={{ background: "var(--surface-elevated)" }} />
              <Skeleton className="w-[85%] h-4" style={{ background: "var(--surface-elevated)" }} />
            </div>
          </div>
        ) : articleData ? (
          <div className="flex flex-col flex-1 max-w-3xl w-full">
            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-[12px]" style={{ marginBottom: 20 }}>
              <span className="text-label" style={{
                padding: "4px 10px",
                background: "var(--surface-elevated)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-primary)",
                fontSize: 12,
                fontWeight: 500,
              }}>
                {articleData.source_name}
              </span>
              <ScoreBadge score={articleData.viral_score} />
              <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                {articleData.fetched_at && formatDistanceToNow(new Date(articleData.fetched_at), { addSuffix: true, locale: tr })}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-display" style={{ fontSize: 24, marginBottom: 16 }}>
              {articleData.title_tr}
            </h1>
            {articleData.title_original && articleData.title_original !== articleData.title_tr && (
              <p style={{ fontSize: 14, color: "var(--text-tertiary)", fontStyle: "italic", marginBottom: 32, fontWeight: 450 }}>
                &ldquo;{articleData.title_original}&rdquo;
              </p>
            )}

            <hr style={{ border: "none", borderTop: "1px solid var(--border-subtle)", marginBottom: 32 }} />

            {/* Content */}
            <div className="flex-1 space-y-5">
              {articleData.full_summary_tr ? (
                articleData.full_summary_tr.split("\n\n").map((paragraph, i) => (
                  <p key={i} className="text-body" style={{ fontSize: 15, lineHeight: 1.7, color: "var(--text-secondary)" }}>
                    {paragraph}
                  </p>
                ))
              ) : (
                <p className="text-body" style={{ fontSize: 15, lineHeight: 1.7, color: "var(--text-secondary)" }}>
                  {articleData.summary || "Özet mevcut değil."}
                </p>
              )}
            </div>

            {/* Action Bar */}
            <div
              className="sticky bottom-0 flex gap-[12px]"
              style={{
                marginTop: 40,
                padding: "16px 0",
                background: "var(--surface-base)",
                borderTop: "1px solid var(--border-subtle)",
              }}
            >
              <Button
                variant="default"
                size="lg"
                className="flex-1"
                style={{ height: 48, fontSize: 15 }}
                onClick={() => handleGenerate(selectedNewsId)}
                disabled={generatingId === selectedNewsId}
              >
                {generatingId === selectedNewsId ? "Üretiliyor..." : "X'e Dönüştür"}
              </Button>
              <Button variant="secondary" size="lg" style={{ height: 48, fontSize: 15 }}>
                LinkedIn Yap
              </Button>
              <Button variant="ghost" size="lg" style={{ height: 48, fontSize: 15 }}>
                Kaydet
              </Button>
              {articleData.url && (
                <a href={articleData.url} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="lg" style={{ height: 48, fontSize: 15, color: "var(--text-tertiary)" }}>
                    Kaynak ↗
                  </Button>
                </a>
              )}
            </div>
          </div>
        ) : (
          <div style={{ padding: 48, textAlign: "center", color: "var(--text-tertiary)" }}>
            Makale yüklenemedi.
          </div>
        )}
      </div>
    </div>
  );
}
