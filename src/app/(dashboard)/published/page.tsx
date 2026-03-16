"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

interface PublishedTweet {
  id: string;
  x_post_id: string;
  published_at: string;
  impressions: number;
  draft: {
    content: string;
    tweet_type: string;
    news: {
      title: string;
      sources: { name: string } | null;
    } | null;
  } | null;
}

export default function PublishedPage() {
  const [tweets, setTweets] = useState<PublishedTweet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublished();
  }, []);

  async function fetchPublished() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("published_tweets")
        .select(`
          id, x_post_id, published_at, impressions,
          draft:tweet_drafts (
            content, tweet_type,
            news:news_items (
              title,
              sources (name)
            )
          )
        `)
        .order("published_at", { ascending: false })
        .limit(50);

      if (!error && data) {
        // Supabase typing workaround
        setTweets(data as unknown as PublishedTweet[]);
      }
    } catch (err) {
      console.error("Published fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Yayınlananlar</h1>
        <p className="text-slate-500 text-sm mt-1">
          X hesabınızda yayınlanan tüm tweetlerin geçmişi
        </p>
      </div>

      <div className="space-y-4 max-w-3xl">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))
        ) : tweets.length === 0 ? (
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-12 text-center text-slate-400">
              Henüz yayınlanmış tweet yok
            </CardContent>
          </Card>
        ) : (
          <div className="relative border-l-2 border-slate-200 ml-4 space-y-8 pb-8">
            {tweets.map((item) => (
              <div key={item.id} className="relative pl-6">
                {/* Timeline dot */}
                <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-emerald-500 ring-4 ring-white" />
                
                <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">
                            {item.draft?.tweet_type === "thread" ? "Thread" : "Single"}
                          </span>
                          <span className="text-xs text-slate-400">
                            {formatDistanceToNow(new Date(item.published_at), { addSuffix: true, locale: tr })}
                          </span>
                        </div>
                        {item.draft?.news?.title && (
                          <p className="text-sm font-medium text-slate-900 mt-2 line-clamp-1">
                            Haber: {item.draft.news.title}
                          </p>
                        )}
                        {item.draft?.news?.sources?.name && (
                          <p className="text-xs text-slate-500">
                            Kaynak: {item.draft.news.sources.name}
                          </p>
                        )}
                      </div>
                      <a
                        href={`https://x.com/grafikcem/status/${item.x_post_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex flex-shrink-0 items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        X'te Gör
                      </a>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                      <p className="text-sm text-slate-700 whitespace-pre-wrap line-clamp-3">
                        {item.draft?.content}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
