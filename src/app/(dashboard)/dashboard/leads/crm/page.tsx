"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { 
  Building2, MapPin, Globe, Phone, FileText,
  MessageSquare, Edit3, X, Mail, Zap
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

type StatusType = "discovered" | "researched" | "contacted" | "pitched" | "won" | "lost";

const COLUMNS: { id: StatusType; title: string; color: string }[] = [
  { id: "discovered", title: "Keşfedildi", color: "bg-slate-100 dark:bg-slate-800" },
  { id: "researched", title: "Araştırıldı", color: "bg-blue-50 dark:bg-blue-900/20" },
  { id: "contacted", title: "İletişime Geçildi", color: "bg-indigo-50 dark:bg-indigo-900/20" },
  { id: "pitched", title: "Teklif Gönderildi", color: "bg-orange-50 dark:bg-orange-900/20" },
  { id: "won", title: "Kazanıldı", color: "bg-emerald-50 dark:bg-emerald-900/20" },
  { id: "lost", title: "Kaybedildi", color: "bg-red-50 dark:bg-red-900/20" },
];

export default function CRMPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  const [detailModalLead, setDetailModalLead] = useState<any | null>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [notesText, setNotesText] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("leads").select("*").order("updated_at", { ascending: false });
    if (!error && data) {
      setLeads(data);
    }
    setLoading(false);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedLeadId(id);
    e.dataTransfer.effectAllowed = "move";
    // Slightly dim the original
    setTimeout(() => {
      if (e.target instanceof HTMLElement) {
        e.target.style.opacity = "0.5";
      }
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedLeadId(null);
    if (e.target instanceof HTMLElement) {
      e.target.style.opacity = "1";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, statusId: StatusType) => {
    e.preventDefault();
    if (!draggedLeadId) return;

    const leadToMove = leads.find((l) => l.id === draggedLeadId);
    if (!leadToMove || leadToMove.status === statusId) return;

    // Optimistic UI update
    setLeads((prev) =>
      prev.map((l) => (l.id === draggedLeadId ? { ...l, status: statusId, updated_at: new Date().toISOString() } : l))
    );

    const { error } = await supabase
      .from("leads")
      .update({ status: statusId, updated_at: new Date().toISOString() })
      .eq("id", draggedLeadId);

    if (error) {
      toast.error("Durum güncellenirken hata oluştu");
      loadLeads(); // Revert
    } else {
      toast.success(`Durum güncellendi: ${COLUMNS.find(c => c.id === statusId)?.title}`);
    }
    setDraggedLeadId(null);
  };

  const openDetail = async (lead: any) => {
    setDetailModalLead(lead);
    setNotesText(lead.notes || "");
    const { data } = await supabase.from("lead_contacts").select("*").eq("lead_id", lead.id).order("created_at", { ascending: false });
    if (data) setContacts(data);
  };

  const handleSaveNotes = async () => {
    if (!detailModalLead) return;
    setSavingNotes(true);
    const { error } = await supabase.from("leads").update({ notes: notesText }).eq("id", detailModalLead.id);
    if (!error) {
       toast.success("Notlar kaydedildi");
       setLeads(leads.map(l => l.id === detailModalLead.id ? {...l, notes: notesText} : l));
       setDetailModalLead({...detailModalLead, notes: notesText});
    } else {
       toast.error("Not kaydedilmedi: " + error.message);
    }
    setSavingNotes(false);
  };

  const wonTotal = leads.filter(l => l.status === "won").reduce((acc, l) => acc + (l.estimated_price_min || 0), 0);

  return (
    <div className="p-8 max-w-[1600px] mx-auto h-[calc(100vh-64px)] flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-end mb-6 shrink-0">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-linear-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400">
            CRM Pipeline
          </h1>
          <p className="text-slate-500 mt-1">Lead aşamalarını sürükleyip bırakarak yönetin.</p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-3 rounded-xl shadow-xs">
           <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Kazanılan Potansiyel Ciro</p>
           <p className="text-2xl font-black text-emerald-500">{wonTotal.toLocaleString('tr-TR')} ₺</p>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center"><span className="animate-pulse text-slate-400">Yükleniyor...</span></div>
      ) : (
        <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => {
            const colLeads = leads.filter((l) => l.status === col.id);
            return (
              <div
                key={col.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`flex-shrink-0 w-80 rounded-2xl border border-slate-200 dark:border-slate-700/50 flex flex-col ${col.color}`}
              >
                <div className="p-4 border-b border-white/20 flex justify-between items-center">
                   <h3 className="font-bold text-slate-700 dark:text-slate-300">{col.title}</h3>
                   <span className="bg-white/50 dark:bg-slate-950/20 text-slate-600 dark:text-slate-400 text-xs font-bold px-2 py-1 rounded-full">
                     {colLeads.length}
                   </span>
                </div>
                
                <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                   {colLeads.map((lead) => (
                     <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => openDetail(lead)}
                        className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer hover:shadow-md transition active:cursor-grabbing"
                     >
                        <div className="flex justify-between items-start mb-2">
                           <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded">{lead.sector}</span>
                           <span className={`text-[11px] font-black ${lead.potential_score >= 70 ? 'text-emerald-500' : 'text-amber-500'}`}>{lead.potential_score}</span>
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-white leading-tight mb-3 line-clamp-2">{lead.business_name}</h4>
                        
                        {(lead.estimated_price_min > 0) && (
                          <div className="text-xs font-semibold text-slate-500 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded text-center">
                            ~{lead.estimated_price_min} ₺
                          </div>
                        )}
                     </div>
                   ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {detailModalLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
           <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700">
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-start bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex gap-4">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                    <Building2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight mb-1">{detailModalLead.business_name}</h2>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                       <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4"/> {detailModalLead.city}</span>
                       <span className="flex items-center gap-1.5"><Globe className="w-4 h-4"/> {detailModalLead.website_url || "Website Yok"}</span>
                       <span className="flex items-center gap-1.5"><Phone className="w-4 h-4"/> {detailModalLead.contact_phone || "Telefon Yok"}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Durum</p>
                    <span className="inline-block px-3 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-semibold mt-1">
                      {COLUMNS.find(c => c.id === detailModalLead.status)?.title}
                    </span>
                  </div>
                  <button onClick={() => setDetailModalLead(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition"><X className="w-6 h-6"/></button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-8">
                 {/* Left Col */}
                 <div className="w-full md:w-1/2 space-y-6">
                    <div>
                      <h3 className="font-bold flex items-center gap-2 mb-3 text-slate-800 dark:text-slate-200"><MessageSquare className="w-4 h-4"/> Geçmiş İletişimler</h3>
                      <div className="space-y-3">
                        {contacts.length === 0 ? (
                           <p className="text-sm text-slate-400 italic bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 border-dashed">Henüz iletişim kurulmamış.</p>
                        ) : contacts.map(c => (
                           <div key={c.id} className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                             <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 rounded uppercase tracking-wider">{c.contact_type}</span>
                                <span className="text-xs text-slate-400">{format(new Date(c.created_at), "d MMM yyyy HH:mm", { locale: tr })}</span>
                             </div>
                             <p className="text-sm text-slate-600 dark:text-slate-300 break-words whitespace-pre-wrap">{c.content}</p>
                           </div>
                        ))}
                      </div>
                      
                      <div className="mt-4">
                        <Link href={`/dashboard/leads/outreach?leadId=${detailModalLead.id}`} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 rounded-lg text-sm font-semibold transition">
                           <Mail className="w-4 h-4" /> Yeni İletişim Üret
                        </Link>
                      </div>
                    </div>
                 </div>

                 {/* Right Col */}
                 <div className="w-full md:w-1/2 space-y-6">
                    {detailModalLead.ai_analysis && (
                      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-5 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                        <h3 className="font-bold text-indigo-900 dark:text-indigo-300 mb-2 flex items-center gap-2"><Zap className="w-4 h-4"/> AI Analizi</h3>
                        <p className="text-sm text-indigo-800 dark:text-indigo-200 leading-relaxed mb-4">{detailModalLead.ai_analysis}</p>
                        <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-300">💡 {detailModalLead.why_they_need_us}</p>
                      </div>
                    )}

                    <div className="flex flex-col h-[300px]">
                      <h3 className="font-bold flex items-center gap-2 mb-3 text-slate-800 dark:text-slate-200"><Edit3 className="w-4 h-4"/> Özel Notlar</h3>
                      <textarea 
                        className="flex-1 w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-700 dark:text-slate-300"
                        placeholder="Müşteriyle ilgili görüşme notlarını buraya yaz..."
                        value={notesText}
                        onChange={(e) => setNotesText(e.target.value)}
                      />
                      <div className="mt-3 flex justify-end">
                        <button 
                          onClick={handleSaveNotes}
                          disabled={savingNotes || notesText === (detailModalLead.notes || "")}
                          className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                        >
                          {savingNotes ? "Kaydediliyor..." : "Notları Kaydet"}
                        </button>
                      </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
