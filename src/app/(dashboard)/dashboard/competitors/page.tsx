"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Users, Layout, TrendingUp, Copy, RefreshCw } from "lucide-react";
import { StatusChip } from "@/components/ui/status-chip";

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
  const [competitors, setCompetitors] = useState<Competitor[]>();
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
    else setCompetitors([]);
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
    <div className="p-4 lg:p-8 space-y-8 max-w-7xl mx-auto min-h-screen bg-[var(--surface-base)]">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Users className="w-6 h-6 text-[var(--accent)]" />
            Rakip Takibi
          </h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">Sektördeki rakiplerini Claude ile derinlemesine analiz et.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={fetchData} 
            variant="outline" 
            size="sm"
            className="bg-[var(--surface-overlay)] border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] gap-2 rounded-[var(--radius-md)]"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
          <Button 
            onClick={handleRunAnalysis} 
            disabled={analyzing || !competitors || competitors.length === 0}
            className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white gap-2 shadow-lg shadow-[var(--accent)]/20 rounded-[var(--radius-md)]"
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
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full rounded-[var(--radius-lg)] bg-[var(--surface-raised)]" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {competitors?.map(c => (
                <div key={c.id} className="p-4 rounded-[var(--radius-lg)] bg-[var(--surface-raised)] border-b border-[var(--border-subtle)] group hover:bg-[var(--surface-overlay)] transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="font-[600] text-[var(--text-primary)] text-sm">@{c.handle}</p>
                      <Badge variant="outline" className="text-[10px] py-0 border-[var(--border-subtle)] text-[var(--text-secondary)]">{c.category}</Badge>
                    </div>
                    {c.trend === 'yukseliyor' ? (
                      <StatusChip status="done" label="Yükseliyor" className="px-2" />
                    ) : (
                      <StatusChip status="draft" label="Stabil" className="px-2" />
                    )}
                  </div>
                  <div className="mt-3 text-xs text-[var(--text-primary)] tabular-nums flex items-center justify-between">
                     <span className="text-[var(--text-tertiary)] text-xs">Takipçi:</span>
                     {c.follower_count ? c.follower_count.toLocaleString('tr-TR') : '-'}
                  </div>
                </div>
              ))}
              {competitors?.length === 0 && (
                <p className="text-[var(--text-secondary)] text-sm italic text-center py-8">Henüz rakip eklenmemiş.</p>
              )}
            </div>
          )}
        </div>

        {/* Analysis Section */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider px-1">Stratejik AI Analizi</h2>
          
          <Card className="bg-[var(--surface-raised)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] overflow-hidden min-h-[400px] flex flex-col">
            <CardHeader className="border-b border-[var(--border-subtle)] bg-[var(--surface-overlay)]/30">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm text-[var(--text-primary)] font-medium">Ali Cem için Dersler & Fırsatlar</CardTitle>
                {latestAnalysis && (
                  <span className="text-[10px] text-[var(--text-tertiary)] italic">
                    Son güncelleme: {new Date(latestAnalysis.created_at).toLocaleString('tr-TR')}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6 flex-1 bg-gradient-to-b from-transparent to-[var(--surface-overlay)]/10">
              {analyzing ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4 text-center py-20">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-[var(--accent)]/20 border-t-[var(--accent)] rounded-full animate-spin" />
                    <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-[var(--accent)] animate-pulse" />
                  </div>
                  <p className="text-[var(--text-primary)] font-medium">Claude tüm rakipleri inceliyor...</p>
                  <p className="text-[var(--text-secondary)] text-sm max-w-xs">
                    Rakiplerin içerik stilleri ve Ali Cem için çıkarılacak dersler hazırlanıyor.
                  </p>
                </div>
              ) : latestAnalysis ? (
                <div className="relative group">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={copyAnalysis}
                    className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--surface-overlay)] border border-[var(--border-default)] rounded-[var(--radius-md)]"
                  >
                    <Copy className="w-3 h-3 text-[var(--text-primary)]" />
                  </Button>
                  <div className="prose prose-invert max-w-none">
                    <pre className="font-sans whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-primary)]">
                      {latestAnalysis.analysis_text}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-20 space-y-4">
                  <Layout className="w-12 h-12 text-[var(--text-tertiary)]" />
                  <p className="text-[var(--text-secondary)] text-sm max-w-xs">
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
