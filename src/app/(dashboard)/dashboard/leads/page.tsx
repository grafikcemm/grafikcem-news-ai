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
  Play,
  Mail,
  Calendar,
  Zap,
  X,
} from "lucide-react";
import Link from "next/link";
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
  ai_analysis?: string;
  phone?: string;
  created_at: string;
}

const statusLabels: Record<string, string> = {
  discovered: "Keşfedildi",
  researched: "Araştırıldı",
  contacted: "İletişime Geçildi",
  pitched: "Teklif Gönderildi",
  won: "Kazanıldı",
  lost: "Kaybedildi"
};

const statusFilters = [
  { value: "all", label: "Tümü" },
  { value: "discovered", label: "Keşfedildi" },
  { value: "researched", label: "Araştırıldı" },
  { value: "contacted", label: "İletişime Geçildi" },
  { value: "won", label: "Kazanıldı" },
];

function ScoreColor(score: number): string {
  if (score <= 40) return "var(--danger)";
  if (score <= 70) return "var(--warning)";
  return "var(--success)";
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");

  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanSectors, setScanSectors] = useState<string[]>([]);
  const [scanCity, setScanCity] = useState("");
  const [scanLimit, setScanLimit] = useState(30);
  const [isScanning, setIsScanning] = useState(false);

  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false);

  // Slide panel
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

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
        if (selectedLead?.id === id) setSelectedLead(data.lead);
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
        await new Promise(r => setTimeout(r, 500));
    }
    toast.success(`Tüm analizler tamamlandı! (${count}/${discoveredLeads.length})`);
    setIsAnalyzingAll(false);
  };

  const filtered = leads.filter(l => {
    if (activeFilter === "all") return true;
    return l.status === activeFilter;
  });

  return (
    <div className="flex flex-col" style={{ minHeight: "calc(100vh - 56px)", background: "var(--surface-base)" }}>
      {/* Header */}
      <div style={{ padding: "32px 40px 20px" }}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-display" style={{ fontSize: 24, marginBottom: 4 }}>Lead Havuzu</h1>
            <p className="text-body" style={{ fontSize: 13 }}>Türkiye genelinde potansiyel müşteriler</p>
          </div>
          <div className="flex items-center gap-[12px]">
            <Button variant="ghost" size="sm" onClick={handleAnalyzeAll} disabled={isAnalyzingAll || loading}>
              <Zap className="w-[14px] h-[14px]" /> AI ile Analiz Et
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setScanModalOpen(true)} disabled={loading}>
              <Search className="w-[14px] h-[14px]" /> Sektör Tara
            </Button>
            <Button onClick={() => setScanModalOpen(true)}>+ Yeni Lead</Button>
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-[8px]" style={{ marginTop: 16 }}>
          {statusFilters.map(f => (
            <button
              key={f.value}
              onClick={() => setActiveFilter(f.value)}
              style={{
                padding: "5px 14px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 500,
                background: activeFilter === f.value ? "var(--accent-subtle)" : "var(--surface-elevated)",
                color: activeFilter === f.value ? "var(--accent)" : "var(--text-secondary)",
                border: `1px solid ${activeFilter === f.value ? "var(--accent-muted)" : "var(--border-default)"}`,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ padding: "0 40px", flex: 1 }}>
        {/* Table Header */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: "3fr 1fr 1fr 1fr 120px",
            background: "var(--surface-raised)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
            padding: "12px 20px",
          }}
        >
          <span className="text-label">İşletme</span>
          <span className="text-label">Sektör</span>
          <span className="text-label">Şehir</span>
          <span className="text-label">Skor</span>
          <span className="text-label">Aksiyon</span>
        </div>

        {/* Table Rows */}
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-tertiary)" }}>Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div style={{
            padding: 40,
            textAlign: "center",
            color: "var(--text-tertiary)",
            background: "var(--surface-card)",
            border: "1px solid var(--border-subtle)",
            borderTop: "none",
            borderRadius: "0 0 var(--radius-lg) var(--radius-lg)",
          }}>
            Lead havuzu boş. Türkiye genelinde sektör bazlı tara.
          </div>
        ) : (
          <div>
            {filtered.map((lead, idx) => (
              <div
                key={lead.id}
                className="grid cursor-pointer transition-colors duration-100"
                onClick={() => setSelectedLead(lead)}
                style={{
                  gridTemplateColumns: "3fr 1fr 1fr 1fr 120px",
                  background: "var(--surface-card)",
                  borderLeft: "1px solid var(--border-subtle)",
                  borderRight: "1px solid var(--border-subtle)",
                  borderBottom: "1px solid var(--border-subtle)",
                  padding: "14px 20px",
                  alignItems: "center",
                  borderRadius: idx === filtered.length - 1 ? "0 0 var(--radius-lg) var(--radius-lg)" : 0,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-elevated)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--surface-card)"; }}
              >
                <div className="flex items-center gap-[8px]">
                  <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 13 }}>{lead.business_name}</span>
                  {lead.has_website && <Globe className="w-[12px] h-[12px]" style={{ color: "var(--accent)" }} />}
                </div>
                <div>
                  <span style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    background: "var(--surface-elevated)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-secondary)",
                  }}>
                    {lead.sector}
                  </span>
                </div>
                <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>{lead.city}</span>
                <div className="flex items-center gap-[8px]">
                  <span style={{ fontSize: 16, fontWeight: 700, color: ScoreColor(lead.potential_score) }}>{lead.potential_score || 0}</span>
                  <div style={{ width: 30, height: 3, background: "var(--surface-overlay)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: `${lead.potential_score || 0}%`, height: "100%", background: ScoreColor(lead.potential_score), borderRadius: 2 }} />
                  </div>
                </div>
                <div className="flex items-center gap-[4px]">
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); }}>DM Yaz</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Slide-in Panel */}
      {selectedLead && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.4)" }}
            onClick={() => setSelectedLead(null)}
          />
          {/* Panel */}
          <div
            className="fixed right-0 top-0 h-full z-50 flex flex-col overflow-y-auto"
            style={{
              width: 420,
              background: "var(--surface-raised)",
              borderLeft: "1px solid var(--border-default)",
              transition: "transform 0.25s ease",
            }}
          >
            {/* Header */}
            <div className="flex justify-between items-center" style={{ padding: 20, borderBottom: "1px solid var(--border-subtle)" }}>
              <span className="text-label">LEAD DETAYI</span>
              <button onClick={() => setSelectedLead(null)} style={{ color: "var(--text-tertiary)", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            {/* Score Hero */}
            <div style={{ padding: 20, background: "var(--surface-elevated)", margin: 16, borderRadius: "var(--radius-md)" }}>
              <div className="flex items-end gap-[8px]" style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 40, fontWeight: 800, color: ScoreColor(selectedLead.potential_score), lineHeight: 1 }}>
                  {selectedLead.potential_score || 0}
                </span>
                <span style={{ fontSize: 14, color: "var(--text-tertiary)", paddingBottom: 4 }}>/100 Potansiyel</span>
              </div>
              <div style={{ height: 6, background: "var(--surface-overlay)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${selectedLead.potential_score || 0}%`, height: "100%", background: ScoreColor(selectedLead.potential_score), borderRadius: 3 }} />
              </div>
            </div>

            {/* Info */}
            <div style={{ padding: "0 20px" }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>{selectedLead.business_name}</h2>
              <div className="flex items-center gap-[8px]" style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 11, padding: "2px 8px", background: "var(--surface-elevated)", borderRadius: "var(--radius-sm)", color: "var(--text-secondary)" }}>
                  {selectedLead.sector}
                </span>
                <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                  <MapPin size={12} style={{ display: "inline", marginRight: 4 }} />
                  {selectedLead.city}{selectedLead.district ? ` / ${selectedLead.district}` : ""}
                </span>
              </div>
              {selectedLead.phone && (
                <p style={{ fontSize: 13, color: "var(--accent)", marginBottom: 4 }}>{selectedLead.phone}</p>
              )}
              <StatusChip
                status={(selectedLead.status as any) || "draft"}
                label={statusLabels[selectedLead.status] || selectedLead.status}
              />
            </div>

            {/* AI Analysis */}
            {selectedLead.ai_analysis && (
              <div style={{
                margin: "16px 20px",
                padding: 16,
                background: "var(--accent-subtle)",
                border: "1px solid var(--accent-muted)",
                borderLeft: "3px solid var(--accent)",
                borderRadius: "var(--radius-md)",
              }}>
                <p className="text-label" style={{ marginBottom: 8 }}>NEDEN UMUT VERİCİ</p>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{selectedLead.ai_analysis}</p>
              </div>
            )}

            {/* Services */}
            {selectedLead.recommended_services && selectedLead.recommended_services.length > 0 && (
              <div style={{ margin: "0 20px" }}>
                <p className="text-label" style={{ marginBottom: 8 }}>ÖNERİLEN HİZMETLER</p>
                <div className="flex flex-wrap gap-[6px]">
                  {selectedLead.recommended_services.map((s, i) => (
                    <span key={i} style={{
                      fontSize: 11,
                      padding: "4px 10px",
                      background: "var(--surface-elevated)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--text-secondary)",
                    }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Price */}
            {(selectedLead.estimated_price_min || selectedLead.estimated_price_max) && (
              <div style={{ margin: "16px 20px" }}>
                <p className="text-label" style={{ marginBottom: 4 }}>TAHMİNİ FİYAT</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
                  {selectedLead.estimated_price_min ? `${(selectedLead.estimated_price_min / 1000).toFixed(0)}k` : "?"} — {selectedLead.estimated_price_max ? `${(selectedLead.estimated_price_max / 1000).toFixed(0)}k ₺` : "?"}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="mt-auto" style={{ padding: 20, borderTop: "1px solid var(--border-subtle)" }}>
              <Link href={`/dashboard/leads/outreach?leadId=${selectedLead.id}`}>
                <Button className="w-full" style={{ marginBottom: 8 }}>DM Yaz</Button>
              </Link>
              <Button variant="secondary" className="w-full" style={{ marginBottom: 8 }}>E-posta Yaz</Button>
              <Button variant="ghost" className="w-full" onClick={() => {
                toast.promise(analyzeSingleLead(selectedLead.id), {
                  loading: 'Analiz ediliyor...',
                  success: 'Tamamlandı!',
                  error: 'Hata'
                });
              }}>
                AI Analiz Et
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Scan Modal */}
      {scanModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", padding: 16 }}>
          <div style={{ maxWidth: 440, width: "100%", background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: 24 }}>
            <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)" }}>Yeni Tarama Başlat</h3>
              <button onClick={() => setScanModalOpen(false)} style={{ color: "var(--text-tertiary)", cursor: "pointer" }}><X size={20} /></button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-label" style={{ display: "block", marginBottom: 10 }}>Sektörler</label>
                <div className="grid grid-cols-2 gap-2">
                  {["guzellik", "moda", "emlak", "spor", "egitim"].map(sec => (
                    <label key={sec} className="flex items-center gap-2 cursor-pointer" style={{
                      fontSize: 13,
                      background: "var(--surface-elevated)",
                      padding: 12,
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-subtle)",
                    }}>
                      <input type="checkbox" checked={scanSectors.includes(sec)} onChange={(e) => {
                        if (e.target.checked) setScanSectors([...scanSectors, sec]);
                        else setScanSectors(scanSectors.filter(s => s !== sec));
                      }} style={{ accentColor: "var(--accent)" }} />
                      <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{sec}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-label" style={{ display: "block", marginBottom: 8 }}>Şehir (Opsiyonel)</label>
                <input type="text" value={scanCity} onChange={(e) => setScanCity(e.target.value)} placeholder="Örn: İstanbul"
                  style={{
                    width: "100%",
                    background: "var(--surface-elevated)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-md)",
                    padding: "10px 14px",
                    fontSize: 13,
                    color: "var(--text-primary)",
                    outline: "none",
                  }}
                />
              </div>
              <div>
                <label className="text-label" style={{ display: "block", marginBottom: 8 }}>Maksimum Sonuç</label>
                <input type="number" min={1} max={100} value={scanLimit} onChange={(e) => setScanLimit(parseInt(e.target.value))}
                  style={{
                    width: "100%",
                    background: "var(--surface-elevated)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-md)",
                    padding: "10px 14px",
                    fontSize: 13,
                    color: "var(--text-primary)",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3" style={{ marginTop: 32 }}>
              <Button variant="ghost" onClick={() => setScanModalOpen(false)}>İptal</Button>
              <Button onClick={handleScan} disabled={isScanning}>
                {isScanning ? <RefreshCcw className="w-[14px] h-[14px] mr-2 animate-spin" /> : null}
                {isScanning ? "Taranıyor..." : "Taramayı Başlat"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
