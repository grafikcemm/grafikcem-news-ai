"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { useRouter } from "next/navigation";

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
  sources?: { name: string };
}

interface RecommendedDraft {
  id: string;
  content: string;
  tweet_type: string;
  ai_score: number;
  news_items?: { title: string } | null;
}

interface Stats {
  todayNews: number;
  avgScore: number;
  pendingDrafts: number;
}

function OptimalTimesCard() {
  const [data, setData] = useState<{ hours: Record<number, number>; best_hours: number[]; message: string; is_estimated: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/analysis/optimal-times")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {});
  }, []);

  const now = new Date().getHours();
  const isGoodTime = data?.best_hours?.includes(now);

  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-900">En İyi Paylaşım Saatleri</CardTitle>
          {data && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isGoodTime ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
              {isGoodTime ? `✓ Şu an iyi saat (${now}:00)` : `Şu an: ${now}:00`}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!data ? (
          <Skeleton className="h-12 w-full" />
        ) : (
          <>
            <div className="flex items-end gap-0.5 h-12">
              {Array.from({ length: 24 }, (_, h) => {
                const val = data.hours?.[h] ?? 0;
                const isBest = data.best_hours?.includes(h);
                const isCurrent = h === now;
                return (
                  <div key={h} className="flex-1 flex flex-col items-center gap-0.5" title={`${h}:00 — ${val}%`}>
                    <div
                      className={`w-full rounded-sm transition-all ${isCurrent ? "bg-blue-500" : isBest ? "bg-violet-400" : "bg-slate-200"}`}
                      style={{ height: `${Math.max(4, val)}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>0:00</span><span>6:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
            </div>
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-3 h-2 rounded-sm bg-violet-400 inline-block" /> En iyi saatler:{" "}
                {data.best_hours?.map((h) => `${h}:00`).join(", ")}
              </div>
              {data.is_estimated && (
                <span className="text-[10px] text-slate-400 italic">Türk X kitlesi ortalaması</span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20"
      : score >= 60
      ? "bg-amber-500/15 text-amber-600 border-amber-500/20"
      : "bg-slate-200 text-slate-500 border-slate-300";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${color}`}>
      {score}
    </span>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [topNews, setTopNews] = useState<NewsItem | null>(null);
  const [recentNews, setRecentNews] = useState<NewsItem[]>([]);
  const [recommendedDrafts, setRecommendedDrafts] = useState<RecommendedDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Parallel fetch all stats
      const [newsToday, avgResult, pendingResult, topResult, recentResult, recommendedResult] =
        await Promise.all([
          supabase
            .from("news_items")
            .select("id", { count: "exact", head: true })
            .gte("fetched_at", yesterday),
          supabase
            .from("news_items")
            .select("viral_score")
            .gte("fetched_at", yesterday)
            .gt("viral_score", 0),
          supabase
            .from("tweet_drafts")
            .select("id", { count: "exact", head: true })
            .eq("status", "pending"),
          supabase
            .from("news_items")
            .select("*, sources(name)")
            .order("viral_score", { ascending: false })
            .gte("fetched_at", yesterday)
            .limit(1)
            .single(),
          supabase
            .from("news_items")
            .select("*, sources(name)")
            .order("fetched_at", { ascending: false })
            .limit(10),
          supabase
            .from("tweet_drafts")
            .select("id, content, tweet_type, ai_score, news_items(title)")
            .eq("is_recommended", true)
            .eq("status", "pending")
            .order("ai_score", { ascending: false }),
        ]);

      const scores = avgResult.data || [];
      const avg =
        scores.length > 0
          ? Math.round(scores.reduce((sum, s) => sum + (s.viral_score || 0), 0) / scores.length)
          : 0;

      setStats({
        todayNews: newsToday.count || 0,
        avgScore: avg,
        pendingDrafts: pendingResult.count || 0,
      });

      if (topResult.data) setTopNews(topResult.data as NewsItem);
      if (recentResult.data) setRecentNews(recentResult.data as NewsItem[]);
      if (recommendedResult.data) setRecommendedDrafts(recommendedResult.data as unknown as RecommendedDraft[]);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate(newsId: string) {
    setGenerating(true);
    try {
      const res = await fetch("/api/tweet/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ news_id: newsId }),
      });
      if (res.ok) {
        router.push(`/tweet-generator?news_id=${newsId}`);
      }
    } catch (err) {
      console.error("Generate error:", err);
    } finally {
      setGenerating(false);
    }
  }

  const statCards = [
    {
      title: "Bugün Çekilen Haberler",
      value: stats?.todayNews ?? 0,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>
      ),
      gradient: "from-blue-500 to-blue-600",
    },
    {
      title: "Viral Skor Ortalaması",
      value: stats?.avgScore ?? 0,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><rect width="20" height="5" x="2" y="7" rx="1"/></svg>
      ),
      gradient: "from-violet-500 to-purple-600",
    },
    {
      title: "Bekleyen Taslaklar",
      value: stats?.pendingDrafts ?? 0,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/></svg>
      ),
      gradient: "from-amber-500 to-orange-500",
    },
  ];

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Panel</h1>
        <p className="text-slate-500 text-sm mt-1">Günlük özet ve istatistikler</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((card, i) => (
          <Card key={i} className="border-0 shadow-sm bg-white">
            <CardContent className="p-4 lg:p-6">
              {loading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                      {card.title}
                    </p>
                    <div className={`w-8 h-8 rounded-lg bg-linear-to-br ${card.gradient} flex items-center justify-center text-white`}>
                      {card.icon}
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-slate-900">{card.value}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top News Hero */}
      {loading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : topNews ? (
        <Card className="border-0 shadow-sm bg-linear-to-r from-slate-900 to-slate-800 text-white overflow-hidden">
          <CardContent className="p-6 lg:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-medium text-blue-300 uppercase tracking-wider">
                    🔥 Bugünün En İyi Haberi
                  </span>
                  <ScoreBadge score={topNews.viral_score} />
                </div>
                <h2 className="text-lg lg:text-xl font-bold mb-2">{topNews.title}</h2>
                <p className="text-slate-400 text-sm line-clamp-2 mb-4">
                  {topNews.summary}
                </p>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-slate-400">
                    {topNews.sources?.name}
                  </span>
                  {topNews.viral_reason && (
                    <span className="text-xs text-blue-300 italic">
                      {topNews.viral_reason}
                    </span>
                  )}
                </div>
              </div>
              <Button
                onClick={() => handleGenerate(topNews.id)}
                disabled={generating}
                className="bg-blue-500 hover:bg-blue-600 text-white shrink-0"
              >
                {generating ? "Üretiliyor..." : "Tweet Üret"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-8 text-center text-slate-400">
            Henüz bugün için haber çekilmedi.
          </CardContent>
        </Card>
      )}

      {/* Bugünün Önerileri — recommended drafts */}
      {!loading && recommendedDrafts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900">Bugünün Önerileri</h2>
          {recommendedDrafts.map((draft) => (
            <Card
              key={draft.id}
              className="border-2 border-indigo-500/30 shadow-sm bg-white"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          draft.tweet_type === "thread"
                            ? "border-violet-300 text-violet-600"
                            : "border-blue-300 text-blue-600"
                        }`}
                      >
                        {draft.tweet_type === "thread" ? "Thread" : "Single"}
                      </Badge>
                      <span className="text-xs font-bold text-indigo-500">
                        AI: {draft.ai_score}
                      </span>
                      {draft.news_items?.title && (
                        <span className="text-xs text-slate-400 truncate">
                          {draft.news_items.title}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 line-clamp-2">{draft.content}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => router.push(`/tweet-generator?news_id=${draft.id}`)}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white shrink-0"
                  >
                    Görüntüle
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Optimal Posting Times */}
      <OptimalTimesCard />

      {/* Recent News */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-900">Son Haberler</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : recentNews.length === 0 ? (
            <div className="p-8 text-center text-slate-400">Henüz haber yok</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentNews.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 transition-colors"
                >
                  <ScoreBadge score={item.viral_score} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{item.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {item.sources?.name} •{" "}
                      {formatDistanceToNow(new Date(item.fetched_at), {
                        addSuffix: true,
                        locale: tr,
                      })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleGenerate(item.id)}
                    className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 shrink-0 text-xs"
                  >
                    Tweet Üret
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
