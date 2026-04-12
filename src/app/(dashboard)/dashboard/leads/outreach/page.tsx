"use client";

import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { startOfWeek, addDays } from "date-fns";
import { Search, Mail, Instagram, Linkedin, Zap, Copy, CheckCircle2 } from "lucide-react";

function OutreachContent() {
  const searchParams = useSearchParams();
  const initialLeadId = searchParams.get("leadId");
  
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Outreach generation state
  const [format, setFormat] = useState("email");
  const [language, setLanguage] = useState("tr");
  const [generatedText, setGeneratedText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadWeeklyLeads();
  }, []);

  useEffect(() => {
    if (initialLeadId && leads.length > 0) {
      const found = leads.find(l => l.id === initialLeadId);
      if (found) {
         setSelectedLead(found);
         setGeneratedText("");
      }
    }
  }, [initialLeadId, leads]);

  const loadWeeklyLeads = async () => {
    setLoading(true);
    const today = new Date();
    const monday = startOfWeek(today, { weekStartsOn: 1 });
    const startStr = monday.toISOString().split("T")[0];
    const endStr = addDays(monday, 6).toISOString().split("T")[0]; // Whole week

    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .gte("assigned_day", startStr)
      .lte("assigned_day", endStr)
      .order("assigned_day", { ascending: true });

    if (!error && data) {
      setLeads(data);
    }
    setLoading(false);
  };

  const handleGenerate = async () => {
    if (!selectedLead) return;
    setIsGenerating(true);
    try {
      const res = await fetch("/api/leads/generate-outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: selectedLead.id, format, language }),
      });
      const data = await res.json();
      if (res.ok) {
        setGeneratedText(data.text);
        toast.success("Mesaj başarıyla üretildi ve kaydedildi.");
        
        // Update local state to contacted
        setSelectedLead({...selectedLead, status: "contacted"});
        setLeads(leads.map(l => l.id === selectedLead.id ? {...l, status: "contacted"} : l));
      } else {
        toast.error(data.error);
      }
    } catch (e: any) {
      toast.error(e.message);
    }
    setIsGenerating(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedText);
    toast.success("Panoya kopyalandı!");
  };

  const handleMarkContacted = async () => {
    if (!selectedLead) return;
    const { error } = await supabase.from("leads").update({ status: "contacted" }).eq("id", selectedLead.id);
    if (!error) {
       toast.success("İletişime geçildi olarak işaretlendi!");
       setSelectedLead({...selectedLead, status: "contacted"});
       setLeads(leads.map(l => l.id === selectedLead.id ? {...l, status: "contacted"} : l));
    } else {
       toast.error("Hata oluştu.");
    }
  };

  return (
    <div className="p-6 h-[calc(100vh-64px)] flex gap-6">
      {/* LEFT PANEL: Lead List */}
      <div className="w-1/3 bg-[var(--surface-elevated)] dark:bg-[var(--surface-raised)] rounded-2xl border border-[var(--border-subtle)] dark:border-slate-800 flex flex-col hidden lg:flex">
         <div className="p-4 border-b border-[var(--border-subtle)] dark:border-slate-800">
           <h2 className="font-bold text-lg text-[var(--text-primary)] dark:text-white">Bu Haftanın Görevleri</h2>
           <p className="text-xs text-[var(--text-tertiary)] mt-1">İletişim kurulacak veya kurulmuş {leads.length} lead</p>
         </div>
         <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading ? (
              <p className="text-center text-[var(--text-tertiary)] py-4">Yükleniyor...</p>
            ) : leads.map(lead => (
              <button 
                key={lead.id} 
                onClick={() => { setSelectedLead(lead); setGeneratedText(""); }}
                className={`w-full text-left p-3 rounded-xl transition ${selectedLead?.id === lead.id ? 'bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800' : 'hover:bg-[var(--surface-card)] hover:bg-[var(--surface-elevated)] border border-transparent'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-[var(--text-primary)] dark:text-white line-clamp-1">{lead.business_name}</span>
                  {lead.status === "contacted" ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5" />}
                </div>
                <div className="text-xs text-[var(--text-tertiary)] flex justify-between">
                  <span>{lead.sector} • {lead.city}</span>
                  <span className="font-medium">Skor: {lead.potential_score}</span>
                </div>
              </button>
            ))}
         </div>
      </div>

      {/* RIGHT PANEL: Generator */}
      <div className="flex-1 bg-[var(--surface-card)] dark:bg-[var(--surface-elevated)] rounded-2xl border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] flex flex-col">
        {!selectedLead ? (
          <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-tertiary)]">
             <Search className="w-12 h-12 mb-4 opacity-20" />
             <p>İletişim oluşturmak için sol menüden bir lead seçin.</p>
          </div>
        ) : (
          <>
            {/* Top Info Bar */}
            <div className="p-6 border-b border-[var(--border-subtle)] dark:border-[var(--border-subtle)] bg-[var(--surface-card)] dark:bg-[var(--surface-raised)]/50 rounded-t-2xl">
               <div className="flex justify-between items-start">
                 <div>
                   <span className="text-[10px] uppercase font-bold tracking-widest text-blue-500">{selectedLead.sector}</span>
                   <h2 className="text-2xl font-bold text-[var(--text-primary)] dark:text-white mt-1">{selectedLead.business_name}</h2>
                   <p className="text-sm text-[var(--text-tertiary)] mt-1">{selectedLead.city} • Website: {selectedLead.has_website ? <a href={selectedLead.website_url} target="_blank" className="text-blue-500">Var</a> : 'Yok'}</p>
                 </div>
                 <div className="text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${selectedLead.status === 'contacted' ? 'bg-[var(--success-subtle)] text-[var(--success)]' : 'bg-amber-100 text-amber-700'}`}>
                      {selectedLead.status}
                    </span>
                    <p className="text-xs text-[var(--text-tertiary)] mt-2 font-semibold">Bütçe: {selectedLead.estimated_price_min || '?'} ₺</p>
                 </div>
               </div>
               
               {selectedLead.ai_analysis && (
                 <div className="mt-4 p-3 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/50 rounded-lg">
                    <p className="text-sm text-indigo-800 dark:text-indigo-300"><strong>AI Analizi:</strong> {selectedLead.ai_analysis}</p>
                 </div>
               )}
            </div>

            {/* Generator Controls */}
            <div className="p-6 flex-1 flex flex-col">
               <div className="flex flex-wrap gap-4 items-end mb-6">
                 <div>
                   <label className="block text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Platform</label>
                   <div className="flex bg-[var(--surface-elevated)] dark:bg-[var(--surface-raised)] p-1 rounded-lg">
                     <button onClick={() => setFormat('email')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${format === 'email' ? 'bg-[var(--surface-card)] dark:bg-[var(--surface-overlay)] shadow-xs text-[var(--text-primary)] dark:text-white' : 'text-[var(--text-tertiary)]'}`}><Mail className="w-4 h-4"/> E-Posta</button>
                     <button onClick={() => setFormat('instagram_dm')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${format === 'instagram_dm' ? 'bg-[var(--surface-card)] dark:bg-[var(--surface-overlay)] shadow-xs text-[var(--text-primary)] dark:text-white' : 'text-[var(--text-tertiary)]'}`}><Instagram className="w-4 h-4"/> IG DM</button>
                     <button onClick={() => setFormat('linkedin')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${format === 'linkedin' ? 'bg-[var(--surface-card)] dark:bg-[var(--surface-overlay)] shadow-xs text-[var(--text-primary)] dark:text-white' : 'text-[var(--text-tertiary)]'}`}><Linkedin className="w-4 h-4"/> LinkedIn</button>
                   </div>
                 </div>
                 
                 <div>
                   <label className="block text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Dil</label>
                   <div className="flex bg-[var(--surface-elevated)] dark:bg-[var(--surface-raised)] p-1 rounded-lg">
                     <button onClick={() => setLanguage('tr')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${language === 'tr' ? 'bg-[var(--surface-card)] dark:bg-[var(--surface-overlay)] shadow-xs text-[var(--text-primary)] dark:text-white' : 'text-[var(--text-tertiary)]'}`}>🇹🇷 TR</button>
                     <button onClick={() => setLanguage('en')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${language === 'en' ? 'bg-[var(--surface-card)] dark:bg-[var(--surface-overlay)] shadow-xs text-[var(--text-primary)] dark:text-white' : 'text-[var(--text-tertiary)]'}`}>🇬🇧 EN</button>
                   </div>
                 </div>

                 <button 
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="ml-auto flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50"
                 >
                   {isGenerating ? <Zap className="w-4 h-4 animate-pulse" /> : <Zap className="w-4 h-4" />}
                   {isGenerating ? "Üretiliyor..." : "Mesaj Üret"}
                 </button>
               </div>

               {/* Output Area */}
               <div className="relative flex-1">
                 <textarea 
                   className="w-full h-full min-h-[300px] p-5 bg-[var(--surface-elevated)] dark:bg-[var(--surface-raised)] border border-[var(--border-subtle)] dark:border-[var(--border-subtle)] rounded-xl resize-none focus:ring-2 focus:ring-blue-500 text-[var(--text-primary)] dark:text-[var(--text-secondary)]"
                   placeholder="Zekice yazılmış kişiselleştirilmiş mesajınız burada belirecek..."
                   value={generatedText}
                   onChange={(e) => setGeneratedText(e.target.value)}
                 />
                 {generatedText && (
                   <div className="absolute top-4 right-4 flex gap-2">
                     <button onClick={handleCopy} className="p-2 bg-[var(--surface-card)] dark:bg-[var(--surface-elevated)] border border-[var(--border-subtle)] dark:border-slate-600 rounded-lg text-[var(--text-secondary)] hover:text-blue-600 transition shadow-xs" title="Kopyala">
                       <Copy className="w-4 h-4" />
                     </button>
                   </div>
                 )}
               </div>
               
               <div className="mt-4 flex justify-end gap-3">
                 <button onClick={handleMarkContacted} className="px-5 py-2 bg-[var(--surface-elevated)] hover:bg-[var(--success-subtle)] text-[var(--text-primary)] hover:text-[var(--success)] dark:bg-[var(--surface-overlay)] dark:text-[var(--text-primary)] hover:bg-emerald-900/50 rounded-lg text-sm font-medium transition flex items-center gap-2">
                   <CheckCircle2 className="w-4 h-4" /> Seçiliyi İletişim Kuruldu İşaretle
                 </button>
               </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function OutreachPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20">Yükleniyor...</div>}>
      <OutreachContent />
    </Suspense>
  )
}
