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
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { ScoreBadge } from "@/components/ui/score-badge";

interface Lead {
  id: string;
  business_name: string;
  sector: string;
  status: string;
  potential_score: number;
  city: string;
  district: string;
  has_website: boolean;
  recommended_services: string[];
  estimated_price_min?: number;
  estimated_price_max?: number;
  created_at: string;
}

const statusMap: Record<string, "draft" | "active" | "done" | "pending"> = {
  discovered: "active",
  researched: "pending",
  contacted: "pending",
  pitched: "pending",
  won: "done",
  lost: "draft",
};

const statusLabels: Record<string, string> = {
  discovered: "Keşfedildi",
  researched: "Araştırıldı",
  contacted: "İletişime Geçildi",
  pitched: "Teklif Gönderildi",
  won: "Kazanıldı",
  lost: "Kaybedildi"
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanSectors, setScanSectors] = useState<string[]>([]);
  const [scanCity, setScanCity] = useState("");
  const [scanLimit, setScanLimit] = useState(30);
  const [isScanning, setIsScanning] = useState(false);
  
  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false);

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
    let count = 0;
    toast.info("Analiz işlemi arka planda başlatıldı...");
    
    for (let i = 0; i < discoveredLeads.length; i++) {
        const success = await analyzeSingleLead(discoveredLeads[i].id);
        if (success) count++;
        // sleep 500ms
        await new Promise(r => setTimeout(r, 500));
    }
    toast.success(`Tüm analizler tamamlandı! (${count}/${discoveredLeads.length})`);
    setIsAnalyzingAll(false);
  };

  const getLeadsByStatus = (statuses: string[]) => {
    return leads.filter(l => statuses.includes(l.status)).sort((a,b) => b.potential_score - a.potential_score);
  };

  const columns = [
    { title: "Keşfedilenler", statuses: ["discovered"] },
    { title: "Araştırılıyor", statuses: ["researched"] },
    { title: "Görüşme Aşaması", statuses: ["contacted", "pitched"] },
    { title: "Sonuçlanan", statuses: ["won", "lost"] },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh)] bg-[var(--surface-sunken)]">
      {/* Header */}
      <div className="p-[32px] lg:px-[40px] border-b border-[var(--border-subtle)] bg-[var(--surface-default)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-display mb-1">Müşteri Radarı</h1>
          <p className="text-small">
            Sektör taramalarını yönet, analiz et ve potansiyelleri kapat.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-[12px]">
          <Button 
            variant="secondary"
            onClick={handleAnalyzeAll}
            disabled={isAnalyzingAll || loading}
          >
            <Zap className="w-[14px] h-[14px] mr-[8px]" /> Tümünü Analiz Et
          </Button>
          <Button 
            variant="default"
            onClick={() => setScanModalOpen(true)}
            disabled={loading}
          >
            <Search className="w-[14px] h-[14px] mr-[8px]" /> Tarama Başlat
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-[24px] lg:p-[40px] w-full">
         <div className="flex h-full gap-[24px] min-w-max pb-4">
            {columns.map(col => {
              const colLeads = getLeadsByStatus(col.statuses);
              return (
                <div key={col.title} className="flex flex-col w-[340px] shrink-0 h-full max-h-full">
                  <div className="flex justify-between items-center mb-[16px] px-[8px]">
                     <h3 className="text-heading text-[15px]">{col.title}</h3>
                     <span className="text-[12px] font-bold text-[var(--text-tertiary)] bg-[var(--surface-raised)] border border-[var(--border-subtle)] px-[8px] py-[2px] rounded-full">
                       {colLeads.length}
                     </span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto pr-[8px] space-y-[12px] scrollbar-thin pb-32">
                     {loading ? (
                        [...Array(3)].map((_, i) => (
                           <Card key={i} className="animate-pulse h-[150px] bg-[var(--surface-default)]" />
                        ))
                     ) : colLeads.length === 0 ? (
                        <div className="p-6 text-center text-small text-[var(--text-tertiary)] border-2 border-dashed border-[var(--border-subtle)] rounded-[var(--radius-lg)]">
                          Bu aşamada lead bulunmuyor.
                        </div>
                     ) : colLeads.map(lead => (
                        <Card key={lead.id} className="transition-all duration-200 hover:-translate-y-[2px] hover:shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
                          <CardContent className="p-[16px]">
                             {/* Üst Bilgi Satırı */}
                             <div className="flex justify-between items-start mb-[12px]">
                                <StatusChip status={statusMap[lead.status] || "draft"} label={statusLabels[lead.status] || lead.status} />
                                <div className="flex items-center gap-2">
                                  {lead.has_website ? <Globe className="w-[14px] h-[14px] text-[var(--status-success)]" /> : <Globe className="w-[14px] h-[14px] text-[var(--text-tertiary)] opacity-50" />}
                                  <Instagram className="w-[14px] h-[14px] text-[var(--text-tertiary)]" />
                                </div>
                             </div>

                             {/* Firma Adı */}
                             <h4 className="text-body font-semibold text-[var(--text-primary)] leading-snug tracking-tight mb-[8px] line-clamp-1">
                               {lead.business_name}
                             </h4>

                             {/* Yer & Sektör */}
                             <div className="flex items-center gap-[6px] text-[11px] text-[var(--text-tertiary)] mb-[16px] font-medium uppercase tracking-wider">
                                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {(lead.city || '') + (lead.district ? ' / '+lead.district : '')}</span>
                                <span>•</span>
                                <span>{lead.sector}</span>
                             </div>

                             {/* Finansal & Skor */}
                             <div className="bg-[var(--surface-sunken)] p-[12px] rounded-[var(--radius-md)] flex items-center justify-between border border-[var(--border-subtle)] mb-[16px]">
                                <div>
                                   <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold mb-1">Potansiyel</p>
                                   <div className="flex items-end gap-1">
                                      <ScoreBadge score={lead.potential_score || 0} />
                                   </div>
                                </div>
                                <div className="text-right">
                                   <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold mb-1">Tahmini Bütçe</p>
                                   <p className="text-[13px] font-[600] text-[var(--text-secondary)]">
                                     {lead.estimated_price_min ? `₺${(lead.estimated_price_min / 1000).toFixed(0)}k+` : '-'}
                                   </p>
                                </div>
                             </div>

                             {/* Aksiyon Butonları (Grid) */}
                             <div className="grid grid-cols-4 gap-[8px] border-t border-[var(--border-subtle)] justify-items-center pt-[16px]">
                                <button onClick={() => {toast.promise(analyzeSingleLead(lead.id), {loading: 'Analiz ediliyor...', success: 'Tamamlandı!', error: 'Hata'})}} className="p-2 rounded-[var(--radius-md)] text-[var(--text-tertiary)] hover:bg-[var(--surface-overlay)] hover:text-[var(--text-primary)] transition-colors" title="Analiz Et">
                                   <Play className="w-[16px] h-[16px]" />
                                </button>
                                <Link href={`/dashboard/leads/outreach?leadId=${lead.id}`} className="p-2 rounded-[var(--radius-md)] text-[var(--text-tertiary)] hover:bg-[var(--surface-overlay)] hover:text-[var(--text-primary)] transition-colors" title="Mesaj Gönder">
                                   <Mail className="w-[16px] h-[16px]" />
                                </Link>
                                <button className="p-2 rounded-[var(--radius-md)] text-[var(--text-tertiary)] hover:bg-[var(--surface-overlay)] hover:text-[var(--text-primary)] transition-colors" title="Takvime Ekle">
                                   <Calendar className="w-[16px] h-[16px]" />
                                </button>
                                <button onClick={() => toast.success("Başarıyla sonuçlandı.")} className="p-2 rounded-[var(--radius-md)] text-[var(--text-tertiary)] hover:bg-[var(--status-success)]/10 hover:text-[var(--status-success)] transition-colors" title="Kazanıldı İşaretle">
                                   <CheckCircle2 className="w-[16px] h-[16px]" />
                                </button>
                             </div>
                          </CardContent>
                        </Card>
                     ))}
                  </div>
                </div>
              );
            })}
         </div>
      </div>

      {/* Scan Modal */}
      {scanModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-[16px]">
           <Card className="max-w-[440px] w-full p-[24px]">
              <div className="flex justify-between items-center mb-[24px]">
                <h3 className="text-heading text-[18px]">Yeni Tarama Başlat</h3>
                <button onClick={() => setScanModalOpen(false)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"><XCircle className="w-[20px] h-[20px]"/></button>
              </div>
              
              <div className="space-y-[20px]">
                <div>
                  <label className="block text-label mb-[10px]">Sektörler</label>
                  <div className="grid grid-cols-2 gap-[8px]">
                    {["guzellik", "moda", "emlak", "spor", "egitim"].map(sec => (
                       <label key={sec} className="flex items-center gap-[8px] text-[13px] bg-[var(--surface-sunken)] p-[12px] rounded-[var(--radius-md)] border border-[var(--border-subtle)] cursor-pointer hover:border-[var(--border-default)] transition-colors">
                         <input type="checkbox" checked={scanSectors.includes(sec)} onChange={(e) => {
                           if(e.target.checked) setScanSectors([...scanSectors, sec]);
                           else setScanSectors(scanSectors.filter(s => s !== sec));
                         }} className="rounded-[4px] border-[var(--border-strong)] accent-[var(--accent)]" />
                         <span className="font-medium text-[var(--text-secondary)]">{sec}</span>
                       </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-label mb-[8px]">Şehir (Opsiyonel)</label>
                  <input type="text" value={scanCity} onChange={(e) => setScanCity(e.target.value)} placeholder="Örn: İstanbul" className="w-full bg-[var(--surface-sunken)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] px-[14px] py-[10px] text-[13px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors placeholder:text-[var(--text-tertiary)]" />
                </div>

                <div>
                  <label className="block text-label mb-[8px]">Maksimum Sonuç</label>
                  <input type="number" min={1} max={100} value={scanLimit} onChange={(e) => setScanLimit(parseInt(e.target.value))} className="w-full bg-[var(--surface-sunken)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] px-[14px] py-[10px] text-[13px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors" />
                </div>
              </div>

              <div className="mt-[32px] flex justify-end gap-[12px]">
                 <Button variant="ghost" onClick={() => setScanModalOpen(false)}>İptal</Button>
                 <Button onClick={handleScan} disabled={isScanning}>
                   {isScanning ? <RefreshCcw className="w-[14px] h-[14px] mr-2 animate-spin"/> : null} 
                   {isScanning ? "Taranıyor..." : "Taramayı Başlat"}
                 </Button>
              </div>
           </Card>
        </div>
      )}
    </div>
  );
}
