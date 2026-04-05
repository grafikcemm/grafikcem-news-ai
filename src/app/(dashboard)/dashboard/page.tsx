"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow, startOfWeek, endOfWeek, startOfMonth } from "date-fns";
import { tr } from "date-fns/locale";
import Link from "next/link";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";

interface NewsItem { id: string; title: string; summary: string; viral_score: number; fetched_at: string; sources?: { name: string }[] | { name: string } | null; }
interface ContentItem { id: string; title: string; platform: string; format: string; status: string; scheduled_date: string; }
interface Competitor { id: string; handle: string; last_format: string; trend: string; last_updated: string; }
interface ChannelStat { platform: string; color: string; count: number; delta: number; trend: any[]; }
interface FocusTask { id: string; title: string; priority: number; frequency: string; is_completed: boolean; completed_at: string | null; }

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "İyi sabahlar";
  if (hour < 18) return "İyi öğleden sonralar";
  return "İyi akşamlar";
}

function MiniSparkline({ data, color }: { data: any[]; color: string }) {
  if (!data || data.length === 0) return <div className="h-10 opacity-30 mt-2 flex items-center text-[10px]">Veri yok</div>;
  return (
    <div className="h-10 mt-2 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <YAxis domain={['min', 'max']} hide />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function DashboardPage() {
  const [greeting] = useState(getGreeting());
  const [loading, setLoading] = useState(true);
  
  const [news, setNews] = useState<NewsItem[]>([]);
  const [pipeline, setPipeline] = useState<Record<string, number>>({});
  const [upcoming, setUpcoming] = useState<ContentItem[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [focusTasks, setFocusTasks] = useState<FocusTask[]>([]);
  const [channels, setChannels] = useState<ChannelStat[]>([
    { platform: "@grafikcem", color: "#E879A0", count: 0, delta: 0, trend: [] },
    { platform: "@maskulenkod", color: "#60A5FA", count: 0, delta: 0, trend: [] },
    { platform: "LinkedIn", color: "#34D399", count: 0, delta: 0, trend: [] },
  ]);

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    setLoading(true);
    try {
      // Focus Tasks with Reset Logic
      let { data: tempTasks } = await supabase.from("focus_tasks").select("*");
      if (tempTasks) {
         const now = new Date();
         const sWeek = startOfWeek(now, { weekStartsOn: 1 });
         const sMonth = startOfMonth(now);
         const toResetIds: string[] = [];

         tempTasks.forEach((t: any) => {
           if (!t.is_completed || !t.completed_at) return;
           const compAt = new Date(t.completed_at);
           if (t.frequency === 'weekly' && compAt < sWeek) toResetIds.push(t.id);
           if (t.frequency === 'monthly' && compAt < sMonth) toResetIds.push(t.id);
         });

         if (toResetIds.length > 0) {
            await supabase.from("focus_tasks")
               .update({ is_completed: false, completed_at: null })
               .in("id", toResetIds);
            const refetch = await supabase.from("focus_tasks").select("*");
            tempTasks = refetch.data;
         }
         setFocusTasks(tempTasks as FocusTask[]);
      }

      // 1. News
      const { data: newsData } = await supabase.from("news_items").select("id, title, summary, viral_score, fetched_at, sources(name)").gte("viral_score", 60).order("viral_score", { ascending: false }).limit(6);
      if (newsData) setNews(newsData as unknown as NewsItem[]);

      // 2. Content Pipeline (Counts by status)
      const { data: pipelineData } = await supabase.from("content_items").select("status");
      if (pipelineData) {
        const counts: Record<string, number> = { 'draft': 0, 'hazırlanıyor': 0, 'hazır': 0, 'zamanlandı': 0, 'yayınlandı': 0 };
        pipelineData.forEach(p => {
          const s = (p.status || 'draft').toLowerCase();
          if (counts[s] !== undefined) counts[s]++;
          else counts['draft']++;
        });
        setPipeline(counts);
      }

      // 3. Upcoming (This week)
      const now = new Date();
      const sOfWeek = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
      const eOfWeek = endOfWeek(now, { weekStartsOn: 1 }).toISOString();
      const { data: upData } = await supabase.from("content_items").select("*").gte("scheduled_date", sOfWeek).lte("scheduled_date", eOfWeek).order("scheduled_date", { ascending: true }).limit(4);
      if (upData) setUpcoming(upData as ContentItem[]);

      // 4. Competitors
      const { data: compData } = await supabase.from("competitors").select("*").order("last_updated", { ascending: false }).limit(3);
      if (compData) setCompetitors(compData as Competitor[]);

      // 5. Channel Drafts Simulation
      const { data: drafts } = await supabase.from("tweet_drafts").select("created_at");
      const totalDrafts = drafts?.length || 0;
      setChannels([
        { platform: "@grafikcem", color: "#E879A0", count: Math.ceil(totalDrafts * 0.5), delta: 3, trend: Array.from({length: 7}, () => ({ value: Math.floor(Math.random()*10) })) },
        { platform: "@maskulenkod", color: "#60A5FA", count: Math.ceil(totalDrafts * 0.3), delta: -1, trend: Array.from({length: 7}, () => ({ value: Math.floor(Math.random()*10) })) },
        { platform: "LinkedIn", color: "#34D399", count: Math.ceil(totalDrafts * 0.2), delta: 2, trend: Array.from({length: 7}, () => ({ value: Math.floor(Math.random()*10) })) },
      ]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const toggleTask = async (task: FocusTask) => {
    const newVal = !task.is_completed;
    const dateVal = newVal ? new Date().toISOString() : null;
    
    // Optimistic UI Update
    setFocusTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_completed: newVal, completed_at: dateVal } : t));

    await supabase.from("focus_tasks")
       .update({ is_completed: newVal, completed_at: dateVal })
       .eq("id", task.id);
  };

  const tasksDaily = focusTasks.filter(t => t.frequency === 'daily').sort((a,b) => Number(a.is_completed) - Number(b.is_completed));
  const tasksWeekly = focusTasks.filter(t => t.frequency === 'weekly').sort((a,b) => Number(a.is_completed) - Number(b.is_completed));
  const tasksMonthly = focusTasks.filter(t => t.frequency === 'monthly').sort((a,b) => Number(a.is_completed) - Number(b.is_completed));

  const totalCompleted = focusTasks.filter(t => t.is_completed).length;

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Üst Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{greeting}, Ali Cem</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Content OS'unuz hazır</p>
        </div>
        <div className="flex items-center gap-3">
          {upcoming.length > 0 && (
             <Badge className="bg-[#fbbf24]/10 text-[#fbbf24] hover:bg-[#fbbf24]/20 border-0 flex items-center gap-1.5 h-9 px-3">
               <span className="w-2 h-2 rounded-full bg-[#fbbf24] animate-pulse" />
               Yaklaşan {upcoming.length} İçerik
             </Badge>
          )}
          <Button className="bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] font-medium">Yeni Konu Ekle</Button>
        </div>
      </div>

      {/* 2. Kanal Metrik Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 bg-[var(--bg-card)] rounded-xl" />) : channels.map((ch, i) => (
          <Card key={i} className="bg-[var(--bg-card)] border-[var(--border)] shadow-sm">
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm" style={{ backgroundColor: ch.color }}>{ch.platform[1] || 'L'}</div>
                  <span className="font-semibold text-[var(--text-primary)] text-sm">{ch.platform}</span>
                </div>
                <div className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ch.delta >= 0 ? "bg-[#4ade80]/10 text-[#4ade80]" : "bg-[#f87171]/10 text-[#f87171]"}`}>
                  {ch.delta >= 0 ? "+" : ""}{ch.delta}
                </div>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Toplam Taslak</p>
                  <p className="text-3xl font-bold text-[var(--text-primary)]">{ch.count}</p>
                </div>
                <div className="w-24">
                  <MiniSparkline data={ch.trend} color={ch.color} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 3. İki Kolon Layout - Odağ & Yaklaşanlar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Sol 7: Bugünün Odağı */}
        <div className="lg:col-span-7">
          <Card className="bg-[var(--bg-card)] border-[var(--border)] h-full">
            <div className="p-5 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-elevated)]/50 rounded-t-xl">
               <h3 className="text-sm font-bold text-[var(--text-primary)]">🎯 Bugünün Odağı <span className="text-[var(--text-muted)] ml-2 font-normal">{new Date().toLocaleDateString('tr-TR')}</span></h3>
               <span className="text-xs text-[var(--text-secondary)] font-medium">{totalCompleted} / {focusTasks.length}</span>
            </div>
            <CardContent className="p-0">
               {loading ? (
                   <div className="p-5 space-y-3">
                     {[1,2,3].map(i=><Skeleton key={i} className="h-10 bg-[var(--bg-elevated)]" />)}
                   </div>
               ) : focusTasks.length === 0 ? (
                  <div className="p-8 text-center text-[var(--text-muted)] text-sm flex flex-col items-center">
                    <span className="text-2xl mb-2">🚀</span>
                    Henüz görev yok<br/>
                    <Link href="/dashboard/settings" className="mt-2 text-[var(--accent)] hover:underline">Odağını Belirle →</Link>
                  </div>
               ) : (
                  <div className="divide-y divide-[var(--border)]">
                    {/* BÖLÜM A - Kırmızı */}
                    {tasksDaily.length > 0 && (
                      <div className="p-4 border-l-2 border-l-[#f87171]">
                        <p className="text-[10px] font-bold text-[#f87171] uppercase tracking-wider mb-2">Bugün</p>
                        <div className="space-y-1">
                           {tasksDaily.map(t => (
                             <label key={t.id} className={`flex items-center gap-3 p-2 hover:bg-[var(--bg-elevated)] rounded cursor-pointer transition-all ${t.is_completed ? 'opacity-40 line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
                               <input type="checkbox" checked={t.is_completed} onChange={() => toggleTask(t)} className="w-4 h-4 rounded border-[var(--border)] accent-[#f87171]" />
                               <span className="text-sm">{t.title}</span>
                             </label>
                           ))}
                        </div>
                      </div>
                    )}
                    {/* BÖLÜM B - Sarı */}
                    {tasksWeekly.length > 0 && (
                      <div className="p-4 border-l-2 border-l-[#fbbf24]">
                        <p className="text-[10px] font-bold text-[#fbbf24] uppercase tracking-wider mb-2">Bu Hafta</p>
                        <div className="space-y-1">
                           {tasksWeekly.map(t => (
                             <label key={t.id} className={`flex items-center gap-3 p-2 hover:bg-[var(--bg-elevated)] rounded cursor-pointer transition-all ${t.is_completed ? 'opacity-40 line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
                               <input type="checkbox" checked={t.is_completed} onChange={() => toggleTask(t)} className="w-4 h-4 rounded border-[var(--border)] accent-[#fbbf24]" />
                               <span className="text-sm">{t.title}</span>
                             </label>
                           ))}
                        </div>
                      </div>
                    )}
                    {/* BÖLÜM C - Mavi */}
                    {tasksMonthly.length > 0 && (
                      <div className="p-4 border-l-2 border-l-[#60a5fa]">
                        <p className="text-[10px] font-bold text-[#60a5fa] uppercase tracking-wider mb-2">Bu Ay</p>
                        <div className="space-y-1">
                           {tasksMonthly.map(t => (
                             <label key={t.id} className={`flex items-center gap-3 p-2 hover:bg-[var(--bg-elevated)] rounded cursor-pointer transition-all ${t.is_completed ? 'opacity-40 line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
                               <input type="checkbox" checked={t.is_completed} onChange={() => toggleTask(t)} className="w-4 h-4 rounded border-[var(--border)] accent-[#60a5fa]" />
                               <span className="text-sm">{t.title}</span>
                             </label>
                           ))}
                        </div>
                      </div>
                    )}
                  </div>
               )}
            </CardContent>
          </Card>
        </div>

        {/* Sağ 5: Yaklaşan İçerikler */}
        <div className="lg:col-span-5">
          <Card className="bg-[var(--bg-card)] border-[var(--border)] h-full">
            <CardContent className="p-5 flex flex-col h-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Yaklaşan İçerikler</h3>
                <Link href="/dashboard/content-calendar" className="text-[10px] text-[var(--accent)] font-medium hover:underline">Takvim →</Link>
              </div>
              {loading ? <Skeleton className="h-32 bg-[var(--bg-elevated)]" /> : upcoming.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)] text-sm">
                   Hiç planlanmış içerik yok
                   <Link href="/dashboard/content-calendar" className="mt-2 text-[var(--accent)] hover:underline">Planla →</Link>
                </div>
              ) : (
                <div className="space-y-3 flex-1">
                  {upcoming.map(item => (
                    <div key={item.id} className="flex gap-3 p-2.5 rounded-lg border border-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] transition-colors">
                      <div className="w-10 h-10 bg-[var(--bg-elevated)] border border-[var(--border)] rounded flex flex-col items-center justify-center shrink-0">
                        <span className="text-[9px] text-[var(--text-muted)] leading-none">{new Date(item.scheduled_date).toLocaleDateString('tr-TR', { month: 'short' })}</span>
                        <span className="text-sm font-bold text-[var(--text-primary)] leading-none mt-1">{new Date(item.scheduled_date).getDate()}</span>
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-[10px] text-[var(--text-secondary)] font-medium mb-0.5">{item.platform} • {item.format}</p>
                        <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{item.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 4. İki Kolon Layout - Pipeline & Intel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
         {/* Sol 7: Pipeline */}
         <div className="lg:col-span-7">
            <Card className="bg-[var(--bg-card)] border-[var(--border)] h-full">
               <CardContent className="p-5">
                 <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Content Pipeline</h3>
                 {loading ? <Skeleton className="h-20 bg-[var(--bg-elevated)]" /> : (
                   <div className="flex items-center justify-between text-center gap-2">
                       {[
                         { l: 'Taslak', k: 'draft' },
                         { l: 'Hazırlanıyor', k: 'hazırlanıyor' },
                         { l: 'Hazır', k: 'hazır' },
                         { l: 'Zamanlandı', k: 'zamanlandı' },
                         { l: 'Yayınlandı', k: 'yayınlandı' }
                       ].map(st => (
                         <div key={st.k} className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border)] p-3 rounded-lg">
                            <span className="block text-2xl font-bold text-[var(--text-primary)] mb-1">{pipeline[st.k] || 0}</span>
                            <span className="block text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{st.l}</span>
                         </div>
                       ))}
                   </div>
                 )}
               </CardContent>
            </Card>
         </div>

         {/* Sağ 5: Competitor Intel */}
         <div className="lg:col-span-5">
            <Card className="bg-[var(--bg-card)] border-[var(--border)] h-full">
               <CardContent className="p-5">
                  <div className="flex justify-between items-center mb-4">
                     <h3 className="text-sm font-semibold text-[var(--text-primary)]">Rakip Intel</h3>
                     <Link href="/dashboard/competitors" className="text-[10px] text-[var(--accent)] font-medium hover:underline">Tümünü Gör →</Link>
                  </div>
                  {loading ? <Skeleton className="h-20 bg-[var(--bg-elevated)]" /> : competitors.length === 0 ? (
                     <div className="text-[var(--text-muted)] text-sm text-center">Henüz rakip eklenmemiş.</div>
                  ) : (
                     <div className="space-y-2">
                        {competitors.map(comp => (
                          <div key={comp.id} className="flex justify-between items-center p-2 rounded-lg bg-[var(--bg-elevated)] hover:bg-[#2a2a2a] transition-colors border border-[var(--border)]">
                             <div>
                               <p className="text-sm font-semibold text-[var(--text-primary)]">{comp.handle}</p>
                               <p className="text-[10px] text-[var(--text-secondary)]">Son Format: {comp.last_format || "Bilinmiyor"}</p>
                             </div>
                             {comp.trend === 'yukseliyor' && <Badge className="bg-[#f87171]/20 text-[#f87171] border-0 text-[10px] px-2 py-0.5 font-bold">↗ Hot</Badge>}
                          </div>
                        ))}
                     </div>
                  )}
               </CardContent>
            </Card>
         </div>
      </div>

      {/* 5. Son Haberler (max 6) */}
      <Card className="bg-[var(--bg-card)] border-[var(--border)]">
        <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Trending Gündem (Viral &gt; 60)</h3>
            {loading ? <div className="space-y-3">{[1,2,3].map(i=><Skeleton key={i} className="h-12 bg-[var(--bg-elevated)]" />)}</div> : news.length === 0 ? (
               <div className="text-[var(--text-muted)] text-sm text-center p-4">Trending haber bulunamadı.</div>
            ) : (
              <>
               <div className="divide-y divide-[var(--border)]">
                  {news.map((item) => (
                     <div key={item.id} className="py-3 flex gap-4 hover:bg-[var(--bg-elevated)]/50 transition-colors px-2 -mx-2 rounded-md items-center">
                       <Badge className={`shrink-0 ${item.viral_score >= 80 ? 'bg-[#4ade80]/20 text-[#4ade80]' : 'bg-[#fbbf24]/20 text-[#fbbf24]'} border-0 font-bold`}>{item.viral_score}</Badge>
                       <div className="flex-1 min-w-0">
                         <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{item.title}</p>
                         <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{Array.isArray(item.sources) ? item.sources[0]?.name : item.sources?.name} • {formatDistanceToNow(new Date(item.fetched_at), { addSuffix: true, locale: tr })}</p>
                       </div>
                     </div>
                  ))}
               </div>
               <div className="mt-4 text-center">
                  <Link href="/dashboard/news-pool" className="text-sm text-[var(--accent)] hover:underline font-medium">Haber Havuzuna Git →</Link>
               </div>
              </>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
