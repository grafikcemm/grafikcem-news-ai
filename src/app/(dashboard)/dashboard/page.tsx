"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScoreBadge } from "@/components/ui/score-badge";
import { StatusChip } from "@/components/ui/status-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { startOfWeek, endOfWeek } from "date-fns";
import { tr } from "date-fns/locale";
import Link from "next/link";
import { FileTextIcon, UsersIcon, CalendarIcon } from "lucide-react";

interface NewsItem { id: string; title: string; summary: string; viral_score: number; fetched_at: string; sources?: { name: string }[] | { name: string } | null; }
interface ContentItem { id: string; title: string; platform: string; format: string; status: string; scheduled_date: string; }
interface FocusTask { id: string; title: string; priority: number; frequency: string; is_completed: boolean; completed_at: string | null; }
interface Lead { id: string; company_name: string; sector: string; score: number; status: string; assigned_day?: string; }
interface TweetDraft { id: string; text?: string; content?: string; platform?: string; status: string; }

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Günaydın";
  if (hour < 18) return "İyi günler";
  return "İyi akşamlar";
}

function getFormattedDate() {
  return new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
}

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
        .limit(3);
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
        .order("created_at", { ascending: false })
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

  return (
    <div className="flex flex-col w-full max-w-[1200px] mx-auto px-[40px] py-[32px] gap-[32px]">
      
      {/* 5.1 Üst Bar — Daily Command Center */}
      <div className="flex flex-row justify-between items-end w-full">
        <div>
          <p className="text-small mb-1">{greeting}, Ali Cem.</p>
          <h1 className="text-display">{getFormattedDate()}</h1>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="default">+ İçerik Ekle</Button>
        </div>
      </div>

      {/* 5.2 Focus Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[16px]">
        {/* Kolon 1: Bugünün Önceliği */}
        <Card className="h-[200px]">
           <div className="flex flex-col h-full pl-4 border-l-2 border-[var(--status-danger)]">
             <div className="text-label mb-3 mt-1">Bugün</div>
             {loading ? <div className="animate-pulse flex-1 bg-[var(--surface-overlay)] rounded-md opacity-20" /> : focusTasks.length === 0 ? (
               <div className="flex-1 flex items-center justify-center text-small">Görev yok</div>
             ) : (
               <div className="flex flex-col gap-2 flex-1 overflow-hidden">
                 {focusTasks.map(t => (
                   <label key={t.id} className={`flex items-start gap-2 group cursor-pointer ${t.is_completed ? 'opacity-50 line-through' : ''}`}>
                     <input type="checkbox" checked={t.is_completed} onChange={() => toggleTask(t)} className="mt-1 w-4 h-4 rounded-[4px] border-[var(--border-default)] accent-[var(--accent)]" />
                     <span className="text-body text-[13px] leading-snug line-clamp-2">{t.title}</span>
                   </label>
                 ))}
               </div>
             )}
           </div>
        </Card>

        {/* Kolon 2: İçerik Fırsatı */}
        <Card className="h-[200px]">
           <div className="flex flex-col h-full pl-4 border-l-2 border-[var(--accent)]">
             <div className="text-label mb-3 mt-1">İçerik</div>
             {loading ? <div className="animate-pulse flex-1 bg-[var(--surface-overlay)] rounded-md opacity-20" /> : !opportunityNews ? (
               <div className="flex-1 flex items-center justify-center text-small">Haber yok</div>
             ) : (
               <div className="flex flex-col justify-between flex-1">
                 <div>
                    <h3 className="text-heading text-[15px] line-clamp-2 mb-2">{opportunityNews.title}</h3>
                    <ScoreBadge score={opportunityNews.viral_score} />
                 </div>
                 <div className="flex gap-2">
                   <Button variant="secondary" size="sm">X'e Dönüştür &rarr;</Button>
                   <Button variant="ghost" size="sm">LinkedIn &rarr;</Button>
                 </div>
               </div>
             )}
           </div>
        </Card>

        {/* Kolon 3: Bugünün Lead'i */}
        <Card className="h-[200px]">
           <div className="flex flex-col h-full pl-4 border-l-2 border-[var(--status-info)]">
             <div className="text-label mb-3 mt-1">Ulaşım</div>
             {loading ? <div className="animate-pulse flex-1 bg-[var(--surface-overlay)] rounded-md opacity-20" /> : !todayLead ? (
               <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <div className="text-small mb-3">Tarama başlatılmamış. Türkiye genelinde sektör tara.</div>
                  <Button variant="ghost" size="sm">Sektör Tara &rarr;</Button>
               </div>
             ) : (
               <div className="flex flex-col justify-between flex-1">
                 <div>
                    <div className="flex items-center gap-2 mb-1">
                       <StatusChip status="pending" label={todayLead.sector} />
                       <ScoreBadge score={todayLead.score} />
                    </div>
                    <h3 className="text-heading text-[15px] line-clamp-2">{todayLead.company_name}</h3>
                 </div>
                 <div className="flex gap-2">
                   <Button variant="secondary" size="sm">DM Yaz &rarr;</Button>
                 </div>
               </div>
             )}
           </div>
        </Card>
      </div>

      {/* 5.3 Work Queues */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[16px]">
        {/* İçerik Sırası */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-baseline">
            <h2 className="text-heading">İçerik Sırası</h2>
            <Link href="/dashboard/content-calendar" className="text-small hover:text-[var(--text-primary)]">Tümü &rarr;</Link>
          </div>
          <div className="flex flex-col gap-2">
            {loading ? <div className="animate-pulse h-[40px] bg-[var(--surface-raised)] rounded-[var(--radius-md)] opacity-20" /> : contentQueue.length === 0 ? (
               <Card className="p-4 items-center flex-row justify-between">
                 <span className="text-small">İçerik havuzu boş</span>
                 <Link href="/dashboard/news-pool" className="text-[13px] text-[var(--accent)] font-medium">Haber Havuzu &rarr;</Link>
               </Card>
            ) : contentQueue.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-[var(--surface-raised)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] hover:border-[var(--border-default)] transition-colors">
                 <div className="flex items-center gap-2 overflow-hidden mr-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />
                    <span className="text-body text-[13px] truncate">{item.content || item.text || "İçerik"}</span>
                 </div>
                 <Button variant="ghost" size="sm" className="h-7 px-2 shrink-0">Kopyala</Button>
              </div>
            ))}
          </div>
        </div>

        {/* Lead Sırası */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-baseline">
            <h2 className="text-heading">Lead Sırası</h2>
            <Link href="/dashboard/leads" className="text-small hover:text-[var(--text-primary)]">Tümü &rarr;</Link>
          </div>
          <div className="flex flex-col gap-2">
            {loading ? <div className="animate-pulse h-[40px] bg-[var(--surface-raised)] rounded-[var(--radius-md)] opacity-20" /> : leadQueue.length === 0 ? (
               <Card className="p-4 items-center flex-row justify-between">
                 <span className="text-small">Lead havuzu boş</span>
                 <Link href="/dashboard/leads" className="text-[13px] text-[var(--accent)] font-medium">Sektör Tara &rarr;</Link>
               </Card>
            ) : leadQueue.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-[var(--surface-raised)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] hover:border-[var(--border-default)] transition-colors">
                 <div className="flex items-center gap-2 overflow-hidden mr-2">
                    <StatusChip status="draft" label={item.sector} className="shrink-0" />
                    <span className="text-body text-[13px] font-medium truncate">{item.company_name}</span>
                 </div>
                 <ScoreBadge score={item.score} className="shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Bu Hafta */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-baseline">
            <h2 className="text-heading">Bu Hafta</h2>
            <Link href="/dashboard/content-plan" className="text-small hover:text-[var(--text-primary)]">Tarihler &rarr;</Link>
          </div>
          <div className="flex flex-col gap-2">
            {loading ? <div className="animate-pulse h-[40px] bg-[var(--surface-raised)] rounded-[var(--radius-md)] opacity-20" /> : thisWeek.length === 0 ? (
               <Card className="p-4 items-center flex-row justify-between">
                 <span className="text-small">Takvim boş</span>
                 <Link href="/dashboard/content-plan" className="text-[13px] text-[var(--accent)] font-medium">Plan Oluştur &rarr;</Link>
               </Card>
            ) : thisWeek.map(item => {
              const d = new Date(item.scheduled_date);
              const dayStr = d.toLocaleDateString('tr-TR', { weekday: 'short' });
              return (
              <div key={item.id} className="flex items-center gap-3 p-3 bg-[var(--surface-raised)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] hover:border-[var(--border-default)] transition-colors">
                 <div className="w-[32px] text-center shrink-0 border-r border-[var(--border-default)] pr-3">
                    <span className="block text-[10px] text-[var(--text-tertiary)] uppercase leading-none">{dayStr}</span>
                    <span className="block text-[14px] font-bold text-[var(--text-primary)] mt-0.5 leading-none">{d.getDate()}</span>
                 </div>
                 <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-body text-[13px] truncate">{item.title}</span>
                 </div>
              </div>
            )})}
          </div>
        </div>
      </div>

      {/* 5.4 Alt Bölüm — Son Haberler */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
           <h2 className="text-heading">Gündem</h2>
           <Link href="/dashboard/news-pool" className="text-small hover:text-[var(--text-primary)] font-medium">Haber Havuzu &rarr;</Link>
        </div>
        
        {loading ? <div className="animate-pulse h-[200px] bg-[var(--surface-raised)] rounded-[var(--radius-md)] opacity-20" /> : trendingNews.length === 0 ? (
           <EmptyState 
             icon={<FileTextIcon />}
             title="Henüz Kayıt Yok"
             description="Cron job çalışınca trend haberler burada listelenecek."
           />
        ) : (
           <div className="flex flex-col gap-1">
             {trendingNews.map(item => (
               <div key={item.id} className="flex items-center justify-between gap-4 p-3 rounded-[var(--radius-md)] hover:bg-[var(--surface-overlay)] transition-colors group">
                 <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-small shrink-0 w-[120px] truncate">{Array.isArray(item.sources) ? item.sources[0]?.name : item.sources?.name || 'Haber'}</span>
                    <span className="text-body text-[14px] text-[var(--text-primary)] truncate flex-1">{item.title}</span>
                 </div>
                 <div className="flex items-center gap-4 shrink-0 px-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                    <ScoreBadge score={item.viral_score} />
                    <Button variant="secondary" size="sm" className="hidden sm:inline-flex h-7 px-3">X'e Dönüştür</Button>
                 </div>
               </div>
             ))}
           </div>
        )}
      </div>

    </div>
  );
}
