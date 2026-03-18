"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface ViralTweet {
  id: string;
  x_tweet_id: string;
  content: string;
  author_handle: string;
  author_name: string;
  likes: number;
  retweets: number;
  fetched_at: string;
}

type Tab = "quote" | "reply";

export default function QuoteSuggestionsPage() {
  const [tweets, setTweets] = useState<ViralTweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [tab, setTab] = useState<Tab>("quote");
  const [generated, setGenerated] = useState<Record<string, { quote?: string; reply?: string }>>({});
  const [generating, setGenerating] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadCached();
  }, []);

  async function loadCached() {
    setLoading(true);
    try {
      const res = await fetch("/api/quotes/fetch-viral");
      const data = await res.json();
      if (data.tweets) setTweets(data.tweets);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleFetchViral() {
    setFetching(true);
    try {
      const res = await fetch("/api/quotes/fetch-viral", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.tweets) {
        setTweets(data.tweets);
        toast.success(`${data.fetched || data.tweets.length} viral tweet çekildi!`);
      } else {
        toast.error(data.error || "Tweet çekme başarısız");
      }
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setFetching(false);
    }
  }

  async function handleGenerate(tweet: ViralTweet, type: Tab) {
    setGenerating((prev) => ({ ...prev, [tweet.id]: true }));
    try {
      const endpoint = type === "quote" ? "/api/quotes/generate" : "/api/replies/generate";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viral_tweet_id: tweet.id }),
      });
      const data = await res.json();
      if (res.ok) {
        const text = type === "quote" ? data.quote : data.reply;
        setGenerated((prev) => ({
          ...prev,
          [tweet.id]: { ...prev[tweet.id], [type]: text },
        }));
        toast.success(`${type === "quote" ? "Quote" : "Reply"} üretildi!`);
      } else {
        toast.error(data.error || "Üretim başarısız");
      }
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setGenerating((prev) => ({ ...prev, [tweet.id]: false }));
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Kopyalandı!");
  }

  function openOnX(text: string) {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quote & Reply</h1>
          <p className="text-slate-500 text-sm mt-1">
            Viral tweetlere quote veya reply üret, görünürlüğünü artır
          </p>
        </div>
        <Button
          onClick={handleFetchViral}
          disabled={fetching}
          className="bg-linear-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 text-white"
        >
          {fetching ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" className="opacity-25" />
                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
              </svg>
              Çekiliyor...
            </span>
          ) : (
            "Viral Tweetleri Çek"
          )}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
        {(["quote", "reply"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              tab === t
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "quote" ? "Quote Tweet" : "Reply"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : tweets.length === 0 ? (
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <p className="font-medium text-slate-600">Henüz viral tweet yok</p>
            <p className="text-slate-400 text-sm mt-1">"Viral Tweetleri Çek" butonuna tıkla</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tweets.map((tweet) => {
            const genText = tab === "quote" ? generated[tweet.id]?.quote : generated[tweet.id]?.reply;
            const isGenerating = generating[tweet.id];

            return (
              <Card key={tweet.id} className="border-0 shadow-sm bg-white">
                <CardContent className="p-5 space-y-4">
                  {/* Original tweet */}
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-linear-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {tweet.author_name?.[0] || "X"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-900 text-sm">@{tweet.author_handle}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {tweet.likes.toLocaleString()} like
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {tweet.retweets.toLocaleString()} RT
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">{tweet.content}</p>
                    </div>
                  </div>

                  {/* Generated content */}
                  {genText && (
                    <div className="bg-indigo-50 rounded-xl p-4 space-y-3">
                      <p className="text-xs font-medium text-indigo-500 uppercase tracking-wider">
                        {tab === "quote" ? "Quote Tweet" : "Reply"} — {genText.length} karakter
                        {genText.length > 280 && (
                          <span className="text-red-500 ml-2">⚠ 280 karakter limiti aşıldı</span>
                        )}
                      </p>
                      <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{genText}</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => copyToClipboard(genText)} className="text-xs">
                          Kopyala
                        </Button>
                        <Button size="sm" onClick={() => openOnX(genText)} className="text-xs bg-slate-900 hover:bg-slate-800 text-white">
                          X&apos;te Paylaş
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleGenerate(tweet, "quote")}
                      disabled={isGenerating}
                      className="bg-linear-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 text-white text-xs"
                    >
                      {isGenerating && tab === "quote" ? "Üretiliyor..." : generated[tweet.id]?.quote ? "Quote Yenile" : "Quote Üret"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleGenerate(tweet, "reply")}
                      disabled={isGenerating}
                      className="text-xs"
                    >
                      {isGenerating && tab === "reply" ? "Üretiliyor..." : generated[tweet.id]?.reply ? "Reply Yenile" : "Reply Üret"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
