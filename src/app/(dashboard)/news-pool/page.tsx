"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  category: string;
  viral_score: number;
  viral_reason: string;
  published_at: string;
  fetched_at: string;
  is_used: boolean;
  sources?: { name: string };
}

const categories = [
  { value: "all", label: "Hepsi" },
  { value: "ai_news", label: "AI" },
  { value: "design", label: "Design" },
  { value: "automation", label: "Otomasyon" },
  { value: "dev_tools", label: "Dev Tools" },
  { value: "turkish", label: "Türkçe" },
];

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
      : score >= 60
      ? "bg-amber-500/15 text-amber-700 border-amber-500/30"
      : "bg-slate-100 text-slate-500 border-slate-200";
  return (
    <span
      className={`inline-flex items-center justify-center w-10 h-10 rounded-xl text-sm font-bold border ${color} shrink-0`}
    >
      {score}
    </span>
  );
}

export default function NewsPoolPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [generatingId, setGeneratingId] = useState<string | null>(null);
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
        .order("viral_score", { ascending: false })
        .limit(50);

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

  async function handleGenerate(newsId: string) {
    setGeneratingId(newsId);
    try {
      const res = await fetch("/api/tweet/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ news_id: newsId }),
      });
      if (res.ok) {
        toast.success("Tweet seçenekleri üretildi!");
        router.push(`/tweet-generator?news_id=${newsId}`);
      } else {
        toast.error("Tweet üretimi başarısız oldu");
      }
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setGeneratingId(null);
    }
  }

  const filtered = news.filter(
    (item) =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      (item.summary && item.summary.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Haber Havuzu</h1>
        <p className="text-slate-500 text-sm mt-1">
          Tüm haberler viral skorlarına göre sıralanmış
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeCategory === cat.value
                ? "bg-slate-900 text-white shadow-md"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <Input
          placeholder="Haberlerde ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-white border-slate-200 h-11"
        />
      </div>

      {/* News list — vertical, full-width cards */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center text-slate-400">
            Haber bulunamadı
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <Card
              key={item.id}
              className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow"
            >
              <CardContent className="p-4 flex items-center gap-4">
                <ScoreBadge score={item.viral_score} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 line-clamp-1 flex-1">
                      {item.title}
                    </h3>
                    {item.is_used && (
                      <span className="text-[10px] font-medium bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded shrink-0">
                        Kullanıldı
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-400">{item.sources?.name}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs text-slate-400">
                      {formatDistanceToNow(new Date(item.fetched_at), {
                        addSuffix: true,
                        locale: tr,
                      })}
                    </span>
                    {item.viral_reason && (
                      <>
                        <span className="text-slate-300 hidden sm:inline">•</span>
                        <span className="text-xs text-violet-500 italic hidden sm:inline">
                          {item.viral_reason}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleGenerate(item.id)}
                  disabled={generatingId === item.id}
                  className="bg-blue-500 hover:bg-blue-600 text-white shrink-0 h-11 min-w-[100px]"
                >
                  {generatingId === item.id ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" className="opacity-25" />
                        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
                      </svg>
                      Üretiliyor
                    </span>
                  ) : (
                    "Tweet Üret"
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
