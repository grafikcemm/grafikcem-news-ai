"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Users, Layout, TrendingUp, Copy, RefreshCw } from "lucide-react";

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

  useEffect(() => {
    fetchData();
    fetchLatestAnalysis();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data } = await supabase.from("competitors").select("*").order("handle", { ascending: true });
    if (data) setCompetitors(data as Competitor[]);
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
        // Refresh analysis display
        fetchLatestAnalysis();
        alert("Analiz başarıyla tamamlandı ve kaydedildi.");
      } else {
        alert("Hata: " + (data.error || "Bilinmeyen hata"));
      }
    } catch (err) {
      alert("İstek sırasında hata oluştu.");
    } finally {
      setAnalyzing(false);
    }
  };

  const copyAnalysis = () => {
    if (latestAnalysis?.analysis_text) {
      navigator.clipboard.writeText(latestAnalysis.analysis_text);
      alert("Analiz panoya kopyalandı.");
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-[var(--accent)]" />
            Rakip Takibi
          </h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Sektördeki rakiplerini Claude ile derinlemesine analiz et.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={fetchData} 
            variant="outline" 
            size="sm"
            className="bg-[var(--bg-elevated)] border-[var(--border)] text-white gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
          <Button 
            onClick={handleRunAnalysis} 
            disabled={analyzing || competitors.length === 0}
            className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white gap-2 shadow-lg shadow-[var(--accent)]/20"
          >
            <Sparkles className={`w-4 h-4 ${analyzing ? 'animate-pulse' : ''}`} />
            {analyzing ? "Claude Analiz Ediyor..." : "Claude ile Analiz Et"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Competitor List */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider px-1">Takip Edilen Rakipler</h2>
          
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl bg-[var(--bg-elevated)]" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {competitors.map(c => (
                <div key={c.id} className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] group hover:border-[var(--accent)]/50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="font-bold text-white text-sm">@{c.handle}</p>
                      <Badge variant="outline" className="text-[10px] py-0 border-[var(--border)] text-[var(--text-muted)]">{c.category}</Badge>
                    </div>
                    {c.trend === 'yukseliyor' ? (
                      <TrendingUp className="w-4 h-4 text-[var(--success)]" />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-[var(--bg-elevated)]" />
                    )}
                  </div>
                </div>
              ))}
              {competitors.length === 0 && (
                <p className="text-[var(--text-muted)] text-sm italic text-center py-8">Henüz rakip eklenmemiş.</p>
              )}
            </div>
          )}
        </div>

        {/* Analysis Section */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider px-1">Stratejik AI Analizi</h2>
          
          <Card className="bg-[var(--bg-card)] border-[var(--border)] overflow-hidden min-h-[400px] flex flex-col">
            <CardHeader className="border-b border-[var(--border)] bg-[var(--bg-elevated)]/30">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm text-white font-medium">Ali Cem için Dersler & Fırsatlar</CardTitle>
                {latestAnalysis && (
                  <span className="text-[10px] text-[var(--text-muted)] italic">
                    Son güncelleme: {new Date(latestAnalysis.created_at).toLocaleString('tr-TR')}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6 flex-1 bg-linear-to-b from-transparent to-[var(--bg-elevated)]/10">
              {analyzing ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4 text-center py-20">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-[var(--accent)]/20 border-t-[var(--accent)] rounded-full animate-spin" />
                    <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-[var(--accent)] animate-pulse" />
                  </div>
                  <p className="text-white font-medium">Claude tüm rakipleri inceliyor...</p>
                  <p className="text-[var(--text-muted)] text-sm max-w-xs">
                    Rakiplerin içerik stilleri ve Ali Cem için çıkarılacak dersler hazırlanıyor.
                  </p>
                </div>
              ) : latestAnalysis ? (
                <div className="relative group">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={copyAnalysis}
                    className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--bg-card)] border border-[var(--border)]"
                  >
                    <Copy className="w-3 h-3 text-[var(--text-secondary)]" />
                  </Button>
                  <div className="prose prose-invert max-w-none">
                    <pre className="font-sans whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-primary)]">
                      {latestAnalysis.analysis_text}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-20 space-y-4">
                  <Layout className="w-12 h-12 text-[var(--bg-elevated)]" />
                  <p className="text-[var(--text-muted)] text-sm max-w-xs">
                    Henüz bir analiz raporu oluşturulmadı. Başlamak için yukarıdaki butona tıklayın.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
