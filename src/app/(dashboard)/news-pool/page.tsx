"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScoreBadge } from "@/components/ui/score-badge";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileTextIcon, HelpCircleIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

interface NewsItem {
  id: string;
  title: string;
  title_tr: string | null;
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
        .order("created_at", { ascending: false })
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
    <div className="flex flex-col lg:flex-row h-full min-h-[calc(100vh)] bg-[var(--surface-default)]">
      {/* SOL: LİSTE MODÜLÜ */}
      <div className="w-full lg:w-[45%] flex flex-col h-full lg:h-[calc(100vh)] border-r border-[var(--border-subtle)] bg-[var(--surface-default)]">
        
        {/* Header Alanı */}
        <div className="p-[20px] pb-3 border-b border-[var(--border-subtle)] shrink-0">
           <h1 className="text-display mb-1">Haber Havuzu</h1>
           <p className="text-small">Trend haberleri araştır, özetle ve üretime dönüştür.</p>
           
           {/* Ara, Filtrele */}
           <div className="mt-[20px] space-y-[16px]">
              <Input
                placeholder="Haberlerde ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-[var(--surface-sunken)] border-[var(--border-subtle)]"
              />
              <div className="flex flex-wrap gap-[8px]">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setActiveCategory(cat.value)}
                    className={`px-[12px] py-[6px] rounded-[var(--radius-md)] text-[12px] font-medium transition-all duration-120 ${
                      activeCategory === cat.value
                        ? "bg-[var(--text-primary)] text-[var(--surface-default)]"
                        : "bg-[var(--surface-raised)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-[8px] items-center">
                 <span className="text-[12px] text-[var(--text-tertiary)] font-medium">Kaynak:</span>
                 <button
                    onClick={() => setActiveSource("all")}
                    className={`px-[10px] py-[4px] rounded-[var(--radius-sm)] text-[11px] font-medium transition-all ${
                      activeSource === "all" ? "bg-[var(--accent-subtle)] text-[var(--accent)]" : "bg-[var(--surface-raised)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-overlay)]"
                    }`}
                  >
                    Hepsi
                  </button>
                  {uniqueSources.map(src => (
                    <button
                      key={src}
                      onClick={() => setActiveSource(src)}
                      className={`px-[10px] py-[4px] rounded-[var(--radius-sm)] text-[11px] font-medium transition-all ${
                         activeSource === src ? "bg-[var(--accent-subtle)] text-[var(--accent)]" : "bg-[var(--surface-raised)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-overlay)]"
                      }`}
                    >
                      {src}
                    </button>
                  ))}
              </div>
           </div>
        </div>

        {/* Liste Alanı */}
        <div className="flex-1 overflow-y-auto w-full scrollbar-thin">
           {loading ? (
             <div className="p-[20px] space-y-[12px]">
               {[...Array(6)].map((_, i) => (
                 <Skeleton key={i} className="h-[70px] w-full bg-[var(--surface-raised)] rounded-[var(--radius-md)]" />
               ))}
             </div>
           ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-[var(--text-tertiary)] text-[13px]">Haber bulunamadı</div>
           ) : (
             <div className="flex flex-col divide-y divide-[var(--border-subtle)]">
               {filtered.map(item => {
                 const isSelected = selectedNewsId === item.id;
                 return (
                   <div 
                     key={item.id} 
                     onClick={() => handleOpenArticle(item.id)}
                     className={`flex gap-[12px] p-[16px] cursor-pointer transition-colors duration-120 ${isSelected ? "bg-[var(--surface-overlay)]" : "hover:bg-[var(--surface-overlay)]"}`}
                   >
                     <div className="pt-1 w-2 flex justify-center">
                        {!item.is_read && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0 shadow-[0_0_8px_var(--accent)] mt-1" />}
                     </div>
                     <div className="flex-1 min-w-0 flex flex-col justify-between pr-2">
                        <h3 className={`text-[14px] leading-snug line-clamp-2 ${item.is_read ? 'text-[var(--text-secondary)] font-normal' : 'text-[var(--text-primary)] font-medium'}`}>
                          {item.title_tr || item.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-2">
                           <span className="text-[11px] text-[var(--text-tertiary)]">{item.sources?.name}</span>
                           <span className="text-[11px] text-[var(--border-strong)]">•</span>
                           <span className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wider">{formatDistanceToNow(new Date(item.fetched_at), { addSuffix: true, locale: tr })}</span>
                           {item.is_used && (
                             <>
                               <span className="text-[11px] text-[var(--border-strong)]">•</span>
                               <span className="text-[10px] bg-[var(--surface-raised)] text-[var(--text-secondary)] px-1 rounded">Kullanıldı</span>
                             </>
                           )}
                        </div>
                     </div>
                     <div className="flex flex-col items-end justify-between shrink-0 pl-2">
                        <ScoreBadge score={item.viral_score} />
                     </div>
                   </div>
                 );
               })}
             </div>
           )}
        </div>
      </div>

      {/* SAĞ: OKUMA MODÜLÜ */}
      <div className="w-full lg:w-[55%] flex flex-col h-[600px] lg:h-[calc(100vh)] bg-[var(--surface-sunken)] p-[24px] lg:p-[40px] overflow-y-auto scrollbar-thin">
         {!selectedNewsId ? (
            <div className="m-auto w-full max-w-sm">
                <EmptyState 
                  icon={<HelpCircleIcon size={32} />}
                  title="Bir Haber Seçin"
                  description="Haberi özetlemek ve tweet formatında içerik üretmek için sol taraftan bir haber seçin."
                />
            </div>
         ) : articleLoading ? (
            <div className="space-y-[24px] max-w-3xl animate-pulse">
               <Skeleton className="w-[100px] h-6 bg-[var(--surface-raised)] rounded" />
               <Skeleton className="w-full h-12 bg-[var(--surface-raised)] rounded" />
               <Skeleton className="w-3/4 h-12 bg-[var(--surface-raised)] rounded" />
               <div className="pt-[40px] space-y-[12px]">
                 <Skeleton className="w-full h-4 bg-[var(--surface-raised)] rounded" />
                 <Skeleton className="w-full h-4 bg-[var(--surface-raised)] rounded" />
                 <Skeleton className="w-[85%] h-4 bg-[var(--surface-raised)] rounded" />
                 <Skeleton className="w-full h-4 bg-[var(--surface-raised)] rounded mt-4" />
                 <Skeleton className="w-[90%] h-4 bg-[var(--surface-raised)] rounded" />
               </div>
            </div>
         ) : articleData ? (
            <div className="flex flex-col flex-1 max-w-3xl m-auto w-full justify-start h-full pt-4">
               {/* Metadata */}
               <div className="flex flex-wrap items-center gap-[12px] mb-[20px]">
                  <span className="text-[12px] font-medium text-[var(--text-primary)] px-[10px] py-[4px] bg-[var(--surface-raised)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)]">
                     {articleData.source_name}
                  </span>
                  <ScoreBadge score={articleData.viral_score} />
                  <span className="text-[12px] text-[var(--text-tertiary)] tracking-wide uppercase px-2">
                     {articleData.fetched_at && formatDistanceToNow(new Date(articleData.fetched_at), { addSuffix: true, locale: tr })}
                  </span>
               </div>

               {/* Başlık */}
               <h1 className="text-[28px] lg:text-[32px] font-bold text-[var(--text-primary)] leading-[1.1] tracking-tight mb-[16px]">
                 {articleData.title_tr}
               </h1>
               {articleData.title_original && articleData.title_original !== articleData.title_tr && (
                 <p className="text-[14px] text-[var(--text-tertiary)] italic mb-[32px] font-[450] leading-snug">
                   "{articleData.title_original}"
                 </p>
               )}

               <hr className="border-[var(--border-subtle)] mb-[32px]" />

               {/* Metin */}
               <div className="flex-1 space-y-[20px]">
                 {articleData.full_summary_tr ? (
                    articleData.full_summary_tr.split("\n\n").map((paragraph, i) => (
                      <p key={i} className="text-body text-[15px] lg:text-[16px] leading-[1.7] text-[var(--text-secondary)]">
                        {paragraph}
                      </p>
                    ))
                  ) : (
                    <p className="text-body text-[15px] lg:text-[16px] leading-[1.7] text-[var(--text-secondary)]">
                      {articleData.summary || "Özet mevcut değil."}
                    </p>
                  )}
               </div>

               {/* Aksiyon Bar */}
               <div className="sticky bottom-0 mt-[40px] pt-[20px] pb-[20px] bg-gradient-to-t from-[var(--surface-sunken)] to-transparent flex gap-4">
                  <Button 
                    variant="default" 
                    size="lg" 
                    className="flex-1 h-[48px] text-[15px] shadow-lg shadow-[var(--accent)]/10"
                    onClick={() => handleGenerate(selectedNewsId)}
                    disabled={generatingId === selectedNewsId}
                  >
                     {generatingId === selectedNewsId ? "Üretiliyor..." : "Tweet Üret"}
                  </Button>
                  <a href={articleData.url} target="_blank" rel="noopener noreferrer" className="flex-1 max-w-[200px]">
                     <Button variant="secondary" size="lg" className="w-full h-[48px] text-[15px]">Orijinal Kaynak ↗</Button>
                  </a>
               </div>
            </div>
         ) : (
            <div className="p-12 text-center text-[var(--text-tertiary)]">
               Makale yüklenemedi.
            </div>
         )}
      </div>

    </div>
  );
}
