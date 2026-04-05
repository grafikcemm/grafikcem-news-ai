"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface AnalyticsEntry {
  id: string;
  platform: string;
  week_start: string;
  reach: number;
  impressions: number;
  new_followers: number;
  engagement_rate: number;
  best_post_title: string;
}

export default function AnalyticsPage() {
  const [entries, setEntries] = useState<AnalyticsEntry[]>([]);
  const [period, setPeriod] = useState("30g");
  const [platform, setPlatform] = useState("Genel");
  const [loading, setLoading] = useState(true);

  // Modal State
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<AnalyticsEntry>>({});

  // Analysis State
  const [analysisText, setAnalysisText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [period]);

  async function fetchData() {
    setLoading(true);
    let days = 30;
    if (period === "7g") days = 7;
    if (period === "14g") days = 14;
    if (period === "90g") days = 90;

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - days);

    const { data } = await supabase.from("analytics_entries")
      .select("*")
      .gte("week_start", pastDate.toISOString())
      .order("week_start", { ascending: true });

    if (data) setEntries(data as AnalyticsEntry[]);
    setLoading(false);
  }

  const handleSave = async () => {
    if (!form.platform || !form.week_start) return alert("Platform ve Hafta başlangıcı zorunludur.");
    const { error } = await supabase.from("analytics_entries").insert([form]);
    if (!error) {
      alert("Veri kaydedildi.");
      setEntryModalOpen(false);
      fetchData();
    } else {
      alert("Hata oluştu.");
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/analytics/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: entries })
      });
      const result = await res.json();
      setAnalysisText(result.analysis || "Analiz alınamadı.");
    } catch {
      alert("Hata oluştu");
    } finally {
      setAnalyzing(false);
    }
  };

  // Metrikler
  const filteredEntries = useMemo(() => entries.filter(e => platform === "Genel" || e.platform === platform), [entries, platform]);
  
  const totalReach = filteredEntries.reduce((acc, curr) => acc + (curr.reach || 0), 0);
  const totalImp = filteredEntries.reduce((acc, curr) => acc + (curr.impressions || 0), 0);
  const totalFollowers = filteredEntries.reduce((acc, curr) => acc + (curr.new_followers || 0), 0);
  const avgEng = filteredEntries.length ? filteredEntries.reduce((acc, curr) => acc + (curr.engagement_rate || 0), 0) / filteredEntries.length : 0;

  // Chart Data preparation (group by week)
  const chartData = useMemo(() => {
    const map: any = {};
    entries.forEach(e => {
       if (!map[e.week_start]) map[e.week_start] = { week: e.week_start, '@grafikcem_reach': 0, '@maskulenkod_reach': 0, 'LinkedIn_reach': 0, '@grafikcem_eng': 0, '@maskulenkod_eng': 0, 'LinkedIn_eng': 0 };
       if (e.platform === '@grafikcem') { map[e.week_start]['@grafikcem_reach'] += e.reach; map[e.week_start]['@grafikcem_eng'] = e.engagement_rate; }
       if (e.platform === '@maskulenkod') { map[e.week_start]['@maskulenkod_reach'] += e.reach; map[e.week_start]['@maskulenkod_eng'] = e.engagement_rate; }
       if (e.platform === 'LinkedIn') { map[e.week_start]['LinkedIn_reach'] += e.reach; map[e.week_start]['LinkedIn_eng'] = e.engagement_rate; }
    });
    return Object.values(map);
  }, [entries]);

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Analitik ve Performans</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Metriklerinizi takip edin, büyüme alanlarını belirleyin.</p>
        </div>
        <div className="flex gap-4 items-center">
           <div className="bg-[var(--bg-elevated)] p-1 rounded-lg border border-[var(--border)] flex">
             {['7g', '14g', '30g', '90g'].map(p => (
               <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1 text-xs rounded-md ${period === p ? 'bg-[var(--bg-card)] text-[var(--accent)] shadow-xs' : 'text-[var(--text-secondary)]'}`}>{p}</button>
             ))}
           </div>
           <Button onClick={() => setEntryModalOpen(true)} className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white">Veri Ekle</Button>
        </div>
      </div>

      <Tabs value={platform} onValueChange={setPlatform}>
        <TabsList className="bg-[var(--bg-elevated)] border-[var(--border)] border h-11 p-1 mb-6">
          {['Genel', '@grafikcem', '@maskulenkod', 'LinkedIn'].map(p => (
            <TabsTrigger key={p} value={p} className="data-[state=active]:bg-[#1e1e1e] data-[state=active]:text-[var(--accent)] data-[state=active]:shadow-xl">{p}</TabsTrigger>
          ))}
        </TabsList>

        {/* 4 Cards Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           {[
             { label: "Toplam Reach", val: totalReach.toLocaleString() },
             { label: "Toplam Impression", val: totalImp.toLocaleString() },
             { label: "Ort. Etkileşim", val: `%${avgEng.toFixed(2)}` },
             { label: "Yeni Takipçi", val: `+${totalFollowers.toLocaleString()}` }
           ].map((k, i) => (
             <Card key={i} className="bg-[var(--bg-card)] border-[var(--border)]">
               <CardContent className="p-5">
                 <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">{k.label}</p>
                 <p className="text-2xl font-bold text-white">{k.val}</p>
               </CardContent>
             </Card>
           ))}
        </div>

        {/* Platform Cards (Only show in Genel) */}
        {platform === "Genel" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            {['@grafikcem', '@maskulenkod', 'LinkedIn'].map(p => {
               const pEntries = entries.filter(e => e.platform === p);
               if(pEntries.length === 0) return null;
               const pReach = pEntries.reduce((a,c) => a + c.reach, 0);
               const pEng = pEntries.reduce((a,c) => a + c.engagement_rate, 0) / pEntries.length;
               const bestPop = pEntries.sort((a,b) => b.reach - a.reach)[0];
               return (
                 <Card key={p} className="bg-[var(--bg-elevated)] border-[var(--border)]">
                   <CardContent className="p-5">
                     <div className="flex items-center gap-2 mb-4">
                       <div className="w-6 h-6 rounded bg-[var(--bg-card)] flex justify-center items-center font-bold text-[10px] text-[var(--accent)]">{p[1]}</div>
                       <span className="font-semibold text-white">{p}</span>
                     </div>
                     <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                        <div><p className="text-[var(--text-muted)]">Reach</p><strong className="text-white">{pReach.toLocaleString()}</strong></div>
                        <div><p className="text-[var(--text-muted)]">Etkileşim</p><strong className="text-white">%{(pEng||0).toFixed(1)}</strong></div>
                     </div>
                     <div className="bg-[var(--bg-card)] p-2 rounded text-[10px]">
                       <p className="text-[var(--text-muted)] mb-0.5">En İyi Performans:</p>
                       <p className="font-semibold text-white truncate">{bestPop?.best_post_title || "-"}</p>
                     </div>
                   </CardContent>
                 </Card>
               )
            })}
          </div>
        )}

        {/* Graphics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <Card className="bg-[var(--bg-card)] border-[var(--border)]">
            <CardHeader><CardTitle className="text-sm font-semibold text-white">Erişim Miktarı (Reach)</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={chartData}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2a2a2a" />
                   <XAxis dataKey="week" stroke="#555555" fontSize={10} tickFormatter={(v) => v.slice(5)} />
                   <YAxis stroke="#555555" fontSize={10} />
                   <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a', color: '#fff' }} />
                   <Bar dataKey="@grafikcem_reach" stackId="a" fill="#E879A0" />
                   <Bar dataKey="@maskulenkod_reach" stackId="a" fill="#60A5FA" />
                   <Bar dataKey="LinkedIn_reach" stackId="a" fill="#34D399" />
                 </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="bg-[var(--bg-card)] border-[var(--border)]">
            <CardHeader><CardTitle className="text-sm font-semibold text-white">Etkileşim Oranları (%)</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={chartData}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2a2a2a" />
                   <XAxis dataKey="week" stroke="#555555" fontSize={10} tickFormatter={(v) => v.slice(5)} />
                   <YAxis stroke="#555555" fontSize={10} />
                   <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a', color: '#fff' }} />
                   <Line type="monotone" dataKey="@grafikcem_eng" stroke="#E879A0" strokeWidth={2} />
                   <Line type="monotone" dataKey="@maskulenkod_eng" stroke="#60A5FA" strokeWidth={2} />
                   <Line type="monotone" dataKey="LinkedIn_eng" stroke="#34D399" strokeWidth={2} />
                 </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

      </Tabs>

      {/* AI Analiz */}
      <Card className="bg-linear-to-r from-[var(--bg-card)] to-[var(--bg-elevated)] border-[var(--border)]">
        <CardContent className="p-6">
           <div className="flex justify-between items-center mb-4">
             <h3 className="font-bold text-white flex items-center gap-2">✨ AI Performans İçgörüsü</h3>
             <Button onClick={handleAnalyze} disabled={analyzing} className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white">{analyzing ? "AI Düşünüyor..." : "AI Analizi Üret"}</Button>
           </div>
           {analysisText && (
             <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[var(--bg-elevated)] whitespace-pre-wrap text-sm text-[var(--text-primary)]">
                {analysisText}
             </div>
           )}
        </CardContent>
      </Card>

      {/* Manual Data Entry Modal */}
      <Sheet open={entryModalOpen} onOpenChange={setEntryModalOpen}>
        <SheetContent className="w-[400px] bg-[var(--bg-card)] border-l border-[var(--border)] overflow-y-auto">
          <SheetHeader className="mb-6"><SheetTitle className="text-white">Performans Verisi Ekle</SheetTitle></SheetHeader>
          <div className="space-y-4">
             <div>
               <label className="text-xs text-[var(--text-secondary)] mb-1 block">Platform</label>
               <Select value={form.platform ?? undefined} onValueChange={v => setForm({...form, platform: v ?? ''})}>
                  <SelectTrigger className="bg-[var(--bg-elevated)] border-[var(--border)] text-white"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    {['@grafikcem', '@maskulenkod', 'LinkedIn'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
               </Select>
             </div>
             <div>
               <label className="text-xs text-[var(--text-secondary)] mb-1 block">Hafta Başlangıcı</label>
               <Input type="date" value={form.week_start || ''} onChange={e => setForm({...form, week_start: e.target.value})} className="bg-[var(--bg-elevated)] border-[var(--border)] text-white" />
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="text-xs text-[var(--text-secondary)] mb-1 block">Erişim (Reach)</label>
                   <Input type="number" value={form.reach || ''} onChange={e => setForm({...form, reach: Number(e.target.value)})} className="bg-[var(--bg-elevated)] border-[var(--border)] text-white" />
                </div>
                <div>
                   <label className="text-xs text-[var(--text-secondary)] mb-1 block">Gösterim</label>
                   <Input type="number" value={form.impressions || ''} onChange={e => setForm({...form, impressions: Number(e.target.value)})} className="bg-[var(--bg-elevated)] border-[var(--border)] text-white" />
                </div>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="text-xs text-[var(--text-secondary)] mb-1 block">Yeni Takipçi</label>
                   <Input type="number" value={form.new_followers || ''} onChange={e => setForm({...form, new_followers: Number(e.target.value)})} className="bg-[var(--bg-elevated)] border-[var(--border)] text-white" />
                </div>
                <div>
                   <label className="text-xs text-[var(--text-secondary)] mb-1 block">Etkileşim Oranı (%)</label>
                   <Input type="number" step="0.01" value={form.engagement_rate || ''} onChange={e => setForm({...form, engagement_rate: Number(e.target.value)})} className="bg-[var(--bg-elevated)] border-[var(--border)] text-white" />
                </div>
             </div>
             <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1 block">En İyi Post Başlığı</label>
                <Input value={form.best_post_title || ''} onChange={e => setForm({...form, best_post_title: e.target.value})} className="bg-[var(--bg-elevated)] border-[var(--border)] text-white" />
             </div>
             <Button onClick={handleSave} className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white mt-4">Kaydet</Button>
          </div>
        </SheetContent>
      </Sheet>

    </div>
  );
}
