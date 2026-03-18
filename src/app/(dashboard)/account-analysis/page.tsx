"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface AccountAnalysis {
  posting_frequency: string;
  best_performing_topics: string[];
  worst_performing_topics: string[];
  optimal_posting_times: string[];
  content_formats_used: string[];
  best_format: string;
  engagement_rate: string;
  growth_tactics: string[];
  weaknesses: string[];
  steal_these: string[];
  avoid_these: string[];
  summary: string;
}

interface AnalysisResult {
  analysis: AccountAnalysis;
  username: string;
  tweets_analyzed: number;
}

export default function AccountAnalysisPage() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  async function handleAnalyze(handle?: string) {
    const target = handle || username;
    if (!target.trim()) return;

    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/analysis/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: target.replace("@", "") }),
      });
      const data = await res.json();
      if (res.ok && data.analysis) {
        setResult(data as AnalysisResult);
        toast.success(`@${data.username} analiz edildi!`);
      } else {
        toast.error(data.error || "Analiz başarısız");
      }
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  const analysis = result?.analysis;

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Hesap Analizi</h1>
        <p className="text-slate-500 text-sm mt-1">
          Herhangi bir X hesabını analiz et — en iyi taktikleri kopyala
        </p>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-5">
          <div className="flex gap-3">
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="@kullanici_adi"
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              className="flex-1"
            />
            <Button
              onClick={() => handleAnalyze()}
              disabled={loading || !username.trim()}
              className="bg-linear-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 text-white"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" className="opacity-25" />
                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
                  </svg>
                  Analiz Ediliyor...
                </span>
              ) : (
                "Analiz Et"
              )}
            </Button>
          </div>

          {/* Quick buttons */}
          <div className="flex gap-2 mt-3 flex-wrap">
            <p className="text-xs text-slate-400 self-center">Hızlı:</p>
            {["grafikcem", "altudev", "egebese", "erhanmeydan"].map((h) => (
              <button
                key={h}
                onClick={() => { setUsername(h); handleAnalyze(h); }}
                className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-600 transition-colors"
              >
                @{h}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="grid md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      )}

      {analysis && result && (
        <>
          {/* Summary hero */}
          <Card className="border-0 shadow-sm bg-linear-to-r from-slate-900 to-slate-800 text-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-medium text-blue-300 uppercase tracking-wider">
                  @{result.username} — {result.tweets_analyzed} tweet analiz edildi
                </span>
              </div>
              <p className="text-white leading-relaxed">{analysis.summary}</p>
              <div className="flex gap-4 mt-4 flex-wrap">
                <div>
                  <p className="text-slate-400 text-xs">Paylaşım Sıklığı</p>
                  <p className="text-white text-sm font-medium">{analysis.posting_frequency}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Etkileşim Oranı</p>
                  <p className="text-white text-sm font-medium">{analysis.engagement_rate}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">En İyi Format</p>
                  <p className="text-white text-sm font-medium">{analysis.best_format}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Steal these & avoid */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm bg-white border-l-4 border-l-emerald-400">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-emerald-700">Bunları Kopyala</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {analysis.steal_these.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5 text-xs">✓</span>
                    <p className="text-sm text-slate-700">{item}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white border-l-4 border-l-red-400">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-red-600">Bunlardan Kaçın</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {analysis.avoid_these.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5 text-xs">✗</span>
                    <p className="text-sm text-slate-700">{item}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Growth tactics & weaknesses */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-900">Büyüme Taktikleri</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {analysis.growth_tactics.map((t, i) => (
                  <Badge key={i} variant="secondary" className="text-xs font-normal">{t}</Badge>
                ))}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-900">Zayıf Noktalar</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {analysis.weaknesses.map((w, i) => (
                  <Badge key={i} variant="outline" className="text-xs font-normal text-slate-500">{w}</Badge>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Best/worst topics & optimal times */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-900">İyi Konular</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1.5">
                {analysis.best_performing_topics.map((t, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <p className="text-sm text-slate-700">{t}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-900">Kötü Konular</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1.5">
                {analysis.worst_performing_topics.map((t, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                    <p className="text-sm text-slate-700">{t}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-900">Optimal Saatler</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {analysis.optimal_posting_times.map((t, i) => (
                  <Badge key={i} className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-100">{t}</Badge>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
