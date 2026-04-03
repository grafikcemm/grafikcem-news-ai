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
import Link from "next/link";
import { Line, LineChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis, CartesianGrid } from "recharts";

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
  todayNewsDelta: number;
  avgScore: number;
  avgScoreDelta: number;
  pendingDrafts: number;
  pendingDraftsDelta: number;
  weeklyTrend?: { day: string; date: string; score: number }[];
}

function ViralTrendCard({ data }: { data: Stats["weeklyTrend"] }) {
  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-900">Haftalık Viral Trendi</CardTitle>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
            Son 7 Gün
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {!data ? (
          <Skeleton className="h-40 w-full" />
        ) : data.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-slate-400 text-sm">Yeterli veri yok</div>
        ) : (
          <div className="h-48 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  domain={[0, 100]}
                />
                <RechartsTooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white text-xs py-1.5 px-3 rounded-md shadow-xl border border-slate-700">
                          <span className="font-semibold">{d.date}</span>
                          <div className="mt-1 text-[#C8F135]">Ort. Skor: {Math.round(d.score)}</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#6366f1" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#6366f1", strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 6, fill: "#C8F135", stroke: "#000" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
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
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const yesterdayDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const yesterday = yesterdayDate.toISOString();
      const dayBefore = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Parallel fetch all stats
      const [
        newsToday, newsYesterdayData,
        avgResult, avgResultYesterday,
        pendingResult, pendingResultYesterday,
        topResult, recentResult, recommendedResult,
        weeklyTrendResult
      ] = await Promise.all([
          supabase.from("news_items").select("id", { count: "exact", head: true }).gte("fetched_at", yesterday),
          supabase.from("news_items").select("id", { count: "exact", head: true }).gte("fetched_at", dayBefore).lt("fetched_at", yesterday),
          supabase.from("news_items").select("viral_score").gte("fetched_at", yesterday).gt("viral_score", 0),
          supabase.from("news_items").select("viral_score").gte("fetched_at", dayBefore).lt("fetched_at", yesterday).gt("viral_score", 0),
          supabase.from("tweet_drafts").select("id", { count: "exact", head: true }).eq("status", "pending").gte("created_at", yesterday),
          supabase.from("tweet_drafts").select("id", { count: "exact", head: true }).eq("status", "pending").gte("created_at", dayBefore).lt("created_at", yesterday),
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
          supabase
            .from("news_items")
            .select("fetched_at, viral_score")
            .gte("fetched_at", sevenDaysAgo)
            .gt("viral_score", 0)
        ]);

      const scores = avgResult.data || [];
      const avg = scores.length > 0 ? Math.round(scores.reduce((sum, s) => sum + (s.viral_score || 0), 0) / scores.length) : 0;
      
      const scoresY = avgResultYesterday.data || [];
      const avgY = scoresY.length > 0 ? Math.round(scoresY.reduce((sum, s) => sum + (s.viral_score || 0), 0) / scoresY.length) : 0;

      const newsCount = newsToday.count || 0;
      const newsCountY = newsYesterdayData.count || 0;
      
      const pendingCount = pendingResult.count || 0;
      const pendingCountY = pendingResultYesterday.count || 0;

      // Group weekly trend
      const dailyMap: Record<string, { sum: number; count: number; dateStr: string }> = {};
      const formatter = new Intl.DateTimeFormat("tr-TR", { weekday: "short" });
      const fullFormatter = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short" });
      
      const weeklyData = weeklyTrendResult.data || [];
      weeklyData.forEach((item) => {
        const d = new Date(item.fetched_at);
        const dayKey = d.toISOString().split("T")[0]; // YYYY-MM-DD
        if (!dailyMap[dayKey]) {
          dailyMap[dayKey] = { sum: 0, count: 0, dateStr: fullFormatter.format(d) };
        }
        dailyMap[dayKey].sum += item.viral_score;
        dailyMap[dayKey].count += 1;
      });

      // Pad missing days for last 7 days
      const trendArray = [];
      for(let i=6; i>=0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const dayKey = d.toISOString().split("T")[0];
        const dayName = formatter.format(d);
        if (dailyMap[dayKey]) {
          trendArray.push({
            day: dayName,
            date: dailyMap[dayKey].dateStr,
            score: dailyMap[dayKey].sum / dailyMap[dayKey].count
          });
        } else {
          trendArray.push({
            day: dayName,
            date: fullFormatter.format(d),
            score: 0
          });
        }
      }

      setStats({
        todayNews: newsCount,
        todayNewsDelta: newsCount - newsCountY,
        avgScore: avg,
        avgScoreDelta: avg - avgY,
        pendingDrafts: pendingCount,
        pendingDraftsDelta: pendingCount - pendingCountY,
        weeklyTrend: trendArray
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

  function handleGenerate(newsId: string) {
    router.push(`/tweet-generator?news_id=${newsId}`);
  }

  const statCards = [
    {
      title: "Bugün Çekilen Haberler",
      value: stats?.todayNews ?? 0,
      delta: stats?.todayNewsDelta ?? 0,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>
      ),
      gradient: "from-blue-500 to-blue-600",
      deltaDesc: "düne göre"
    },
    {
      title: "Viral Skor Ortalaması",
      value: stats?.avgScore ?? 0,
      delta: stats?.avgScoreDelta ?? 0,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><rect width="20" height="5" x="2" y="7" rx="1"/></svg>
      ),
      gradient: "from-violet-500 to-purple-600",
      deltaDesc: "düne göre"
    },
    {
      title: "Bekleyen Taslaklar",
      value: stats?.pendingDrafts ?? 0,
      delta: stats?.pendingDraftsDelta ?? 0,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/></svg>
      ),
      gradient: "from-amber-500 to-orange-500",
      deltaDesc: "düne göre yeni"
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
                  <div className="flex items-end gap-3">
                    <p className="text-3xl font-bold text-slate-900">{card.value}</p>
                    {(card.delta !== undefined && card.delta !== 0) && (
                      <div className={`flex items-center gap-1 text-xs font-semibold mb-1 ${card.delta > 0 ? "text-emerald-500" : "text-rose-500"}`}>
                        {card.delta > 0 ? "↑" : "↓"} {card.delta > 0 ? "+" : ""}{card.delta}
                      </div>
                    )}
                  </div>
                  {card.deltaDesc && (
                    <p className="text-[10px] text-slate-400 mt-1">{card.deltaDesc}</p>
                  )}
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
                className="bg-blue-500 hover:bg-blue-600 text-white shrink-0"
              >
                Tweet Üret
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

      {/* Channels Overview */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">Kanallar</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { id: "grafikcem", label: "@grafikcem", desc: "X — AI & Tasarım", dot: "bg-blue-400", href: "/channels/grafikcem" },
            { id: "maskulenkod", label: "@maskulenkod", desc: "X — Disiplin & Mentorluk", dot: "bg-slate-500", href: "/channels/maskulenkod" },
            { id: "linkedin", label: "LinkedIn", desc: "Profesyonel İçerik", dot: "bg-indigo-500", href: "/channels/linkedin" },
          ].map((ch) => (
            <Link key={ch.id} href={ch.href}>
              <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${ch.dot}`} />
                    <span className="font-semibold text-slate-900 text-sm">{ch.label}</span>
                  </div>
                  <p className="text-xs text-slate-500">{ch.desc}</p>
                  <p className="text-xs text-blue-500 mt-2 font-medium">İçerik görüntüle →</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Viral Trend Chart */}
      <ViralTrendCard data={stats?.weeklyTrend} />

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
