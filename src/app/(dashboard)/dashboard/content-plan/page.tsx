"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, addDays, nextDay } from "date-fns";
import { tr } from "date-fns/locale";
import { useRouter } from "next/navigation";

interface PlanContent {
  day: string;
  platform: string;
  format: string;
  title: string;
  hook: string;
  why: string;
  best_time: string;
}

interface WeeklyPlan {
  week_theme: string;
  contents: PlanContent[];
}

export default function ContentPlanPage() {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const router = useRouter();

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/content-plan/generate", { method: "POST" });
      const data = await res.json();
      if (data.contents) {
        setPlan(data);
      } else {
        alert("Plan oluşturulamadı.");
      }
    } catch (e) {
      alert("Hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const getDayMapping = (dayName: string) => {
    const map = { 'Pazartesi': 1, 'Salı': 2, 'Çarşamba': 3, 'Perşembe': 4, 'Cuma': 5 };
    return map[dayName as keyof typeof map] || 1;
  };

  const calculateDateForDay = (dayName: string) => {
    const today = new Date();
    const dayIndex = getDayMapping(dayName);
    // Move to next week's day
    const d = nextDay(today, dayIndex as any);
    return format(d, "yyyy-MM-dd");
  };

  const addAllToCalendar = async () => {
    if (!plan) return;
    const items = plan.contents.map(c => ({
      title: c.title,
      platform: c.platform,
      format: c.format,
      hook: c.hook,
      caption: c.why,
      status: "draft",
      scheduled_date: calculateDateForDay(c.day)
    }));

    const { error } = await supabase.from("content_items").insert(items);
    if (error) alert("Eklenirken hata oluştu.");
    else alert("Tüm içerikler takvime eklendi!");
  };

  const addSingleToCalendar = async (c: PlanContent) => {
    const { error } = await supabase.from("content_items").insert([{
      title: c.title,
      platform: c.platform,
      format: c.format,
      hook: c.hook,
      caption: c.why,
      status: "draft",
      scheduled_date: calculateDateForDay(c.day)
    }]);
    if (error) alert("Eklenirken hata oluştu.");
    else alert("İçerik takvime eklendi!");
  };

  const handleStoryboard = (c: PlanContent) => {
    // Navigating to storyboard with params
    router.push(`/dashboard/storyboard?title=${encodeURIComponent(c.title)}&format=${encodeURIComponent(c.format)}`);
  };

  const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Haftalık İçerik Planı</h1>
          {plan?.week_theme && <p className="text-[var(--accent)] text-sm mt-1 font-semibold">Tema: {plan.week_theme}</p>}
        </div>
        <div className="flex gap-2">
          {plan && <Button variant="outline" onClick={addAllToCalendar} className="bg-[var(--bg-elevated)] border-[var(--border)] text-white hover:bg-[var(--bg-card)]">Tümünü Takvime Ekle</Button>}
          <Button onClick={handleGenerate} disabled={loading} className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white">
            {loading ? "AI Plan Üretiyor..." : "AI Plan Üret"}
          </Button>
        </div>
      </div>

      {!plan && !loading && (
        <Card className="bg-[var(--bg-card)] border-[var(--border)]">
          <CardContent className="h-64 flex flex-col items-center justify-center text-[var(--text-muted)] p-8 text-center">
             <div className="text-4xl mb-4">🤖</div>
             <p>AI'ın sizin için rakip trendlerine, haber viralitelerine ve son metriklerinize bakarak haftalık içerik planı üretmesini sağlayın.</p>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[1,2,3,4,5].map(i => <Card key={i} className="h-[500px] bg-[var(--bg-card)] border-[var(--border)] animate-pulse" />)}
        </div>
      )}

      {plan && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {DAYS.map(dayName => {
            const dayContents = plan.contents.filter(c => c.day === dayName);
            return (
              <div key={dayName} className="space-y-4">
                 <div className="bg-[var(--bg-elevated)] p-3 rounded-lg border border-[var(--border)] text-center font-bold text-white shadow-sm">{dayName}</div>
                 {dayContents.map((c, i) => (
                   <Card key={i} className="bg-[var(--bg-card)] border-[var(--border)] hover:border-[var(--text-muted)] transition-all">
                     <CardContent className="p-4 flex flex-col h-full relative">
                        <div className="flex justify-between items-start mb-3 gap-2">
                           <Badge className="bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-normal border-[var(--border)]">{c.best_time}</Badge>
                           <Badge className={`font-normal border-0 text-white shadow-xs ${c.platform === '@grafikcem' ? 'bg-[#E879A0]' : c.platform === '@maskulenkod' ? 'bg-[#60A5FA]' : 'bg-[#34D399]'}`}>{c.platform}</Badge>
                        </div>
                        <Badge variant="outline" className="text-[10px] w-fit mb-2 border-[var(--border)] text-[var(--text-secondary)]">{c.format}</Badge>
                        <h4 className="font-bold text-white text-sm mb-2">{c.title}</h4>
                        <p className="text-xs text-[var(--text-muted)] italic leading-relaxed mb-4">"{c.hook}"</p>
                        
                        <div className="bg-[#1a1a1a] p-2 rounded text-[10px] text-[var(--text-secondary)] mb-4">
                          <strong className="text-[var(--text-muted)] block mb-0.5">Neden?</strong>
                          {c.why}
                        </div>

                        <div className="mt-auto grid grid-cols-2 gap-2">
                           <Button size="sm" onClick={() => addSingleToCalendar(c)} className="w-full text-[10px] bg-[var(--bg-elevated)] hover:bg-[#2a2a2a] text-white h-7">Takvime Ekle</Button>
                           <Button size="sm" onClick={() => handleStoryboard(c)} className="w-full text-[10px] bg-transparent border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white h-7 shadow-xs">Storyboard</Button>
                        </div>
                     </CardContent>
                   </Card>
                 ))}
                 {dayContents.length === 0 && (
                   <div className="h-24 border border-dashed border-[var(--border)] rounded-xl flex items-center justify-center text-[10px] text-[var(--text-muted)]">Boş</div>
                 )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
}
