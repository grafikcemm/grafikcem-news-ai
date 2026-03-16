"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  category: string;
  viral_score: number;
  viral_reason: string;
  sources?: { name: string };
}

interface TweetDraft {
  id: string;
  content: string;
  tweet_type: string;
  thread_tweets: string[] | null;
  ai_score: number;
  status: string;
  score_reason?: string;
}

export default function TweetGeneratorPage() {
  return (
    <Suspense fallback={<div className="p-8"><Skeleton className="h-96 w-full" /></div>}>
      <TweetGeneratorContent />
    </Suspense>
  );
}

function TweetGeneratorContent() {
  const searchParams = useSearchParams();
  const newsIdParam = searchParams.get("news_id");

  const [newsItem, setNewsItem] = useState<NewsItem | null>(null);
  const [drafts, setDrafts] = useState<TweetDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [newsId, setNewsId] = useState(newsIdParam || "");

  useEffect(() => {
    if (newsIdParam) {
      setNewsId(newsIdParam);
      loadNewsAndDrafts(newsIdParam);
    }
  }, [newsIdParam]);

  async function loadNewsAndDrafts(id: string) {
    setLoading(true);
    try {
      // Load news item
      const { data: news } = await supabase
        .from("news_items")
        .select("*, sources(name)")
        .eq("id", id)
        .single();

      if (news) setNewsItem(news as NewsItem);

      // Load existing drafts
      const { data: existingDrafts } = await supabase
        .from("tweet_drafts")
        .select("*")
        .eq("news_id", id)
        .eq("status", "pending")
        .order("ai_score", { ascending: false });

      if (existingDrafts) setDrafts(existingDrafts as TweetDraft[]);
    } catch (err) {
      console.error("Load error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    if (!newsId) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/tweet/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ news_id: newsId }),
      });
      const data = await res.json();
      if (res.ok && data.options) {
        setDrafts(data.options);
        toast.success("3 tweet seçeneği üretildi!");
        // Also load the news item if not loaded
        if (!newsItem) await loadNewsAndDrafts(newsId);
      } else {
        toast.error(data.error || "Tweet üretimi başarısız");
      }
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setGenerating(false);
    }
  }

  async function handleApprove(draftId: string) {
    try {
      await supabase
        .from("tweet_drafts")
        .update({ status: "approved" })
        .eq("id", draftId);
      setDrafts((prev) =>
        prev.map((d) => (d.id === draftId ? { ...d, status: "approved" } : d))
      );
      toast.success("Taslak onaylandı!");
    } catch {
      toast.error("Onaylama başarısız");
    }
  }

  async function handleReject(draftId: string) {
    try {
      await supabase
        .from("tweet_drafts")
        .update({ status: "rejected" })
        .eq("id", draftId);
      setDrafts((prev) =>
        prev.map((d) => (d.id === draftId ? { ...d, status: "rejected" } : d))
      );
      toast.info("Taslak reddedildi");
    } catch {
      toast.error("İşlem başarısız");
    }
  }

  async function handlePublish(draftId: string) {
    setPublishingId(draftId);
    try {
      const res = await fetch("/api/tweet/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft_id: draftId }),
      });
      const data = await res.json();
      if (res.ok) {
        setDrafts((prev) =>
          prev.map((d) => (d.id === draftId ? { ...d, status: "published" } : d))
        );
        toast.success("Tweet X'te yayınlandı! 🎉");
      } else {
        toast.error(data.error || "Yayınlama başarısız");
      }
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setPublishingId(null);
    }
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tweet Üretici</h1>
        <p className="text-slate-500 text-sm mt-1">
          AI ile tweet seçenekleri üret, onayla ve yayınla
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left panel — News detail */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-0 shadow-sm bg-white sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-900">
                Haber Detayı
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : newsItem ? (
                <>
                  <h3 className="font-semibold text-slate-900">{newsItem.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{newsItem.summary}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {newsItem.sources?.name}
                    </Badge>
                    <Badge
                      className={`text-xs ${
                        newsItem.viral_score >= 80
                          ? "bg-emerald-100 text-emerald-700"
                          : newsItem.viral_score >= 60
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      Viral: {newsItem.viral_score}
                    </Badge>
                  </div>
                  {newsItem.viral_reason && (
                    <p className="text-xs text-violet-500 italic">{newsItem.viral_reason}</p>
                  )}
                  <a
                    href={newsItem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline inline-flex items-center gap-1"
                  >
                    Kaynağı aç ↗
                  </a>
                </>
              ) : (
                <div className="text-center py-8 text-slate-400 text-sm">
                  <p>Tweet üretmek için bir haber seçin</p>
                  <p className="mt-2 text-xs">Haber Havuzu'ndan bir haber seçip "Tweet Üret" butonuna tıklayın</p>
                </div>
              )}

              <Separator />

              <Button
                onClick={handleGenerate}
                disabled={generating || !newsId}
                className="w-full bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 text-white h-11"
              >
                {generating ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" className="opacity-25" />
                      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
                    </svg>
                    AI Üretiyor...
                  </span>
                ) : (
                  "🚀 Tweet Seçenekleri Üret"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right panel — Tweet options */}
        <div className="lg:col-span-3 space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-48 w-full rounded-xl" />
              ))}
            </div>
          ) : drafts.length === 0 ? (
            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-12 text-center text-slate-400">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300"><path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/></svg>
                </div>
                <p className="font-medium text-slate-500">Henüz tweet seçeneği yok</p>
                <p className="text-xs text-slate-400 mt-1">Bir haber seçip "Tweet Seçenekleri Üret" butonuna tıklayın</p>
              </CardContent>
            </Card>
          ) : (
            drafts.map((draft, i) => (
              <Card
                key={draft.id}
                className={`border-0 shadow-sm bg-white ${
                  draft.status === "published"
                    ? "ring-2 ring-emerald-500/30"
                    : draft.status === "approved"
                    ? "ring-2 ring-blue-500/30"
                    : draft.status === "rejected"
                    ? "opacity-50"
                    : ""
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">Seçenek {i + 1}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          draft.tweet_type === "thread"
                            ? "border-violet-300 text-violet-600"
                            : "border-blue-300 text-blue-600"
                        }`}
                      >
                        {draft.tweet_type === "thread" ? "Thread" : "Single"}
                      </Badge>
                      {draft.status !== "pending" && (
                        <Badge
                          className={`text-[10px] ${
                            draft.status === "published"
                              ? "bg-emerald-100 text-emerald-700"
                              : draft.status === "approved"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-red-100 text-red-600"
                          }`}
                        >
                          {draft.status === "published"
                            ? "Yayınlandı"
                            : draft.status === "approved"
                            ? "Onaylandı"
                            : "Reddedildi"}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">
                        {draft.content.length} karakter
                      </span>
                      <span className="text-xs font-bold text-violet-500">
                        AI: {draft.ai_score}
                      </span>
                    </div>
                  </div>

                  {/* Tweet content */}
                  <div className="bg-slate-50 rounded-xl p-4 mb-4">
                    <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {draft.content}
                    </p>
                    {draft.tweet_type === "thread" &&
                      draft.thread_tweets &&
                      Array.isArray(draft.thread_tweets) && (
                        <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
                          {draft.thread_tweets.map((tweet, j) => (
                            <div key={j} className="flex gap-2">
                              <span className="text-xs text-slate-400 shrink-0 mt-0.5">
                                {j + 1}.
                              </span>
                              <p className="text-sm text-slate-700">{tweet}</p>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>

                  {/* Actions */}
                  {draft.status === "pending" && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(draft.id)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white"
                      >
                        ✓ Onayla
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handlePublish(draft.id)}
                        disabled={publishingId === draft.id}
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        {publishingId === draft.id ? "Yayınlanıyor..." : "🚀 Şimdi Yayınla"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleReject(draft.id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        ✕ Reddet
                      </Button>
                    </div>
                  )}
                  {draft.status === "approved" && (
                    <Button
                      size="sm"
                      onClick={() => handlePublish(draft.id)}
                      disabled={publishingId === draft.id}
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      {publishingId === draft.id ? "Yayınlanıyor..." : "🚀 Şimdi Yayınla"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
