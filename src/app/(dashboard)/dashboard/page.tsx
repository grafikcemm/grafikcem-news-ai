"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { ScoreBadge } from "@/components/ui/score-badge";
import { StatusChip } from "@/components/ui/status-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { startOfWeek, endOfWeek } from "date-fns";
import Link from "next/link";
import { FileTextIcon } from "lucide-react";

interface NewsItem { id: string; title: string; summary: string; viral_score: number; fetched_at: string; sources?: { name: string }[] | { name: string } | null; }
interface ContentItem { id: string; title: string; platform: string; format: string; status: string; scheduled_date: string; }
interface FocusTask { id: string; title: string; priority: number; frequency: string; is_completed: boolean; completed_at: string | null; }
interface Lead { id: string; company_name: string; sector: string; score: number; status: string; assigned_day?: string; }
interface TweetDraft { id: string; text?: string; content?: string; platform?: string; status: string; }

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Günaydın, Ali Cem. 🌅";
  if (hour < 18) return "İyi günler, Ali Cem. ☀️";
  return "İyi akşamlar, Ali Cem. 🌙";
}

function getFormattedDate() {
  return new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
}

const PLATFORM_DOT: Record<string, string> = {
  "@grafikcem": "#E879A0",
  "@maskulenkod": "#60A5FA",
  "LinkedIn": "#34D399",
};

export default function DashboardPage() {
  const [greeting] = useState(getGreeting());
  const [loading, setLoading] = useState(true);

  const [focusTasks, setFocusTasks] = useState<FocusTask[]>([]);
  const [opportunityNews, setOpportunityNews] = useState<NewsItem | null>(null);
  const [todayLead, setTodayLead] = useState<Lead | null>(null);

  const [contentQueue, setContentQueue] = useState<TweetDraft[]>([]);
  const [leadQueue, setLeadQueue] = useState<Lead[]>([]);
  const [thisWeek, setThisWeek] = useState<ContentItem[]>([]);

  const [trendingNews, setTrendingNews] = useState<NewsItem[]>([]);
  const [newsCount, setNewsCount] = useState(0);
  const [avgScore, setAvgScore] = useState(0);

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    setLoading(true);
    try {
      // 1. Focus Tasks (priority = 1)
      const { data: tasks } = await supabase.from("focus_tasks")
        .select("*")
        .eq("priority", 1)
        .eq("frequency", "daily")
        .order("is_completed", { ascending: true })
        .limit(5);
      if (tasks) setFocusTasks(tasks as FocusTask[]);

      // 2. Opportunity News (Max 1)
      const { data: opNews } = await supabase.from("news_items")
        .select("id, title, summary, viral_score, fetched_at, sources(name)")
        .order("viral_score", { ascending: false })
        .limit(1);
      if (opNews && opNews.length > 0) setOpportunityNews(opNews[0] as unknown as NewsItem);

      // 3. Today's Lead
      const todayIso = new Date().toISOString().split('T')[0];
      const { data: tLead } = await supabase.from("leads")
        .select("*")
        .eq("assigned_day", todayIso)
        .limit(1);
      if (tLead && tLead.length > 0) setTodayLead(tLead[0] as Lead);

      // 4. Content Queue (drafts pending)
      const { data: drafts } = await supabase.from("tweet_drafts")
        .select("*")
        .eq("status", "pending")
        .limit(4);
      if (drafts) setContentQueue(drafts as TweetDraft[]);

      // 5. Lead Queue (discovered or researched)
      const { data: lQueue } = await supabase.from("leads")
        .select("*")
        .in("status", ["discovered", "researched"])
        .order("score", { ascending: false })
        .limit(4);
      if (lQueue) setLeadQueue(lQueue as Lead[]);

      // 6. This week contents
      const now = new Date();
      const sOfWeek = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
      const eOfWeek = endOfWeek(now, { weekStartsOn: 1 }).toISOString();
      const { data: upData } = await supabase.from("content_items")
        .select("*")
        .gte("scheduled_date", sOfWeek)
        .lte("scheduled_date", eOfWeek)
        .order("scheduled_date", { ascending: true })
        .limit(4);
      if (upData) setThisWeek(upData as ContentItem[]);

      // 7. Trending News
      const { data: tNewsData } = await supabase.from("news_items")
        .select("id, title, summary, viral_score, fetched_at, sources(name)")
        .gte("viral_score", 50)
        .order("fetched_at", { ascending: false })
        .limit(6);

      if (tNewsData && tNewsData.length > 0) {
        setTrendingNews(tNewsData as unknown as NewsItem[]);
      } else {
        // Fallback for sorting if created_at fails
        const { data: fbNewsData } = await supabase.from("news_items")
          .select("id, title, summary, viral_score, fetched_at, sources(name)")
          .gte("viral_score", 50)
          .order("viral_score", { ascending: false })
          .limit(6);
        if (fbNewsData) setTrendingNews(fbNewsData as unknown as NewsItem[]);
      }

      // 8. Stats
      const { count } = await supabase.from("news_items").select("*", { count: "exact", head: true });
      if (count) setNewsCount(count);
      const { data: avgData } = await supabase.from("news_items").select("viral_score").limit(50);
      if (avgData && avgData.length > 0) {
        const avg = Math.round(avgData.reduce((a, b) => a + (b.viral_score || 0), 0) / avgData.length);
        setAvgScore(avg);
      }

    } catch (e) {
      console.error("Dashboard fetch error:", e);
    } finally {
      setLoading(false);
    }
  }

  const toggleTask = async (task: FocusTask) => {
    const newVal = !task.is_completed;
    const dateVal = newVal ? new Date().toISOString() : null;

    setFocusTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_completed: newVal, completed_at: dateVal } : t));

    await supabase.from("focus_tasks")
       .update({ is_completed: newVal, completed_at: dateVal })
       .eq("id", task.id);
  };

  const completedCount = focusTasks.filter(t => t.is_completed).length;

  return (
    <div className="flex flex-col w-full">

      {/* 5.1 Hero */}
      <div style={{ padding: "32px 40px 24px" }} className="flex flex-col md:flex-row justify-between items-start md:items-end">
        <div>
          <div className="flex items-center gap-[8px] mb-[8px]">
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)", display: "inline-block" }} />
            <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Sistem aktif</span>
          </div>
          <h1 className="text-display" style={{ marginBottom: 4 }}>Daily Command<br />Center 🎯</h1>
          <p style={{ fontSize: 14, color: "var(--text-tertiary)" }}>Bugün, {getFormattedDate()}</p>
        </div>
        <Link href="/dashboard/news-pool" style={{ fontSize: 12, color: "var(--accent)" }}>See all →</Link>
      </div>

      {/* 5.2 Ticker */}
      <div
        style={{
          background: "var(--surface-card)",
          borderTop: "1px solid var(--border-subtle)",
          borderBottom: "1px solid var(--border-subtle)",
          padding: "10px 40px",
          fontSize: 12,
          color: "var(--text-secondary)",
        }}
        className="flex items-center gap-[16px]"
      >
        <span>📰 Bugün: <strong style={{ color: "var(--text-primary)" }}>{newsCount}</strong> haber</span>
        <span style={{ color: "var(--text-tertiary)" }}>|</span>
        <span>⚡ Viral Ort: <strong style={{ color: "var(--text-primary)" }}>{avgScore}</strong></span>
        <span style={{ color: "var(--text-tertiary)" }}>|</span>
        <span>📋 Bekleyen: <strong style={{ color: "var(--text-primary)" }}>{contentQueue.length}</strong> taslak</span>
      </div>

      {/* 5.3 Big Cards */}
      <div style={{ margin: "24px 40px 0" }} className="grid grid-cols-1 lg:grid-cols-3 gap-[20px]">

        {/* Card 1 — Bugünün Önceliği */}
        <div className="gradient-border glow-accent" style={{ padding: 24, background: "var(--gradient-card)" }}>
          <div className="flex justify-between items-center mb-[16px]">
            <span className="text-label">BUGÜN</span>
            <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{completedCount}/{focusTasks.length}</span>
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>Yapılacaklar</h3>
          {loading ? (
            <div style={{ height: 80, background: "var(--surface-overlay)", borderRadius: "var(--radius-md)", opacity: 0.2 }} className="animate-pulse" />
          ) : focusTasks.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>Görev yok</p>
          ) : (
            <div className="flex flex-col gap-[8px]">
              {focusTasks.map(t => (
                <label key={t.id} className="flex items-start gap-[8px] cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={t.is_completed}
                    onChange={() => toggleTask(t)}
                    style={{ marginTop: 3, accentColor: "var(--accent)" }}
                  />
                  <span style={{
                    fontSize: 13,
                    color: "var(--text-primary)",
                    opacity: t.is_completed ? 0.4 : 1,
                    textDecoration: t.is_completed ? "line-through" : "none",
                  }}>
                    {t.title}
                  </span>
                </label>
              ))}
            </div>
          )}
          {/* Progress bar */}
          {focusTasks.length > 0 && (
            <div style={{ marginTop: 16, height: 4, background: "var(--surface-overlay)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(completedCount / focusTasks.length) * 100}%`, background: "var(--accent)", borderRadius: 2, transition: "width 0.3s" }} />
            </div>
          )}
        </div>

        {/* Card 2 — İçerik Fırsatı */}
        <div className="gradient-border" style={{ padding: 24 }}>
          <div className="flex justify-between items-center mb-[16px]">
            <span className="text-label">İÇERİK FIRSATI</span>
            {opportunityNews && <ScoreBadge score={opportunityNews.viral_score} />}
          </div>
          {loading ? (
            <div style={{ height: 80, background: "var(--surface-overlay)", borderRadius: "var(--radius-md)", opacity: 0.2 }} className="animate-pulse" />
          ) : !opportunityNews ? (
            <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>Henüz haber yok. Sistem her sabah otomatik güncellenir.</p>
          ) : (
            <div className="flex flex-col justify-between flex-1">
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3, marginBottom: 8 }} className="line-clamp-2">{opportunityNews.title}</h3>
                <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                  {Array.isArray(opportunityNews.sources) ? opportunityNews.sources[0]?.name : (opportunityNews.sources as { name: string } | null)?.name || "Kaynak"}
                </p>
              </div>
              <div className="flex gap-[8px]" style={{ marginTop: 16 }}>
                <Button variant="default" size="sm">X&apos;e Dönüştür</Button>
                <Button variant="ghost" size="sm">LinkedIn</Button>
              </div>
            </div>
          )}
        </div>

        {/* Card 3 — Bugünün Lead'i */}
        <div className="gradient-border" style={{ padding: 24 }}>
          <div className="flex justify-between items-center mb-[16px]">
            <span className="text-label">ULAŞIM</span>
            {todayLead && <span style={{ fontSize: 24, fontWeight: 800, color: "var(--success)" }}>{todayLead.score}</span>}
          </div>
          {loading ? (
            <div style={{ height: 80, background: "var(--surface-overlay)", borderRadius: "var(--radius-md)", opacity: 0.2 }} className="animate-pulse" />
          ) : !todayLead ? (
            <div className="flex flex-col items-center justify-center text-center" style={{ padding: "16px 0" }}>
              <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 12 }}>Lead havuzu boş. Türkiye genelinde sektör bazlı tara.</p>
              <Link href="/dashboard/leads"><Button variant="ghost" size="sm">Sektör Tara →</Button></Link>
            </div>
          ) : (
            <div className="flex flex-col justify-between flex-1">
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{todayLead.company_name}</h3>
                <div className="flex items-center gap-[8px]">
                  <StatusChip status="pending" label={todayLead.sector} />
                </div>
              </div>
              <div className="flex gap-[8px]" style={{ marginTop: 16 }}>
                <Button variant="default" size="sm">DM Yaz →</Button>
                <Link href="/dashboard/leads"><Button variant="ghost" size="sm">Daha Fazla →</Button></Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5.4 Work Queues */}
      <div style={{ margin: "20px 40px 0" }} className="grid grid-cols-1 lg:grid-cols-3 gap-[16px]">

        {/* İçerik Sırası */}
        <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: 20 }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
            <span className="text-label">İÇERİK SIRASI</span>
            <Link href="/dashboard/content-calendar" style={{ fontSize: 11, color: "var(--accent)" }}>Tümü →</Link>
          </div>
          {loading ? <div className="animate-pulse" style={{ height: 40, background: "var(--surface-elevated)", borderRadius: "var(--radius-md)", opacity: 0.2 }} />
           : contentQueue.length === 0 ? (
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>İçerik havuzu boş</span>
              <Link href="/dashboard/news-pool" style={{ fontSize: 13, color: "var(--accent)" }}>Haber Havuzu →</Link>
            </div>
          ) : contentQueue.map(item => (
            <div key={item.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--border-subtle)", fontSize: 13 }} className="flex items-center justify-between last:border-0">
              <div className="flex items-center gap-[8px] min-w-0 flex-1 mr-2">
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: PLATFORM_DOT[item.platform || "@grafikcem"] || "#E879A0", flexShrink: 0 }} />
                <span style={{ color: "var(--text-primary)" }} className="truncate">{item.content || item.text || "İçerik"}</span>
              </div>
              <Button variant="ghost" size="sm" className="shrink-0">Kopyala</Button>
            </div>
          ))}
        </div>

        {/* Lead Sırası */}
        <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: 20 }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
            <span className="text-label">LEAD SIRASI</span>
            <Link href="/dashboard/leads" style={{ fontSize: 11, color: "var(--accent)" }}>Tümü →</Link>
          </div>
          {loading ? <div className="animate-pulse" style={{ height: 40, background: "var(--surface-elevated)", borderRadius: "var(--radius-md)", opacity: 0.2 }} />
           : leadQueue.length === 0 ? (
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Lead havuzu boş</span>
              <Link href="/dashboard/leads" style={{ fontSize: 13, color: "var(--accent)" }}>Sektör Tara →</Link>
            </div>
          ) : leadQueue.map(item => (
            <div key={item.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--border-subtle)", fontSize: 13 }} className="flex items-center justify-between last:border-0">
              <div className="flex items-center gap-[8px] min-w-0 flex-1 mr-2">
                <span className="text-label" style={{ flexShrink: 0 }}>{item.sector}</span>
                <span style={{ color: "var(--text-primary)", fontWeight: 500 }} className="truncate">{item.company_name}</span>
              </div>
              <ScoreBadge score={item.score} className="shrink-0" />
            </div>
          ))}
        </div>

        {/* Bu Hafta */}
        <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: 20 }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
            <span className="text-label">BU HAFTA</span>
            <Link href="/dashboard/content-plan" style={{ fontSize: 11, color: "var(--accent)" }}>Tarihler →</Link>
          </div>
          {loading ? <div className="animate-pulse" style={{ height: 40, background: "var(--surface-elevated)", borderRadius: "var(--radius-md)", opacity: 0.2 }} />
           : thisWeek.length === 0 ? (
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Takvim boş. AI haftalık plan oluşturabilir.</span>
              <Link href="/dashboard/content-plan" style={{ fontSize: 13, color: "var(--accent)" }}>Plan Oluştur →</Link>
            </div>
          ) : thisWeek.map(item => {
            const d = new Date(item.scheduled_date);
            const dayStr = d.toLocaleDateString('tr-TR', { weekday: 'short' });
            return (
              <div key={item.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--border-subtle)", fontSize: 13 }} className="flex items-center gap-[10px] last:border-0">
                <span style={{ fontSize: 11, color: "var(--text-tertiary)", width: 28, flexShrink: 0 }}>{dayStr}</span>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: PLATFORM_DOT[item.platform] || "#888", flexShrink: 0 }} />
                <span style={{ color: "var(--text-primary)" }} className="truncate">{item.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5.5 Gündem */}
      <div style={{ margin: "20px 40px 32px", background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: 20 }}>
        <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
          <span className="text-label">GÜNDEM</span>
          <Link href="/dashboard/news-pool" style={{ fontSize: 11, color: "var(--accent)" }}>Haber Havuzuna Git →</Link>
        </div>

        {loading ? <div className="animate-pulse" style={{ height: 200, background: "var(--surface-elevated)", borderRadius: "var(--radius-md)", opacity: 0.2 }} /> : trendingNews.length === 0 ? (
          <EmptyState
            icon={<FileTextIcon />}
            title="Henüz Kayıt Yok"
            description="Henüz haber yok. Sistem her sabah otomatik güncellenir."
          />
        ) : (
          <div className="flex flex-col">
            {trendingNews.map(item => (
              <div key={item.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--border-subtle)" }} className="flex items-center justify-between gap-[16px] group last:border-0">
                <div className="flex items-center gap-[12px] min-w-0 flex-1">
                  <div style={{ width: 24, height: 24, background: "var(--surface-elevated)", borderRadius: 4, flexShrink: 0 }} className="flex items-center justify-center">
                    <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>📰</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p style={{ fontSize: 13, color: "var(--text-primary)" }} className="truncate">{item.title}</p>
                    <p style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                      {Array.isArray(item.sources) ? item.sources[0]?.name : (item.sources as { name: string } | null)?.name || "Haber"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-[12px] shrink-0">
                  <ScoreBadge score={item.viral_score} />
                  <Button variant="ghost" size="sm" className="hidden sm:inline-flex opacity-0 group-hover:opacity-100 transition-opacity">Üret</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
