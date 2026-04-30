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
  CalendarClock,
  LoaderCircle
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
    <div className="p-6 lg:p-10 space-y-10 max-w-7xl mx-auto min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Rakip Radarı</h1>
          </div>
          <p className="text-[var(--text-secondary)] text-sm">Sektördeki rakipleri Gemini ile derinlemesine analiz et.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <Button 
            onClick={() => setShowAddModal(true)}
            className="flex-1 lg:flex-none bg-[var(--accent)] text-black hover:opacity-90 gap-2 font-semibold rounded-xl h-11 px-6 transition-all"
          >
            <Plus className="w-4 h-4" />
            Rakip Ekle
          </Button>
          <Button 
            onClick={handleRunAnalysis} 
            disabled={analyzing || competitors.length === 0}
            className="flex-1 lg:flex-none bg-[var(--bg-surface)] text-white border border-[var(--border-default)] hover:border-[var(--border-strong)] gap-2 font-semibold rounded-xl h-11 px-6 transition-all"
          >
            {analyzing ? (
              <LoaderCircle className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-[var(--accent)]" />
            )}
            {analyzing ? "Gemini Analiz Ediyor..." : "Gemini ile Analiz Et"}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[var(--bg-surface)] p-4 rounded-2xl border border-[var(--border-subtle)]">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <Input 
                placeholder="Kullanıcı adı ara..." 
                className="pl-10 h-10 bg-[var(--bg-elevated)] border-[var(--border-default)] text-sm rounded-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center bg-[var(--bg-elevated)] p-1 rounded-lg border border-[var(--border-default)]">
              <button 
                onClick={() => setViewMode('grid')}
                className={cn("p-1.5 rounded-md transition-all", viewMode === 'grid' ? 'bg-[var(--bg-surface)] text-white shadow-sm' : 'text-[var(--text-muted)]')}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('table')}
                className={cn("p-1.5 rounded-md transition-all", viewMode === 'table' ? 'bg-[var(--bg-surface)] text-white shadow-sm' : 'text-[var(--text-muted)]')}
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 custom-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border",
                  categoryFilter === cat 
                    ? "bg-white text-black border-white" 
                    : "bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-muted)] hover:text-white"
                )}
              >
                {cat === "all" ? "Hepsi" : cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48 w-full rounded-2xl bg-[var(--bg-surface)]" />)}
          </div>
        ) : filteredCompetitors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-[var(--bg-surface)] rounded-3xl border border-dashed border-[var(--border-subtle)] opacity-40">
            <Users className="w-12 h-12 mb-4" />
            <p className="font-medium">Rakip bulunamadı.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCompetitors.map(c => (
              <Card key={c.id} className="group bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-all duration-300 rounded-2xl overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-base font-bold text-white">@{c.handle}</p>
                        <a href={`https://instagram.com/${c.handle}`} target="_blank" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <ExternalLink className="w-3 h-3 text-[var(--text-muted)] hover:text-white" />
                        </a>
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)]">
                        {c.category}
                      </span>
                    </div>
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center border",
                      c.trend === 'yukseliyor' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 
                      c.trend === 'dusuyor' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-muted)]'
                    )}>
                      {c.trend === 'yukseliyor' ? <TrendingUp className="w-4 h-4" /> : 
                       c.trend === 'dusuyor' ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] text-[var(--text-muted)] font-mono uppercase mb-1">Takipçi</p>
                      <p className="text-lg font-bold text-white tabular-nums">
                        {c.follower_count ? c.follower_count.toLocaleString('tr-TR') : '—'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-[var(--text-muted)] font-mono uppercase mb-1">Post / Hafta</p>
                      <p className="text-lg font-bold text-white tabular-nums">{c.posts_per_week || '—'}</p>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
                    <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase">Son Format</span>
                    <span className="text-[11px] text-[var(--text-secondary)] font-medium">
                      {c.last_format || "Bilinmiyor"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-[var(--bg-elevated)] text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Hesap</th>
                  <th className="px-6 py-4">Kategori</th>
                  <th className="px-6 py-4 text-right">Takipçi</th>
                  <th className="px-6 py-4 text-right">Post/Hafta</th>
                  <th className="px-6 py-4">Son Format</th>
                  <th className="px-6 py-4">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredCompetitors.map(c => (
                  <tr key={c.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">@{c.handle}</span>
                        <a href={`https://instagram.com/${c.handle}`} target="_blank"><ExternalLink className="w-3 h-3 text-[var(--text-muted)]" /></a>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">{c.category}</span>
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums text-sm font-semibold">{c.follower_count?.toLocaleString('tr-TR') || '—'}</td>
                    <td className="px-6 py-4 text-right tabular-nums text-sm font-semibold">{c.posts_per_week || '—'}</td>
                    <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{c.last_format || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded uppercase",
                        c.trend === 'yukseliyor' ? 'text-emerald-400 bg-emerald-500/10' : 
                        c.trend === 'dusuyor' ? 'text-red-400 bg-red-500/10' : 'text-[var(--text-muted)] bg-[var(--bg-elevated)]'
                      )}>
                        {c.trend || 'STABİL'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* AI Analysis Report */}
        <div className="space-y-6 pt-10">
          <div className="flex items-center gap-3">
             <h2 className="text-xl font-bold tracking-tight">AI Strateji Raporu</h2>
          </div>
          
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl overflow-hidden min-h-[400px] flex flex-col relative">
            <div className="p-8 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <h3 className="text-base text-white font-bold">Son Analiz Raporu</h3>
                  {latestAnalysis && (
                    <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] font-mono">
                      <CalendarClock className="w-3.5 h-3.5" />
                      GÜNCELLEME: {new Date(latestAnalysis.created_at).toLocaleString('tr-TR')}
                    </div>
                  )}
                </div>
                {latestAnalysis && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={copyAnalysis}
                    className="border-[var(--border-default)] text-[11px] gap-2 rounded-xl"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Kopyala
                  </Button>
                )}
              </div>
            </div>
            <div className="p-8 flex-1">
              {analyzing ? (
                <div className="flex flex-col items-center justify-center h-full space-y-6 text-center py-20">
                   <LoaderCircle className="w-12 h-12 animate-spin text-[var(--accent)]" />
                   <div className="space-y-1.5">
                      <p className="text-xl font-bold text-white">Gemini Rakipleri İnceliyor</p>
                      <p className="text-[var(--text-secondary)] text-sm max-w-sm mx-auto">
                        Veriler birleştiriliyor ve strateji raporu hazırlanıyor.
                      </p>
                   </div>
                </div>
              ) : latestAnalysis ? (
                <div className="prose prose-invert max-w-none relative z-10 animate-in fade-in duration-700">
                  <pre className="font-sans whitespace-pre-wrap text-[15px] leading-[1.8] text-[var(--text-secondary)] bg-[var(--bg-elevated)]/30 p-8 rounded-2xl border border-[var(--border-subtle)]">
                    {latestAnalysis.analysis_text}
                  </pre>
                  <div className="mt-8 flex justify-center">
                     <p className="text-[9px] text-[var(--text-muted)] font-bold tracking-widest uppercase flex items-center gap-2">
                        <Sparkles className="w-3 h-3 text-[var(--accent)]" />
                        Gemini 3 Flash Powered
                     </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-20 space-y-6 opacity-40">
                  <Layout className="w-12 h-12" />
                  <div className="space-y-2">
                    <p className="text-lg font-bold text-white">Analiz Raporu Bekleniyor</p>
                    <p className="text-sm">Rakiplerin stratejilerini öğrenmek için analizi başlat.</p>
                  </div>
                  <Button onClick={handleRunAnalysis} variant="outline" className="rounded-xl border-[var(--border-default)]">Şimdi Başlat</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Competitor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border-strong)] shadow-2xl relative z-10 rounded-3xl overflow-hidden p-8 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Yeni Rakip Ekle</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[var(--text-muted)] hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">Instagram Handle</label>
                <div className="relative">
                   <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-bold">@</div>
                   <input 
                     value={newHandle}
                     onChange={(e) => setNewHandle(e.target.value)}
                     className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl h-12 pl-9 pr-4 text-white focus:border-[var(--border-strong)] outline-none transition-all"
                     placeholder="kullaniciadi"
                   />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">Kategori</label>
                <select 
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl h-12 px-4 text-white outline-none"
                >
                  <option value="design">Design</option>
                  <option value="ai">AI / Technology</option>
                  <option value="business">Business</option>
                  <option value="coding">Coding</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                 <Button 
                   variant="ghost" 
                   onClick={() => setShowAddModal(false)}
                   className="flex-1 h-12 rounded-xl"
                 >
                   Vazgeç
                 </Button>
                 <Button 
                   onClick={handleAddCompetitor}
                   disabled={isAdding || !newHandle.trim()}
                   className="flex-1 h-12 bg-white text-black hover:opacity-90 rounded-xl"
                 >
                   {isAdding ? "Ekleniyor..." : "Takip Et"}
                 </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
