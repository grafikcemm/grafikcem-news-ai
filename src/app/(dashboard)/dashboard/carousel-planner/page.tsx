"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

interface Competitor {
  id: string;
  handle: string;
  platform: string;
  is_active: boolean;
}

interface PlanItem {
  rank: number;
  series_name: string;
  topic: string;
  why_viral: string;
  parts: number;
  hook: string;
  inspiration: string;
  differentiation: string;
  content_type: string;
  estimated_engagement: string;
}

interface WeeklyPlan {
  week: number;
  strategy_note: string;
  plans: PlanItem[];
}

const DEFAULT_SERIES = `AI Prompts (devam eden seri)
Best AI Tools (devam eden seri)
Color Combos (devam eden seri)
Designer Websites (devam eden seri)
Keywords (devam eden seri)`;

export default function CarouselPlannerPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [newHandle, setNewHandle] = useState("");
  const [existingSeries, setExistingSeries] = useState(DEFAULT_SERIES);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);

  useEffect(() => {
    fetchCompetitors();
    const stored = localStorage.getItem("carousel_existing_series");
    if (stored) {
      setExistingSeries(stored);
    }
  }, []);

  async function fetchCompetitors() {
    const { data } = await supabase.from("carousel_competitors").select("*").order("created_at", { ascending: true });
    if (data) setCompetitors(data);
  }

  async function addCompetitor() {
    if (!newHandle.trim()) return;
    const { error } = await supabase.from("carousel_competitors").insert({
      handle: newHandle.startsWith("@") ? newHandle : `@${newHandle}`,
    });
    if (!error) {
      setNewHandle("");
      fetchCompetitors();
    }
  }

  async function deleteCompetitor(id: string) {
    await supabase.from("carousel_competitors").delete().eq("id", id);
    fetchCompetitors();
  }

  async function toggleCompetitor(id: string, current: boolean) {
    await supabase.from("carousel_competitors").update({ is_active: !current }).eq("id", id);
    fetchCompetitors();
  }

  function handleSeriesChange(val: string) {
    setExistingSeries(val);
    localStorage.setItem("carousel_existing_series", val);
  }

  async function generatePlan() {
    setLoading(true);
    setPlan(null);
    try {
      const activeCompetitors = competitors.filter(c => c.is_active).map(c => c.handle);
      const res = await fetch("/api/carousel-planner/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competitors: activeCompetitors,
          existingSeries,
          weekNumber: 1
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Plan üretilemedi");

      setPlan(data.plan);
      toast.success("Haftalık plan oluşturuldu!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--surface-base)] flex flex-col lg:flex-row">
      {/* LEFT PANEL */}
      <div className="w-full lg:w-[40%] flex flex-col border-r border-[var(--border-subtle)] bg-[var(--surface-raised)] min-h-screen">
        <div className="p-6 border-b border-[var(--border-subtle)]">
          <h1 className="text-2xl font-bold text-white tracking-tight">Carousel Planlayıcı</h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">Rakip analizi + kendi serilerinden haftalık plan</p>
        </div>

        <div className="p-6 space-y-8 flex-1 overflow-y-auto">
          {/* TAKİP EDİLEN HESAPLAR */}
          <div>
            <h2 className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-4">Takip Edilen Hesaplar</h2>
            <div className="space-y-2 mb-4">
              {competitors.map((comp) => (
                <div key={comp.id} className="flex items-center justify-between bg-[var(--surface-elevated)] border border-[var(--border-subtle)] p-3 rounded-lg">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={comp.is_active}
                      onChange={() => toggleCompetitor(comp.id, comp.is_active)}
                      className="w-4 h-4 rounded border-[var(--border-subtle)] bg-[var(--surface-overlay)] text-[#C8F135] focus:ring-[#C8F135]/40 cursor-pointer"
                    />
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{comp.handle}</p>
                      <p className="text-[10px] text-[var(--text-tertiary)] bg-[var(--surface-overlay)] px-1.5 py-0.5 rounded w-fit mt-1">
                        Instagram Carousel Uzmanı
                      </p>
                    </div>
                  </div>
                  <button onClick={() => deleteCompetitor(comp.id)} className="text-[var(--danger)]/50 hover:text-[var(--danger)] transition-colors p-2">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="@yenihesap"
                value={newHandle}
                onChange={(e) => setNewHandle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCompetitor()}
                className="flex-1 bg-[var(--surface-elevated)] border border-[var(--border-default)] text-sm rounded-md px-3 py-2 text-[var(--text-primary)] focus:border-[#C8F135]/50 outline-none"
              />
              <Button variant="secondary" onClick={addCompetitor} size="sm" className="h-9 whitespace-nowrap">
                <Plus size={14} className="mr-1" />
                Ekle
              </Button>
            </div>
          </div>

          <div className="w-full h-px bg-[var(--border-subtle)]" />

          {/* MEVCUT SERİLERİM */}
          <div>
            <h2 className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Mevcut Serilerim</h2>
            <p className="text-[11px] text-[var(--text-tertiary)] mb-3">Mevcut carousel serilerini gir — AI bunları referans alır</p>
            <textarea
              value={existingSeries}
              onChange={(e) => handleSeriesChange(e.target.value)}
              placeholder="Örn:\nColor Combos — Part 1-7\nDesigner Websites — Part 1-5"
              className="w-full h-40 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-xl p-4 text-sm text-[var(--text-secondary)] font-mono focus:outline-none focus:border-[#C8F135]/50 resize-none leading-relaxed"
            />
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-full lg:w-[60%] flex flex-col min-h-screen bg-[var(--surface-base)] relative overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-[var(--surface-base)]/80 backdrop-blur-md border-b border-[var(--border-subtle)]">
          <h2 className="text-sm font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Haftalık Plan</h2>
          <Button
            onClick={generatePlan}
            disabled={loading || competitors.filter(c => c.is_active).length === 0}
            className="bg-[#C8F135] text-black hover:bg-[#d4f54a] font-bold text-sm h-9 px-6 rounded-lg transition-colors"
          >
            {loading ? "Oluşturuluyor..." : "Haftalık Plan Oluştur"}
          </Button>
        </div>

        <div className="p-6 md:p-8 flex-1">
          {plan ? (
            <div className="space-y-6 max-w-2xl mx-auto">
              {plan.strategy_note && (
                <div className="bg-[#C8F135]/10 border border-[#C8F135]/30 rounded-xl p-4 text-sm text-[#C8F135] font-medium leading-relaxed">
                  💡 {plan.strategy_note}
                </div>
              )}

              <div className="space-y-4">
                {plan.plans.map((item, idx) => (
                  <div key={idx} className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-5 hover:border-[var(--border-default)] transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-[var(--surface-overlay)] text-[var(--text-secondary)] font-bold text-[10px] px-2 py-1 rounded-sm">
                            #{item.rank}
                          </span>
                          <span className="bg-[var(--surface-overlay)] border border-[var(--border-subtle)] text-[var(--text-secondary)] text-[10px] px-2 py-1 rounded-sm flex items-center gap-1 uppercase">
                            <div className={`w-1.5 h-1.5 rounded-full ${item.estimated_engagement === 'high' ? 'bg-[var(--success)]' : item.estimated_engagement === 'medium' ? 'bg-[var(--warning)]' : 'bg-purple-400'}`} />
                            {item.estimated_engagement}
                          </span>
                          <span className="bg-blue-500/10 text-blue-400 text-[10px] px-2 py-1 rounded-sm font-semibold uppercase">
                            {item.content_type}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-white tracking-tight">{item.series_name} <span className="text-[var(--text-tertiary)] font-normal ml-1">({item.parts} Part)</span></h3>
                        <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">{item.topic}</p>
                      </div>
                    </div>

                    <div className="my-4 border-l-2 border-[#C8F135] pl-3 py-1">
                      <p className="text-xs text-[var(--text-primary)] font-medium">Neden Viral Olur?</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{item.why_viral}</p>
                    </div>

                    <div className="bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-lg p-3 my-4">
                      <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase mb-1.5">İlk Slide Hook</p>
                      <p className="text-sm font-mono text-[#C8F135] leading-relaxed break-words">{item.hook}</p>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                      <div>
                        <p className="text-[11px] text-[var(--text-tertiary)]">
                          <span className="font-semibold text-[var(--text-secondary)]">İlham:</span> {item.inspiration}
                        </p>
                        <p className="text-[11px] text-[var(--text-tertiary)] italic mt-0.5">
                          Fark: {item.differentiation}
                        </p>
                      </div>
                      
                      <div className="flex gap-2">
                         <Button variant="ghost" size="sm" className="text-xs h-8">Kopyala</Button>
                         <Button variant="secondary" size="sm" className="text-xs h-8 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-[#C8F135] font-semibold hover:border-[#C8F135]/40 transition-[border-color]">Takvime Ekle</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : !loading ? (
             <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto opacity-50 py-20">
               <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-[var(--text-tertiary)] mb-4">
                 <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line>
               </svg>
               <h3 className="text-base font-medium text-white mb-2">Plan Henüz Oluşturulmadı</h3>
               <p className="text-sm text-[var(--text-tertiary)]">Takip edilen rakipleri seçin ve haftalık tasarım/AI carousel stratejinizi görmek için plan oluşturun.</p>
             </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
