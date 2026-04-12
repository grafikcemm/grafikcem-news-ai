"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Sparkles, 
  Users, 
  Layout, 
  TrendingUp, 
  Copy, 
  RefreshCw, 
  Plus, 
  Grid, 
  Table as TableIcon, 
  Search,
  Filter,
  X,
  ExternalLink,
  MoreVertical,
  ArrowUpRight,
  TrendingDown,
  Minus,
  CalendarClock
} from "lucide-react";
import { StatusChip } from "@/components/ui/status-chip";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface Competitor {
  id: string;
  handle: string;
  category: string;
  follower_count: number;
  posts_per_week: number;
  last_format: string;
  trend: string;
}

interface AnalysisRecord {
  id: string;
  handles: string[];
  analysis_text: string;
  created_at: string;
}

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [latestAnalysis, setLatestAnalysis] = useState<AnalysisRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Add Modal State
  const [newHandle, setNewHandle] = useState("");
  const [newCategory, setNewCategory] = useState("design");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchData();
    fetchLatestAnalysis();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data, error } = await supabase
      .from("competitors")
      .select("*")
      .order("handle", { ascending: true });
    
    if (error) {
      toast.error("Veriler çekilemedi");
    } else {
      setCompetitors(data as Competitor[]);
    }
    setLoading(false);
  }

  async function fetchLatestAnalysis() {
    try {
      const res = await fetch("/api/competitors/analyze");
      if (res.ok) {
        const data = await res.json();
        if (data && !data.error) setLatestAnalysis(data);
      }
    } catch (err) {
      console.error("Latest analysis fetch error:", err);
    }
  }

  const handleRunAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/competitors/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (data.analysis) {
        fetchLatestAnalysis();
        toast.success("Analiz başarıyla tamamlandı!");
      } else {
        toast.error(data.error || "Analiz başarısız");
      }
    } catch (err) {
      toast.error("İstek sırasında hata oluştu");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAddCompetitor = async () => {
    if (!newHandle.trim()) return;
    setIsAdding(true);
    try {
      const handle = newHandle.startsWith("@") ? newHandle.substring(1) : newHandle;
      const { data, error } = await supabase
        .from("competitors")
        .insert({
          handle,
          category: newCategory,
          trend: 'stabil'
        })
        .select()
        .single();

      if (error) throw error;
      
      setCompetitors([...competitors, data as Competitor]);
      setNewHandle("");
      setShowAddModal(false);
      toast.success("Rakip başarıyla eklendi");
    } catch (err: any) {
      toast.error(err.message || "Ekleme hatası");
    } finally {
      setIsAdding(false);
    }
  };

  const copyAnalysis = () => {
    if (latestAnalysis?.analysis_text) {
      navigator.clipboard.writeText(latestAnalysis.analysis_text);
      toast.success("Analiz panoya kopyalandı");
    }
  };

  const filteredCompetitors = competitors.filter(c => {
    const matchesSearch = c.handle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || c.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = ["all", ...Array.from(new Set(competitors.map(c => c.category)))];

  return (
    <div className="p-6 lg:p-10 space-y-10 max-w-7xl mx-auto min-h-screen bg-[var(--surface-base)] relative">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-subtle)] flex items-center justify-center">
              <Users className="w-6 h-6 text-[var(--accent)]" />
            </div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">Rakip Radarı</h1>
          </div>
          <p className="text-[var(--text-secondary)] text-sm ml-1">Sektördeki rakipleri Gemini ile derinlemesine analiz et ve fırsatları yakala.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <Button 
            onClick={() => setShowAddModal(true)}
            className="flex-1 lg:flex-none bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white gap-2 font-semibold shadow-lg shadow-[var(--accent-glow)] rounded-[var(--radius-md)] h-11 px-6 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Rakip Ekle
          </Button>
          <Button 
            onClick={handleRunAnalysis} 
            disabled={analyzing || competitors.length === 0}
            className="flex-1 lg:flex-none bg-[var(--surface-elevated)] hover:bg-[var(--surface-overlay)] text-[var(--accent)] border border-[var(--accent-muted)] gap-2 font-semibold rounded-[var(--radius-md)] h-11 px-6 transition-all"
          >
            {analyzing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {analyzing ? "Gemini Analiz Ediyor..." : "Gemini ile Analiz Et"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        {/* Left Column: Management & List */}
        <div className="xl:col-span-12 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[var(--surface-raised)]/50 p-4 rounded-2xl border border-[var(--border-subtle)]">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                <Input 
                  placeholder="Kullanıcı adı ara..." 
                  className="pl-10 h-10 bg-[var(--surface-elevated)] border-[var(--border-default)]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center bg-[var(--surface-elevated)] p-1 rounded-lg border border-[var(--border-default)]">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-[var(--surface-overlay)] text-[var(--accent)] shadow-sm' : 'text-[var(--text-tertiary)]'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-[var(--surface-overlay)] text-[var(--accent)] shadow-sm' : 'text-[var(--text-tertiary)]'}`}
                >
                  <TableIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
              <Filter className="w-3.5 h-3.5 text-[var(--text-tertiary)] shrink-0" />
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                    categoryFilter === cat 
                      ? "bg-[var(--accent-subtle)] text-[var(--accent)] ring-1 ring-[var(--accent-muted)]" 
                      : "bg-[var(--surface-elevated)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                  }`}
                >
                  {cat === "all" ? "Hepsi" : cat}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48 w-full rounded-2xl bg-[var(--surface-raised)]" />)}
            </div>
          ) : filteredCompetitors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-[var(--surface-raised)] rounded-3xl border border-dashed border-[var(--border-strong)]">
              <Users className="w-12 h-12 text-[var(--text-tertiary)] mb-4" />
              <p className="text-[var(--text-secondary)] font-medium">Rakip bulunamadı.</p>
              <Button variant="link" onClick={() => {setSearchQuery(""); setCategoryFilter("all")}} className="text-[var(--accent)] text-xs mt-1">Filtreleri temizle</Button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredCompetitors.map(c => (
                <Card key={c.id} className="group bg-[var(--surface-raised)] hover:bg-[var(--surface-overlay)] border-[var(--border-subtle)] hover:border-[var(--accent-muted)] transition-all duration-300 rounded-2xl shadow-sm hover:shadow-xl relative overflow-hidden">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-base font-bold text-[var(--text-primary)]">@{c.handle}</p>
                          <a href={`https://instagram.com/${c.handle}`} target="_blank" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <ExternalLink className="w-3 h-3 text-[var(--text-tertiary)] hover:text-[var(--accent)]" />
                          </a>
                        </div>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-widest px-2 py-0 border-[var(--border-default)] text-[var(--text-tertiary)] bg-[var(--surface-base)]">
                          {c.category}
                        </Badge>
                      </div>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        c.trend === 'yukseliyor' ? 'bg-[var(--success-subtle)] text-[var(--success)]' : 
                        c.trend === 'dusuyor' ? 'bg-[var(--danger-subtle)] text-[var(--danger)]' : 'bg-[var(--surface-elevated)] text-[var(--text-tertiary)]'
                      }`}>
                        {c.trend === 'yukseliyor' ? <TrendingUp className="w-4 h-4" /> : 
                         c.trend === 'dusuyor' ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[10px] text-[var(--text-tertiary)] font-bold uppercase mb-1">Takipçi</p>
                        <p className="text-xl font-bold text-[var(--text-primary)] tabular-nums">
                          {c.follower_count ? c.follower_count.toLocaleString('tr-TR') : '—'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-[var(--text-tertiary)] font-bold uppercase mb-1">Haftalık Post</p>
                        <p className="text-xl font-bold text-[var(--text-primary)] tabular-nums">{c.posts_per_week || '—'}</p>
                      </div>
                    </div>
                    
                    <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                         <Layout className="w-3.5 h-3.5 text-[var(--accent)]" />
                         <span className="text-xs text-[var(--text-secondary)] font-medium">Son format:</span>
                      </div>
                      <span className="text-xs text-[var(--text-primary)] bg-[var(--surface-elevated)] px-2 py-0.5 rounded-md border border-[var(--border-default)]">
                        {c.last_format || "Bilinmiyor"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="bg-[var(--surface-raised)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-[var(--surface-overlay)]/40 text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Rakip Hesap</th>
                    <th className="px-6 py-4">Kategori</th>
                    <th className="px-6 py-4 text-right">Takipçi</th>
                    <th className="px-6 py-4 text-right">Haftalık Post</th>
                    <th className="px-6 py-4">Son Format</th>
                    <th className="px-6 py-4">Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {filteredCompetitors.map(c => (
                    <tr key={c.id} className="hover:bg-[var(--surface-overlay)]/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[var(--text-primary)]">@{c.handle}</span>
                          <a href={`https://instagram.com/${c.handle}`} target="_blank"><ExternalLink className="w-3 h-3 text-[var(--text-tertiary)]" /></a>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="ghost" className="text-[11px] bg-[var(--surface-elevated)] text-[var(--text-secondary)]">{c.category}</Badge>
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums text-sm font-semibold">{c.follower_count?.toLocaleString('tr-TR') || '—'}</td>
                      <td className="px-6 py-4 text-right tabular-nums text-sm font-semibold">{c.posts_per_week || '—'}</td>
                      <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{c.last_format || '—'}</td>
                      <td className="px-6 py-4">
                        <StatusChip 
                          status={c.trend === 'yukseliyor' ? 'done' : c.trend === 'dusuyor' ? 'pending' : 'draft'} 
                          label={c.trend === 'yukseliyor' ? 'Yükseliş' : c.trend === 'dusuyor' ? 'Düşüş' : 'Stabil'} 
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Analysis Section */}
        <div className="xl:col-span-12 space-y-6">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-[var(--accent2-subtle)] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[var(--accent2)]" />
             </div>
             <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">AI Strateji Raporu</h2>
          </div>
          
          <Card className="bg-[var(--surface-raised)] border border-[var(--border-subtle)] rounded-3xl overflow-hidden min-h-[500px] flex flex-col shadow-2xl relative">
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-[var(--accent)]/5 blur-[100px] pointer-events-none" />
            
            <CardHeader className="border-b border-[var(--border-subtle)] bg-[var(--surface-overlay)]/20 px-8 py-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-base text-[var(--text-primary)] font-bold">En Son Gemini Analizi</CardTitle>
                  {latestAnalysis && (
                    <div className="flex items-center gap-2 text-[11px] text-[var(--text-tertiary)] font-medium">
                      <CalendarClock className="w-3.5 h-3.5" />
                      Son güncelleme: {new Date(latestAnalysis.created_at).toLocaleString('tr-TR')}
                    </div>
                  )}
                </div>
                {latestAnalysis && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={copyAnalysis}
                    className="bg-[var(--surface-overlay)] hover:bg-[var(--surface-elevated)] border-[var(--border-strong)] text-[12px] gap-2 rounded-xl"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Raporu Kopyala
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-8 flex-1">
              {analyzing ? (
                <div className="flex flex-col items-center justify-center h-full space-y-6 text-center py-20 relative z-10">
                   <div className="relative">
                      <div className="w-20 h-20 border-4 border-[var(--accent-glow)] border-t-[var(--accent)] rounded-full animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                         <Sparkles className="w-8 h-8 text-[var(--accent)] animate-pulse" />
                      </div>
                   </div>
                   <div className="space-y-1.5">
                      <p className="text-xl font-bold text-[var(--text-primary)]">Gemini Rakipleri İnceliyor</p>
                      <p className="text-[var(--text-secondary)] text-sm max-w-sm mx-auto">
                        Tüm rakip handles veritabanından çekildi. Gemini şu an verileri birleştirip senin için en iyi stratejiyi hazırlıyor.
                      </p>
                   </div>
                   <div className="flex items-center gap-2 text-xs text-[var(--accent)] font-semibold animate-pulse">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                      ANALÝZ MODU: ANALYTICAL (Low Temperature)
                   </div>
                </div>
              ) : latestAnalysis ? (
                <div className="prose prose-invert max-w-none relative z-10 transition-all duration-1000">
                  <pre className="font-sans whitespace-pre-wrap text-[15px] leading-[1.8] text-[var(--text-secondary)] bg-[var(--surface-elevated)]/30 p-8 rounded-2xl border border-[var(--border-subtle)] selection:bg-[var(--accent-muted)] selection:text-[var(--accent)]">
                    {latestAnalysis.analysis_text}
                  </pre>
                  <div className="mt-8 flex justify-center">
                     <p className="text-[11px] text-[var(--text-tertiary)] font-bold tracking-widest uppercase flex items-center gap-2">
                        <Sparkles className="w-3 h-3" />
                        Gemini 3 Flash tarafından üretilmiştir
                     </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-20 space-y-6 relative z-10 grayscale hover:grayscale-0 transition-all duration-500">
                  <div className="w-24 h-24 rounded-full bg-[var(--surface-elevated)] flex items-center justify-center shadow-inner">
                    <Layout className="w-10 h-10 text-[var(--text-tertiary)]" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-bold text-[var(--text-primary)]">Analiz Raporu Bekleniyor</p>
                    <p className="text-[var(--text-secondary)] text-sm max-w-sm mx-auto">
                      Gemini henüz bir rakip analizi yapmadı. Rakiplerin stratejilerini öğrenmek için hemen başlayın.
                    </p>
                  </div>
                  <Button onClick={handleRunAnalysis} variant="secondary" className="rounded-xl border border-[var(--border-default)]">Şimdi Başlat</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Competitor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[var(--surface-base)]/80 backdrop-blur-md" onClick={() => setShowAddModal(false)} />
          <Card className="w-full max-w-md bg-[var(--surface-raised)] border-[var(--border-strong)] shadow-2xl relative z-10 rounded-3xl overflow-hidden scale-in animate-in fade-in zoom-in duration-200">
            <CardHeader className="p-8 pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl font-bold">Yeni Rakip Ekle</CardTitle>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-[var(--surface-overlay)] rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Instagram Kullanıcı Adı</label>
                <div className="relative">
                   <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] font-bold">@</div>
                   <input 
                     value={newHandle}
                     onChange={(e) => setNewHandle(e.target.value)}
                     className="w-full bg-[var(--surface-elevated)] border-[var(--border-default)] rounded-xl h-12 pl-9 pr-4 text-[var(--text-primary)] focus:ring-2 ring-[var(--accent-glow)] outline-none transition-all"
                     placeholder="kullaniciadi"
                     autoFocus
                   />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Kategori</label>
                <select 
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-[var(--surface-elevated)] border-[var(--border-default)] rounded-xl h-12 px-4 text-[var(--text-primary)] focus:ring-2 ring-[var(--accent-glow)] outline-none transition-all appearance-none"
                >
                  <option value="design">Design</option>
                  <option value="ai">Artificial Intelligence</option>
                  <option value="business">Business / Freelance</option>
                  <option value="coding">Coding / Tech</option>
                  <option value="motivation">Motivation / Habits</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                 <Button 
                   variant="ghost" 
                   onClick={() => setShowAddModal(false)}
                   className="flex-1 h-12 rounded-xl border border-[var(--border-default)]"
                 >
                   Vazgeç
                 </Button>
                 <Button 
                   onClick={handleAddCompetitor}
                   disabled={isAdding || !newHandle.trim()}
                   className="flex-1 h-12 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl shadow-lg shadow-[var(--accent-glow)]"
                 >
                   {isAdding ? "Ekleniyor..." : "Kaydet ve Takip Et"}
                 </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
