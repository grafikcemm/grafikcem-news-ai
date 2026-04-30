"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  SearchIcon, 
  ClockIcon, 
  ExternalLinkIcon, 
  SparklesIcon, 
  BookmarkIcon,
  ChevronRightIcon,
  FilterIcon,
  LoaderCircle,
  Zap,
  Layout,
  Share2,
  ChevronLeft
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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

const categories = [
  { value: "all", label: "TÜMÜ" },
  { value: "ai_news", label: "AI NEWS" },
  { value: "design", label: "DESIGN" },
  { value: "automation", label: "AUTOMATION" },
  { value: "dev_tools", label: "DEV TOOLS" },
  { value: "turkish", label: "TURKISH" },
];

export default function NewsPoolPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null);
  const [articleLoading, setArticleLoading] = useState(false);
  const [articleData, setArticleData] = useState<any>(null);
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
        .limit(100);

      if (activeCategory !== "all") {
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

  async function handleOpenArticle(newsId: string) {
    setSelectedNewsId(newsId);
    setArticleData(null);
    setArticleLoading(true);

    try {
      const res = await fetch("/api/news/article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ news_id: newsId }),
      });

      const data = await res.json();
      if (res.ok) {
        setArticleData(data);
        setNews(prev => prev.map(n => n.id === newsId ? { ...n, is_read: true } : n));
        supabase.from("news_items").update({ is_read: true }).eq("id", newsId).then(() => {});
      } else {
        toast.error(data?.error || "Makale yüklenemedi");
      }
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setArticleLoading(false);
    }
  }

  const filtered = news.filter((item) =>
    (item.title_tr || item.title).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-[calc(100vh-52px)] bg-[var(--bg-base)]">
      
      {/* Filters Bar */}
      <div className="h-14 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-6 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={cn(
                "px-3 py-1.5 text-[10px] font-bold font-mono rounded-lg transition-all border",
                activeCategory === cat.value 
                  ? "bg-white text-black border-white" 
                  : "bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-muted)] hover:text-white"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative group w-64">
          <SearchIcon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input 
            type="text" 
            placeholder="HABER ARA..." 
            className="w-full h-8 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg pl-8 pr-3 text-[10px] font-mono text-white outline-none focus:border-[var(--border-strong)] transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Left: News List */}
        <div className="w-[400px] border-r border-[var(--border-subtle)] flex flex-col bg-[var(--bg-surface)]">
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-24 w-full bg-[var(--bg-elevated)] animate-pulse rounded-xl border border-[var(--border-subtle)]" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-20 text-center opacity-20">
                <FilterIcon size={32} className="mx-auto mb-2" />
                <span className="text-[10px] font-bold font-mono">BULUNAMADI</span>
              </div>
            ) : (
              <div className="flex flex-col">
                {filtered.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleOpenArticle(item.id)}
                    className={cn(
                      "p-[12px] px-[16px] border-b border-[var(--border-subtle)] cursor-pointer transition-all hover:bg-[var(--bg-elevated)]/50 relative group",
                      selectedNewsId === item.id ? "bg-[var(--bg-elevated)] border-r-2 border-r-white" : ""
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "w-8 h-8 flex items-center justify-center rounded-lg text-[10px] font-bold font-mono shrink-0",
                        item.viral_score >= 70 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : 
                        item.viral_score >= 40 ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : 
                        "bg-[var(--bg-base)] text-[var(--text-muted)] border border-[var(--border-default)]"
                      )}>
                        {item.viral_score}
                      </div>
                      <div className="flex-1 space-y-2">
                        <h4 className={cn(
                          "text-[13px] leading-snug line-clamp-2",
                          item.is_read ? "text-[var(--text-muted)] font-normal" : "text-white font-medium"
                        )}>
                          {item.title_tr || item.title}
                        </h4>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-[9px] font-bold font-mono text-[var(--text-muted)] uppercase tracking-wider">
                            <span>{item.sources?.name}</span>
                            <span>•</span>
                            <span>{formatDistanceToNow(new Date(item.fetched_at), { addSuffix: true, locale: tr })}</span>
                          </div>
                          
                          {/* Hover Action */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/tweet-generator?news_id=${item.id}`);
                            }}
                            className="opacity-0 group-hover:opacity-100 bg-white text-black text-[9px] font-bold px-2 py-1 rounded transition-all flex items-center gap-1"
                          >
                            <Share2 size={10} />
                            TWEET ÜRET
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Article Detail */}
        <div className="flex-1 bg-[var(--bg-base)] overflow-y-auto custom-scrollbar">
          {!selectedNewsId ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
              <div className="p-4 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <Layout className="w-8 h-8" />
              </div>
              <div>
                <p className="text-lg font-medium">Haber Detayı</p>
                <p className="text-sm">Analiz ve üretim için soldan bir haber seçin.</p>
              </div>
            </div>
          ) : articleLoading ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
              <LoaderCircle className="w-8 h-8 animate-spin text-white/20" />
              <p className="text-xs font-mono text-white/20 uppercase">Haber Yükleniyor</p>
            </div>
          ) : articleData ? (
            <div className="p-10 max-w-3xl mx-auto space-y-10 animate-in fade-in duration-500 pb-32">
              
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-bold font-mono px-3 py-1 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-full text-white">
                    {articleData.source_name?.toUpperCase()}
                  </span>
                  <div className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold font-mono",
                    articleData.viral_score >= 70 ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20" : "text-amber-400 bg-amber-500/10 border border-amber-500/20"
                  )}>
                    <Zap size={10} />
                    VIRAL SCORE: {articleData.viral_score}
                  </div>
                  <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">
                    {formatDistanceToNow(new Date(articleData.fetched_at), { addSuffix: true, locale: tr })}
                  </span>
                </div>

                <div className="space-y-4">
                  <h1 className="text-3xl font-bold text-white leading-tight tracking-tight">
                    {articleData.title_tr}
                  </h1>
                  <p className="text-sm text-[var(--text-muted)] font-mono italic leading-relaxed">
                    "{articleData.title_original}"
                  </p>
                </div>
              </div>

              <div className="prose prose-invert max-w-none prose-p:text-[15px] prose-p:leading-relaxed prose-p:text-[var(--text-secondary)] space-y-6 border-t border-white/5 pt-10">
                {articleData.full_summary_tr ? (
                  articleData.full_summary_tr.split("\n\n").map((p: string, i: number) => (
                    <p key={i}>{p}</p>
                  ))
                ) : (
                  <p>{articleData.summary}</p>
                )}
              </div>

              {/* Action Bar */}
              <div className="fixed bottom-10 left-1/2 -translate-x-1/2 ml-[200px] w-full max-w-xl px-4 z-20">
                <div className="bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl p-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-3">
                  <Button 
                    onClick={() => router.push(`/tweet-generator?news_id=${selectedNewsId}`)}
                    className="flex-1 bg-white text-black font-bold h-12 rounded-xl"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Tweet Üret
                  </Button>
                  <Button variant="ghost" className="border border-[var(--border-default)] px-5 h-12 rounded-xl" onClick={() => window.open(articleData.url, '_blank')}>
                    <ExternalLinkIcon size={18} />
                  </Button>
                  <Button variant="ghost" className="border border-[var(--border-default)] px-5 h-12 rounded-xl">
                    <BookmarkIcon size={18} />
                  </Button>
                </div>
              </div>

            </div>
          ) : null}
        </div>

      </div>

    </div>
  );
}
