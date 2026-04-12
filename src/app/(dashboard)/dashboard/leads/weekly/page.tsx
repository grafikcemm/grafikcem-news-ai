"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { startOfWeek, addDays, format, isSameDay } from "date-fns";
import { tr } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, CheckCircle2, Mail, Zap } from "lucide-react";
import Link from "next/link";

export default function WeeklyPlanPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [isPlanning, setIsPlanning] = useState(false);

  // Compute Monday to Friday for the currently selected week
  const monday = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 5 }).map((_, i) => addDays(monday, i));

  const loadWeeklyLeads = async () => {
    setLoading(true);
    // Fetch leads where assigned_day is between Monday and Friday of currentDate
    const startStr = monday.toISOString().split("T")[0];
    const endStr = addDays(monday, 4).toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .gte("assigned_day", startStr)
      .lte("assigned_day", endStr);

    if (!error && data) {
      setLeads(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadWeeklyLeads();
  }, [currentDate]);

  const handleCreatePlan = async () => {
    setIsPlanning(true);
    try {
      const res = await fetch("/api/leads/weekly-plan", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
         toast.success(`Plan oluşturuldu! ${data.planned} lead atandı.`);
         await loadWeeklyLeads();
      } else {
         toast.error(data.error);
      }
    } catch (e: any) {
       toast.error("Hata: " + e.message);
    }
    setIsPlanning(false);
  };

  const markCompleted = async (id: string) => {
    const { error } = await supabase.from("leads").update({ status: "contacted" }).eq("id", id);
    if (!error) {
       toast.success("Tamamlandı olarak işaretlendi!");
       setLeads(leads.map(l => l.id === id ? { ...l, status: "contacted" } : l));
    } else {
       toast.error("İşaretlenemedi");
    }
  };

  const handlePrevWeek = () => setCurrentDate(addDays(currentDate, -7));
  const handleNextWeek = () => setCurrentDate(addDays(currentDate, 7));

  const completedCount = leads.filter(l => l.status === "contacted" || l.status === "pitched" || l.status === "won").length;

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-[calc(100vh-100px)]">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-linear-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400">
            Haftalık Plan
          </h1>
          <p className="text-[var(--text-tertiary)] mt-1 flex items-center gap-2">
            İletişim kurulacak hedeflerin gün gün dağılımı.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[var(--surface-card)] dark:bg-[var(--surface-elevated)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] rounded-lg p-1">
             <button onClick={handlePrevWeek} className="p-1 hover:bg-[var(--surface-elevated)] hover:bg-[var(--surface-overlay)] rounded"><ChevronLeft className="w-5 h-5"/></button>
             <span className="px-3 text-sm font-semibold">{format(monday, "d MMM", { locale: tr })} - {format(addDays(monday, 4), "d MMM yyyy", { locale: tr })}</span>
             <button onClick={handleNextWeek} className="p-1 hover:bg-[var(--surface-elevated)] hover:bg-[var(--surface-overlay)] rounded"><ChevronRight className="w-5 h-5"/></button>
          </div>
          <button 
            onClick={handleCreatePlan}
            disabled={isPlanning}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition"
          >
            <CalendarDays className="w-4 h-4" /> {isPlanning ? "Planlanıyor..." : "Bu Haftayı Planla"}
          </button>
        </div>
      </div>

      {loading ? (
         <div className="flex justify-center py-20"><Zap className="w-8 h-8 animate-spin text-[var(--text-tertiary)]" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {weekDays.map(day => {
              const dayStr = day.toISOString().split("T")[0];
              const dayLeads = leads.filter(l => l.assigned_day === dayStr);
              
              return (
                <div key={dayStr} className="bg-[var(--surface-card)] dark:bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] dark:border-[var(--border-subtle)]/50 p-4 min-h-[400px]">
                  <h3 className="text-center font-bold text-[var(--text-primary)] dark:text-[var(--text-secondary)] pb-3 mb-4 border-b border-[var(--border-subtle)] dark:border-[var(--border-subtle)]">
                    {format(day, "EEEE", { locale: tr })}
                    <span className="block text-xs font-normal text-[var(--text-tertiary)] mt-1">{format(day, "d MMM")}</span>
                  </h3>

                  <div className="space-y-4">
                    {dayLeads.map(lead => (
                      <div key={lead.id} className="bg-[var(--surface-card)] dark:bg-[var(--surface-elevated)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] rounded-xl p-4 shadow-xs">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">{lead.sector}</div>
                        <h4 className="font-bold text-[var(--text-primary)] dark:text-white mb-2 line-clamp-1" title={lead.business_name}>{lead.business_name}</h4>
                        <div className="flex justify-between items-center mb-4">
                           <span className={`text-xs font-semibold px-2 py-1 rounded bg-[var(--surface-elevated)] dark:bg-[var(--surface-overlay)] ${lead.potential_score >= 70 ? 'text-emerald-500' : 'text-amber-500'}`}>Skor: {lead.potential_score}</span>
                           <span className="text-[10px] uppercase font-bold text-blue-500">{lead.status}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 mt-auto">
                          <Link href={`/dashboard/leads/outreach?leadId=${lead.id}`} className="flex items-center justify-center gap-1.5 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 hover:bg-blue-900/50 rounded-lg text-xs font-semibold transition">
                            <Mail className="w-3.5 h-3.5" /> Mesaj
                          </Link>
                          <button onClick={() => markCompleted(lead.id)} className="flex items-center justify-center gap-1.5 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-[var(--success-subtle)] hover:bg-emerald-900/50 rounded-lg text-xs font-semibold transition">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Bitir
                          </button>
                        </div>
                      </div>
                    ))}
                    {dayLeads.length === 0 && (
                      <div className="text-center py-8 text-[var(--text-tertiary)] text-sm">Hedef Yok</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 bg-[var(--surface-card)] dark:bg-[var(--surface-elevated)] rounded-xl border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] p-4 flex justify-between items-center">
            <span className="text-[var(--text-tertiary)]">Bu haftaki hedefler: <strong className="text-[var(--text-primary)] dark:text-white">{leads.length} lead</strong></span>
            <span className="text-[var(--text-tertiary)]">İletişim kurulan: <strong className="text-emerald-500">{completedCount} lead</strong></span>
          </div>
        </>
      )}
    </div>
  );
}
