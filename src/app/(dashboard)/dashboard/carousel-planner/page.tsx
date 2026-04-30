"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2, Plus, Sparkles, LayoutGrid, CheckCircle2, ChevronRight, Copy, CalendarPlus } from "lucide-react";
import { cn } from "@/lib/utils";

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
      toast.success("Rakip eklendi.");
    }
  }

  async function deleteCompetitor(id: string) {
    await supabase.from("carousel_competitors").delete().eq("id", id);
    fetchCompetitors();
    toast.success("Rakip kaldırıldı.");
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
    <div className="flex h-[calc(100vh-52px)] overflow-hidden bg-[var(--bg-base)]">
      {/* LEFT PANEL */}
      <div className="w-1/2 flex flex-col border-r border-[var(--border-subtle)]">
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Carousel Planlayıcı</h1>
            <p className="text-sm text-[var(--text-secondary)]">Rakip analizi & seri stratejisi</p>
          </div>

          {/* Rakipler */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)]">Takip Edilen Hesaplar</h2>
              <span className="text-[10px] text-[var(--text-muted)] font-mono">{competitors.length} TOPLAM</span>
            </div>
            
            <div className="space-y-2">
              {competitors.map((comp) => (
                <div key={comp.id} className="group flex items-center justify-between p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-all">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => toggleCompetitor(comp.id, comp.is_active)}
                      className={cn(
                        "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                        comp.is_active 
                          ? "bg-[var(--accent)] border-[var(--accent)] text-black" 
                          : "border-[var(--border-default)] hover:border-[var(--border-strong)]"
                      )}
                    >
                      {comp.is_active && <CheckCircle2 size={12} />}
                    </button>
                    <div>
                      <p className={cn("text-sm font-medium", !comp.is_active && "text-[var(--text-muted)]")}>{comp.handle}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => deleteCompetitor(comp.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:text-red-300 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="@kullanici_adi"
                value={newHandle}
                onChange={(e) => setNewHandle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCompetitor()}
                className="flex-1 h-9 bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm rounded-lg px-3 focus:border-[var(--border-strong)] outline-none transition-all"
              />
              <Button size="sm" onClick={addCompetitor} className="h-9 bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-strong)]">
                <Plus size={14} />
              </Button>
            </div>
          </div>

          <div className="h-px bg-[var(--border-subtle)]" />

          {/* Mevcut Seriler */}
          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)]">Mevcut Serilerim</h2>
              <p className="text-[10px] text-[var(--text-muted)]">AI'ın referans alacağı aktif serilerini buraya yaz.</p>
            </div>
            <textarea
              value={existingSeries}
              onChange={(e) => handleSeriesChange(e.target.value)}
              placeholder="Örn: Color Combos - Part 1-7"
              className="w-full h-40 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl p-4 text-sm text-[var(--text-secondary)] font-mono focus:border-[var(--border-strong)] outline-none resize-none leading-relaxed transition-all"
            />
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-6 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <Button
            onClick={generatePlan}
            disabled={loading || competitors.filter(c => c.is_active).length === 0}
            className="w-full h-12 text-base font-semibold bg-[var(--accent)] text-black hover:opacity-90 transition-all rounded-xl shadow-lg shadow-white/5"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <LoaderCircle className="w-5 h-5 animate-spin" />
                Strateji Oluşturuluyor...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Haftalık Plan Oluştur
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-1/2 overflow-y-auto p-6 bg-[var(--bg-surface)] custom-scrollbar">
        {!plan && !loading ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
            <div className="p-4 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
              <LayoutGrid className="w-8 h-8" />
            </div>
            <div>
              <p className="text-lg font-medium">Henüz plan oluşturulmadı</p>
              <p className="text-sm">Rakipleri seç ve plan üret butonuna bas.</p>
            </div>
          </div>
        ) : plan ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            {plan.strategy_note && (
              <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20">
                <div className="flex items-center gap-2 text-blue-400 mb-2">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Haftalık Strateji Notu</span>
                </div>
                <p className="text-sm text-blue-100/80 leading-relaxed italic">
                  &ldquo;{plan.strategy_note}&rdquo;
                </p>
              </div>
            )}

            <div className="space-y-4">
              {plan.plans.map((item, idx) => (
                <div key={idx} className="group p-6 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-all space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono bg-[var(--bg-base)] px-2 py-0.5 rounded border border-[var(--border-subtle)] text-[var(--text-muted)]">
                          TEMA #{item.rank}
                        </span>
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter",
                          item.estimated_engagement === 'high' ? "bg-emerald-500/10 text-emerald-400" : "bg-orange-500/10 text-orange-400"
                        )}>
                          {item.estimated_engagement} ENGAGEMENT
                        </span>
                      </div>
                      <h3 className="text-lg font-bold tracking-tight">
                        {item.series_name} <span className="text-[var(--text-muted)] font-normal text-sm">({item.parts} Parts)</span>
                      </h3>
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{item.topic}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-[10px] font-mono text-[var(--text-muted)] border border-[var(--border-subtle)] px-2 py-0.5 rounded">
                        {item.content_type}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-4 border-y border-[var(--border-subtle)]">
                    <div className="space-y-1">
                      <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase">VİRAL SEBEBİ</p>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{item.why_viral}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase">İLK SLIDE HOOK</p>
                      <p className="text-xs font-medium text-[var(--accent)] leading-relaxed italic">&ldquo;{item.hook}&rdquo;</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-[var(--text-muted)]">
                        <span className="font-semibold text-[var(--text-secondary)]">İlham:</span> {item.inspiration}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] italic">
                        Fark: {item.differentiation}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="h-8 text-[10px] px-3" onClick={() => {
                        navigator.clipboard.writeText(`${item.series_name}\n${item.topic}\n\nHook: ${item.hook}`);
                        toast.success("Kopyalandı.");
                      }}>
                        <Copy size={12} className="mr-1.5" />
                        KOPYALA
                      </Button>
                      <Button size="sm" className="h-8 text-[10px] px-3 bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--accent)] hover:text-[var(--accent)]">
                        <CalendarPlus size={12} className="mr-1.5" />
                        TAKVİME EKLE
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : loading ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
             <div className="w-12 h-12 border-4 border-[var(--border-subtle)] border-t-[var(--accent)] rounded-full animate-spin" />
             <p className="text-sm text-[var(--text-secondary)] font-medium">Strateji motoru rakipleri analiz ediyor...</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LoaderCircle({ className }: { className?: string }) {
  return (
    <div className={cn("w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin", className)} />
  );
}
