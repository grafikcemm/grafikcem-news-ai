"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Search,
  MapPin,
  Globe,
  Instagram,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  Play,
  Mail,
  Calendar,
  Zap,
} from "lucide-react";
import Link from "next/link";

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filterStatus, setFilterStatus] = useState("Tümü");
  const [filterSector, setFilterSector] = useState("Tümü");
  const [sortOption, setSortOption] = useState("Skora Göre ↓");

  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanSectors, setScanSectors] = useState<string[]>([]);
  const [scanCity, setScanCity] = useState("");
  const [scanLimit, setScanLimit] = useState(30);
  const [isScanning, setIsScanning] = useState(false);
  
  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState({ done: 0, total: 0 });

  const loadLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
    if (!error && data) {
      setLeads(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadLeads();
  }, []);

  const handleScan = async () => {
    if (scanSectors.length === 0) {
      toast.error("Lütfen en az 1 sektör seçin");
      return;
    }
    setIsScanning(true);
    try {
      const res = await fetch("/api/leads/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectors: scanSectors, city: scanCity, limit: scanLimit }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Tarama tamamlandı! ${data.added} yeni lead eklendi.`);
        loadLeads();
        setScanModalOpen(false);
      } else {
        toast.error(data.error || "Tarama başarısız");
      }
    } catch (err: any) {
      toast.error("Hata: " + err.message);
    }
    setIsScanning(false);
  };

  const analyzeSingleLead = async (id: string) => {
    try {
      const res = await fetch("/api/leads/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLeads((prev) => prev.map((l) => (l.id === id ? data.lead : l)));
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  const handleAnalyzeAll = async () => {
    const discoveredLeads = leads.filter(l => l.status === "discovered");
    if (discoveredLeads.length === 0) {
      toast.info("Analiz edilecek 'Keşfedildi' durumunda lead yok.");
      return;
    }
    
    setIsAnalyzingAll(true);
    setAnalyzeProgress({ done: 0, total: discoveredLeads.length });
    
    for (let i = 0; i < discoveredLeads.length; i++) {
        const lead = discoveredLeads[i];
        const success = await analyzeSingleLead(lead.id);
        if (success) {
            setAnalyzeProgress(p => ({ ...p, done: p.done + 1 }));
        }
        // sleep 500ms
        await new Promise(r => setTimeout(r, 500));
    }
    toast.success("Tüm analizler tamamlandı!");
    setIsAnalyzingAll(false);
  };

  const sectorColors: Record<string, string> = {
    guzellik: "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300",
    moda: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300",
    emlak: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300",
    spor: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300",
    egitim: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300",
  };
  
  const statusLabels: Record<string, string> = {
    discovered: "Keşfedildi",
    researched: "Araştırıldı",
    contacted: "İletişime Geçildi",
    pitched: "Teklif Gönderildi",
    won: "Kazanıldı",
    lost: "Kaybedildi"
  };

  const filteredLeads = leads.filter((l) => {
    if (filterStatus !== "Tümü" && statusLabels[l.status] !== filterStatus) return false;
    if (filterSector !== "Tümü" && l.sector !== filterSector) return false;
    return true;
  }).sort((a, b) => {
    if (sortOption === "Skora Göre ↓") return (b.potential_score || 0) - (a.potential_score || 0);
    if (sortOption === "En Yeni") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortOption === "Şehre Göre") return (a.city || "").localeCompare(b.city || "");
    return 0;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-linear-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400">
            Lead Havuzu
          </h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            Müşteri avı radarına giren potansiyel işletmeler.
            {isAnalyzingAll && (
               <span className="text-emerald-500 font-medium ml-2 animate-pulse flex items-center gap-1">
                 <RefreshCcw className="w-4 h-4 animate-spin"/> {analyzeProgress.done} / {analyzeProgress.total} analiz ediliyor...
               </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleAnalyzeAll}
            disabled={isAnalyzingAll}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            <Zap className="w-4 h-4" /> Tümünü Analiz Et
          </button>
          <button 
            onClick={() => setScanModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
          >
            <Search className="w-4 h-4" /> Yeni Tarama Başlat
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-6 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {["Tümü", "Keşfedildi", "Araştırıldı", "İletişime Geçildi", "Teklif Gönderildi", "Kazanıldı", "Kaybedildi"].map(st => (
            <button 
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${filterStatus === st ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'}`}
            >
              {st}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4">
           <select 
             value={filterSector} 
             onChange={e => setFilterSector(e.target.value)}
             className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 dark:bg-slate-900 dark:border-slate-700"
           >
             <option value="Tümü">Tüm Sektörler</option>
             <option value="guzellik">Güzellik & Kuaför</option>
             <option value="moda">Butik & Moda</option>
             <option value="emlak">Emlak</option>
             <option value="spor">Spor & Fitness</option>
             <option value="egitim">Eğitim & Kurs</option>
           </select>
           <select 
             value={sortOption} 
             onChange={e => setSortOption(e.target.value)}
             className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 dark:bg-slate-900 dark:border-slate-700"
           >
             <option>Skora Göre ↓</option>
             <option>En Yeni</option>
             <option>Şehre Göre</option>
           </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20"><RefreshCcw className="w-8 h-8 animate-spin text-slate-400" /></div>
      ) : filteredLeads.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 border-dashed">
          <p className="text-slate-500 mb-4">Henüz kriterlere uygun lead yok.</p>
          <button onClick={() => setScanModalOpen(true)} className="text-blue-600 font-medium hover:underline">
            Yeni Tarama Başlat
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredLeads.map(lead => (
            <div key={lead.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs hover:shadow-md transition">
              <div className="flex justify-between items-start mb-3">
                <div className={`px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold rounded-md border ${sectorColors[lead.sector] || 'bg-slate-100 text-slate-600'}`}>
                  {lead.sector}
                </div>
                <div className="flex gap-2">
                   {lead.has_website ? <Globe className="w-5 h-5 text-emerald-500" /> : <Globe className="w-5 h-5 text-red-400 opacity-50" />}
                   <Instagram className="w-5 h-5 text-slate-300" />
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1" title={lead.business_name}>
                {lead.business_name}
              </h3>
              
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 mb-4">
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {(lead.city || '') + (lead.district ? ' / '+lead.district : '')}</span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg mb-4 flex items-center justify-between border border-slate-100 dark:border-slate-700/50">
                 <div>
                   <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Potansiyel Skor</p>
                   <div className="flex items-end gap-2">
                     <span className={`text-2xl font-black ${lead.potential_score >= 71 ? 'text-emerald-500' : lead.potential_score >= 41 ? 'text-amber-500' : 'text-red-500'}`}>
                       {lead.potential_score || 0}
                     </span>
                     <span className="text-xs text-slate-400 mb-1">/ 100</span>
                   </div>
                 </div>
                 <div className="text-right">
                   <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Durum</p>
                   <span className="inline-flex items-center px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-md">
                     {statusLabels[lead.status] || lead.status}
                   </span>
                 </div>
              </div>

              {lead.recommended_services && lead.recommended_services.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-1.5">
                    {lead.recommended_services.map((s: string) => (
                      <span key={s} className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 text-xs rounded border border-indigo-100 dark:border-indigo-800">
                        {s.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                  {lead.estimated_price_min && (
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 font-medium">
                        Tahmini: {lead.estimated_price_min.toLocaleString('tr-TR')} ₺ - {lead.estimated_price_max.toLocaleString('tr-TR')} ₺
                      </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-4 gap-2 border-t border-slate-100 dark:border-slate-700/50 pt-4 mt-auto">
                <button onClick={() => {toast.promise(analyzeSingleLead(lead.id), {loading: 'Analiz ediliyor...', success: 'Tamamlandı!', error: 'Hata'})}} className="flex flex-col items-center justify-center gap-1 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 hover:text-blue-600 transition">
                  <Play className="w-4 h-4" />
                  <span className="text-[10px] font-medium">Analiz Et</span>
                </button>
                <Link href={`/dashboard/leads/outreach?leadId=${lead.id}`} className="flex flex-col items-center justify-center gap-1 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 hover:text-emerald-600 transition">
                  <Mail className="w-4 h-4" />
                  <span className="text-[10px] font-medium">Mesaj Yaz</span>
                </Link>
                <button className="flex flex-col items-center justify-center gap-1 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 hover:text-purple-600 transition">
                  <Calendar className="w-4 h-4" />
                  <span className="text-[10px] font-medium">Plana Ekle</span>
                </button>
                <Link href={`/dashboard/leads/crm`} className="flex flex-col items-center justify-center gap-1 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 hover:text-orange-600 transition">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-[10px] font-medium">Kullandım</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Scan Modal */}
      {scanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
           <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Yeni Tarama Başlat</h3>
                <button onClick={() => setScanModalOpen(false)} className="text-slate-400 hover:text-slate-600"><XCircle className="w-6 h-6"/></button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Sektörler</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["guzellik", "moda", "emlak", "spor", "egitim"].map(sec => (
                       <label key={sec} className="flex items-center gap-2 text-sm bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer">
                         <input type="checkbox" checked={scanSectors.includes(sec)} onChange={(e) => {
                           if(e.target.checked) setScanSectors([...scanSectors, sec]);
                           else setScanSectors(scanSectors.filter(s => s !== sec));
                         }} className="rounded text-blue-600" />
                         {sec}
                       </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Şehir (Opsiyonel)</label>
                  <input type="text" value={scanCity} onChange={(e) => setScanCity(e.target.value)} placeholder="Örn: İstanbul" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Maksimum Lead Sayısı</label>
                  <input type="number" min={1} max={100} value={scanLimit} onChange={(e) => setScanLimit(parseInt(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                 <button onClick={() => setScanModalOpen(false)} className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-lg text-sm">İptal</button>
                 <button onClick={handleScan} disabled={isScanning} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center gap-2">
                   {isScanning ? <RefreshCcw className="w-4 h-4 animate-spin"/> : <Search className="w-4 h-4"/>} 
                   {isScanning ? "Taranıyor..." : "Taramayı Başlat"}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
