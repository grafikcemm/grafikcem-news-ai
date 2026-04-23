"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  NewspaperIcon, 
  PenToolIcon, 
  LayoutIcon, 
  ImageIcon,
  ArrowRightIcon 
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface DashboardStats {
  todayNewsCount: number;
  totalPendingDrafts: number;
  draftsByChannel: Record<string, number>;
  latestNews: {
    title: string;
    source: string;
    time: string;
  } | null;
  weekContentCount: number;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    todayNewsCount: 0,
    totalPendingDrafts: 0,
    draftsByChannel: {},
    latestNews: null,
    weekContentCount: 0,
  });

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Günaydın";
    if (hour < 18) return "İyi Günler";
    return "İyi Akşamlar";
  })();

  const todayTR = new Date().toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    weekday: "long",
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      const [newsTodayRes, draftsRes, latestNewsRes, calendarRes] = await Promise.all([
        supabase.from('news_items').select('*', { count: 'exact', head: true })
          .gte('fetched_at', today + 'T00:00:00Z'),
        supabase.from('tweet_drafts').select('channel').eq('status', 'pending'),
        supabase.from('news_items').select('title_tr, title, source_name, fetched_at')
          .order('fetched_at', { ascending: false }).limit(1).single(),
        supabase.from('content_items').select('*', { count: 'exact', head: true })
          .gte('scheduled_date', today)
      ]);

      const draftsMap: Record<string, number> = {};
      draftsRes.data?.forEach(d => {
        draftsMap[d.channel] = (draftsMap[d.channel] || 0) + 1;
      });

      const latest = latestNewsRes.data;
      const timeAgo = latest ? formatTimeAgo(new Date(latest.fetched_at)) : "";

      setStats({
        todayNewsCount: newsTodayRes.count || 0,
        totalPendingDrafts: draftsRes.data?.length || 0,
        draftsByChannel: draftsMap,
        latestNews: latest ? {
          title: latest.title_tr || latest.title,
          source: latest.source_name || "Kaynak",
          time: timeAgo
        } : null,
        weekContentCount: calendarRes.count || 0,
      });
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  function formatTimeAgo(date: Date) {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60);
    if (diff < 60) return `${diff} dk önce`;
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `${hours} sa önce`;
    return `${Math.floor(hours / 24)} gün önce`;
  }

  return (
    <div className="flex flex-col w-full h-screen p-6 bg-[var(--surface-base)] overflow-hidden gap-6">
      {/* SELAMLAMA */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-mono text-[var(--text-primary)]">
          // {greeting}, Ali Cem
        </h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">{todayTR}</p>
      </div>

      {/* 2x2 METRİK GRID */}
      <div className="grid grid-cols-2 grid-rows-2 flex-1 gap-4">
        {/* KART 1: HABER HAVUZU */}
        <MetricCard
          tag="NWS"
          title="HABER HAVUZU"
          value={stats.todayNewsCount}
          subValue="/ 5 günlük limit"
          link="/news-pool"
          progress={(stats.todayNewsCount / 5) * 100}
        />

        {/* KART 2: TWEET TASLAKLARI */}
        <MetricCard
          tag="DFT"
          title="BEKLEYEN TASLAKLAR"
          value={stats.totalPendingDrafts}
          subValue={
            <div className="flex gap-2">
              <span>@grafikcem: {stats.draftsByChannel.grafikcem || 0}</span>
              <span className="opacity-20">•</span>
              <span>@maskulenkod: {stats.draftsByChannel.maskulenkod || 0}</span>
            </div>
          }
          link="/tweet-generator"
        />

        {/* KART 3: SON HABER */}
        <MetricCard
          tag="NEW"
          title="SON HABER"
          value={stats.latestNews?.title.slice(0, 60) + (stats.latestNews?.title.length! > 60 ? "..." : "") || "—"}
          valueClass="text-lg leading-relaxed font-medium"
          subValue={stats.latestNews ? `${stats.latestNews.source} · ${stats.latestNews.time}` : "Haber yok"}
          link="/news-pool"
        />

        {/* KART 4: İÇERİK TAKVİMİ */}
        <MetricCard
          tag="CAL"
          title="BU HAFTA"
          value={stats.weekContentCount}
          subValue="planlanmış içerik"
          link="/dashboard/content-calendar"
        />
      </div>

      {/* HIZLI ERİŞİM */}
      <div className="grid grid-cols-4 gap-3">
        <QuickButton label="Haber Havuzu" icon="🔥" href="/news-pool" />
        <QuickButton label="Tweet Üret" icon="✍️" href="/tweet-generator" />
        <QuickButton label="Carousel" icon="🎠" href="/dashboard/carousel-planner" />
        <QuickButton label="Prompt Studio" icon="📸" href="/dashboard/prompt-studio" />
      </div>
    </div>
  );
}

function MetricCard({ 
  tag,
  title, 
  value, 
  subValue, 
  link,
  progress,
  valueClass = "text-[36px]"
}: { 
  tag: string;
  title: string; 
  value: string | number; 
  subValue: React.ReactNode; 
  link: string;
  progress?: number;
  valueClass?: string;
}) {
  return (
    <Link href={link} className="group relative bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[20px] p-5 flex flex-col justify-between hover:border-[var(--border-default)] transition-all">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-[var(--accent)]">[{tag}]</span>
          <p className="text-[11px] uppercase tracking-widest text-[var(--text-tertiary)] font-semibold">{title}</p>
        </div>
        <h2 className={cn("font-bold text-[var(--text-primary)] tabular-nums", valueClass)}>
          {value}
        </h2>
        <div className="text-[12px] text-[var(--text-secondary)]">{subValue}</div>
      </div>
      
      {progress !== undefined && (
        <div className="w-full bg-[var(--border-subtle)] h-[3px] rounded-full mt-4 overflow-hidden">
          <div 
            className="bg-[var(--accent)] h-full transition-all duration-700" 
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}

      <div className="absolute bottom-4 right-4 text-[11px] text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 underline underline-offset-4">
        Git <ArrowRightIcon size={10} />
      </div>
    </Link>
  );
}

function QuickButton({ label, icon, href }: { label: string; icon: string; href: string }) {
  return (
    <Link href={href}>
      <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] hover:border-[var(--accent)] rounded-xl p-3 flex items-center gap-3 transition-all group">
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">{label}</span>
      </div>
    </Link>
  );
}
