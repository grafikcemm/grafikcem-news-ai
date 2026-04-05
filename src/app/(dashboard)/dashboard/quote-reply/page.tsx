"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";


interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  viral_score: number;
  sources?: { name: string };
  published_at?: string;
}

const FORMATS = [
  { id: "Quote Tweet", label: "Quote Tweet", desc: "Kısa, tartışma açan (max 280 kr)", icon: "💬" },
  { id: "LinkedIn Yorum", label: "LinkedIn Yorum", desc: "Profesyonel, değer katan (max 400 kr)", icon: "👔" },
  { id: "Thread Başlangıcı", label: "Thread Başlangıcı", desc: "Dizi başlatan merak kancası", icon: "🧵" },
];

export default function QuoteReplyPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string>(FORMATS[0].id);
  const [generating, setGenerating] = useState(false);
  
  const [result, setResult] = useState<{
    content: string;
    hook_strength: string | number;
    reason: string;
  } | null>(null);

  useEffect(() => {
    loadNews();
  }, []);

  async function loadNews() {
    setLoadingNews(true);
    try {
      const { data } = await supabase
        .from("news_items")
        .select("id, title, summary, url, viral_score, published_at, sources(name)")
        .order("published_at", { ascending: false })
        .limit(20);

      if (data) {
        setNews(data as unknown as NewsItem[]);
      }
    } catch (error) {
      console.error("Failed to fetch news", error);
      toast.error("Haberler yüklenemedi");
    } finally {
      setLoadingNews(false);
    }
  }

  const selectedNews = news.find(n => n.id === selectedNewsId);

  async function handleGenerate() {
    if (!selectedNewsId) return;
    setGenerating(true);
    setResult(null);

    try {
      const res = await fetch("/api/news/quote-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ news_id: selectedNewsId, format: selectedFormat }),
      });

      const data = await res.json();
      if (res.ok) {
        setResult(data);
        toast.success("İçerik başarıyla üretildi!");
      } else {
        toast.error(data.error || "Üretim başarısız");
      }
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setGenerating(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Kopyalandı!");
  }

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Quote & Reply</h1>
        <p className="text-slate-500 text-sm mt-1">Haber seçerek hızlıca etkileşim odaklı alıntı, yorum veya thread girişi oluştur</p>
      </div>
      
      <div className="grid lg:grid-cols-12 gap-6">
        
        {/* Left Column: News Pool Picker */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="h-[calc(100vh-180px)] flex flex-col border-slate-200">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
              <CardTitle className="text-lg">Haber Havuzu</CardTitle>
              <CardDescription>Üzerinde içerik üreteceğin haberi seç</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
              {loadingNews ? (
                <div className="p-4 space-y-4">
                  <Skeleton className="h-24 w-full rounded-xl" />
                  <Skeleton className="h-24 w-full rounded-xl" />
                  <Skeleton className="h-24 w-full rounded-xl" />
                </div>
              ) : news.length === 0 ? (
                <div className="p-8 text-center text-slate-500">Haber bulunamadı.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {news.map(item => (
                    <div 
                      key={item.id} 
                      onClick={() => setSelectedNewsId(item.id)}
                      className={`p-4 cursor-pointer transition-colors hover:bg-slate-50 ${
                        selectedNewsId === item.id ? "bg-indigo-50/50 border-l-2 border-indigo-500" : ""
                      }`}
                    >
                      <div className="flex gap-2 items-start justify-between mb-1.5">
                        <Badge variant="outline" className="text-[10px] bg-white">
                          {item.sources?.name || 'Bilinmiyor'}
                        </Badge>
                        <Badge className={`text-[10px] ${item.viral_score >= 70 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          Viral: {item.viral_score || 0}
                        </Badge>
                      </div>
                      <h3 className={`text-sm font-medium leading-snug line-clamp-2 ${selectedNewsId === item.id ? 'text-indigo-900' : 'text-slate-800'}`}>
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                        {item.summary}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Format Picker & Generator */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-slate-200">
            <CardContent className="p-6 space-y-6">
              
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-900">1. Format Seçici</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {FORMATS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFormat(f.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selectedFormat === f.id
                          ? "border-indigo-500 bg-indigo-50/50 text-indigo-700 shadow-sm"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="text-xl mb-1">{f.icon}</div>
                      <div className="text-sm font-semibold">{f.label}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">{f.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-900">2. Seçilen Haber</label>
                {selectedNews ? (
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                    <h4 className="font-medium text-slate-800 text-sm mb-1">{selectedNews.title}</h4>
                    <a href={selectedNews.url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">
                      Kaynağa Git ↗
                    </a>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-dashed border-slate-200 rounded-lg p-4 text-center text-slate-500 text-sm">
                    Lütfen yandaki listeden bir haber seçin
                  </div>
                )}
              </div>

              <Button 
                onClick={handleGenerate} 
                disabled={generating || !selectedNewsId}
                className="w-full h-12 bg-linear-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-medium shadow-md"
              >
                {generating ? "AI İçerik Üretiyor..." : "AI ile İçerik Üret"}
              </Button>

            </CardContent>
          </Card>

          {/* Result Area */}
          {result && (
            <Card className="border-0 ring-1 ring-slate-200 shadow-xl shadow-slate-200/20 bg-white overflow-hidden">
              <div className="bg-linear-to-r from-indigo-50 to-blue-50 px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-indigo-900">Üretilen İçerik</span>
                  <Badge variant="outline" className="bg-white text-indigo-700 border-indigo-200">
                    Kanca Gücü: {result.hook_strength}/10
                  </Badge>
                </div>
              </div>
              <CardContent className="p-5">
                <div className="text-[10px] text-slate-400 mb-4 uppercase tracking-wider font-medium">
                  ANALİZ: {result.reason}
                </div>
                
                <p className="text-slate-800 text-base leading-relaxed whitespace-pre-wrap">
                  {result.content}
                </p>

                <div className="flex items-center gap-3 mt-8 pt-4 border-t border-slate-100">
                  <Button onClick={() => copyToClipboard(result.content)} variant="outline" className="flex-1">
                    Panoya Kopyala
                  </Button>
                  {selectedFormat === "LinkedIn Yorum" ? (
                    <Button 
                      onClick={() => window.open(`https://www.linkedin.com/feed/`, "_blank")} 
                      className="flex-1 bg-[#0A66C2] hover:bg-[#004182] text-white"
                    >
                      LinkedIn&apos;i Aç
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(result.content)}`, "_blank")} 
                      className="flex-1 bg-slate-900 hover:bg-slate-800 text-white"
                    >
                      X&apos;te Paylaş
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
