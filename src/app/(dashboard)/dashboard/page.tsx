"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  ArrowRightIcon, 
  ExternalLinkIcon, 
  SparklesIcon, 
  PlusIcon,
  ClockIcon,
  MessageSquareIcon,
  HashIcon,
  TrendingUp,
  Newspaper,
  CalendarDays,
  Zap,
  ArrowUpRight,
  TrendingDown,
  LoaderCircle,
  Settings
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface DashboardStats {
  todayNewsCount: number;
  totalPendingDrafts: number;
  avgViralScore: number;
  weekContentCount: number;
  highScoreNews: any[];
  recentDrafts: any[];
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    todayNewsCount: 0,
    totalPendingDrafts: 0,
    avgViralScore: 0,
    weekContentCount: 0,
    highScoreNews: [],
    recentDrafts: [],
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      const weekStartStr = weekStart.toISOString().split('T')[0];

      const [
        newsTodayRes, 
        pendingDraftsRes, 
        avgScoreRes, 
        weekContentRes,
        highScoreNewsRes,
        recentDraftsRes
      ] = await Promise.all([
        supabase.from('news_items').select('*', { count: 'exact', head: true })
          .gte('fetched_at', today + 'T00:00:00Z'),
        supabase.from('tweet_drafts').select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase.from('news_items').select('viral_score').gte('fetched_at', today + 'T00:00:00Z'),
        supabase.from('content_items').select('*', { count: 'exact', head: true })
          .gte('scheduled_date', weekStartStr),
        supabase.from('news_items')
          .select('id, title, title_tr, viral_score, category, fetched_at, sources(name)')
          .order('viral_score', { ascending: false })
          .limit(6),
        supabase.from('tweet_drafts')
          .select('id, content, channel, created_at')
          .order('created_at', { ascending: false })
          .limit(3)
      ]);

      const scores = avgScoreRes.data || [];
      const avg = scores.length > 0 
        ? Math.round(scores.reduce((acc, curr) => acc + (curr.viral_score || 0), 0) / scores.length) 
        : 0;

      setStats({
        todayNewsCount: newsTodayRes.count || 0,
        totalPendingDrafts: pendingDraftsRes.count || 0,
        avgViralScore: avg,
        weekContentCount: weekContentRes.count || 0,
        highScoreNews: highScoreNewsRes.data || [],
        recentDrafts: recentDraftsRes.data || [],
      });
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoaderCircle className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 animate-in fade-in duration-700 max-w-[1600px] mx-auto">
      
      {/* 1. Metric Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          label="GÜNLÜK HABER" 
          value={stats.todayNewsCount} 
          icon={<Newspaper className="w-4 h-4" />}
          trend={+4}
        />
        <MetricCard 
          label="BEKLEYEN TASLAK" 
          value={stats.totalPendingDrafts} 
          icon={<MessageSquareIcon className="w-4 h-4" />}
        />
        <MetricCard 
          label="VİRAL SKOR" 
          value={`${stats.avgViralScore}%`} 
          icon={<Zap className="w-4 h-4" />}
          trend={2}
        />
        <MetricCard 
          label="HAFTALIK İÇERİK" 
          value={stats.weekContentCount} 
          icon={<CalendarDays className="w-4 h-4" />}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left: High Score News */}
        <div className="xl:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight">Popüler Haberler</h2>
            <Link href="/dashboard/news-pool" className="text-xs text-[var(--text-muted)] hover:text-white flex items-center gap-1 transition-colors">
              Hepsini Gör <ArrowRightIcon size={12} />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.highScoreNews.map((news) => (
              <Link 
                key={news.id} 
                href={`/tweet-generator?news_id=${news.id}`}
                className="group p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-all flex flex-col justify-between h-[160px]"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-muted)] uppercase">
                      {news.category}
                    </span>
                    <div className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold font-mono",
                      news.viral_score >= 70 ? "text-emerald-400 bg-emerald-500/10" : "text-amber-400 bg-amber-500/10"
                    )}>
                      {news.viral_score}% SCORE
                    </div>
                  </div>
                  <h4 className="text-sm font-semibold text-white leading-tight line-clamp-2 group-hover:text-[var(--accent)] transition-colors">
                    {news.title_tr || news.title}
                  </h4>
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase">{news.sources?.name}</span>
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">{formatTimeAgo(new Date(news.fetched_at))}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Right: Recent Drafts & Actions */}
        <div className="xl:col-span-4 space-y-8">
          <div className="space-y-4">
            <h2 className="text-lg font-bold tracking-tight">Son Taslaklar</h2>
            <div className="space-y-3">
              {stats.recentDrafts.map((draft) => (
                <div key={draft.id} className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                      <span className="text-[10px] font-bold font-mono text-white">@{draft.channel}</span>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase">{formatTimeAgo(new Date(draft.created_at))}</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed italic">
                    "{draft.content}"
                  </p>
                </div>
              ))}
              <Link href="/tweet-generator" className="block w-full py-3 text-center text-xs font-bold text-white border border-[var(--border-default)] rounded-xl hover:bg-[var(--bg-elevated)] transition-all">
                Tümünü Yönet
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-bold tracking-tight">Hızlı İşlemler</h2>
            <div className="grid grid-cols-2 gap-3">
              <QuickAction icon={<SparklesIcon size={14} />} label="AI Analiz" />
              <QuickAction icon={<PlusIcon size={14} />} label="Yeni Haber" />
              <QuickAction icon={<MessageSquareIcon size={14} />} label="Rapor Al" />
              <QuickAction icon={<Settings size={14} />} label="Ayarlar" href="/settings" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon, trend }: { label: string; value: string | number; icon: React.ReactNode; trend?: number }) {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-4 px-[18px] space-y-3">
      <div className="flex items-center justify-between text-[var(--text-muted)]">
        <span className="text-[10px] font-bold font-mono uppercase tracking-widest">{label}</span>
        {icon}
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-bold text-white">{value}</span>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-[10px] font-bold font-mono",
            trend > 0 ? "text-emerald-400" : "text-red-400"
          )}>
            {trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
    </div>
  );
}

function QuickAction({ icon, label, href }: { icon: React.ReactNode; label: string; href?: string }) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] cursor-pointer transition-all group">
      <div className="text-[var(--text-muted)] group-hover:text-white transition-colors">
        {icon}
      </div>
      <span className="text-[10px] font-bold font-mono uppercase text-[var(--text-muted)] group-hover:text-white transition-colors">{label}</span>
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

function formatTimeAgo(date: Date) {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60);
  if (diff < 1) return "AZ ÖNCE";
  if (diff < 60) return `${diff} DK ÖNCE`;
  const hours = Math.floor(diff / 60);
  if (hours < 24) return `${hours} SA ÖNCE`;
  return `${Math.floor(hours / 24)} GÜN ÖNCE`;
}
