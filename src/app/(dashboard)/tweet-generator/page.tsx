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
  pattern_used?: string | null;
}

const FORMATS = [
  { id: "mikro", label: "Mikro", desc: "Max 100 karakter", icon: "⚡" },
  { id: "standard", label: "Standard", desc: "240-270 karakter", icon: "💬" },
  { id: "hook", label: "Hook", desc: "FOMO / Provokasyon", icon: "🎣" },
  { id: "liste", label: "Liste", desc: "Numaralı format", icon: "📋" },
  { id: "thread_mini", label: "Thread Mini", desc: "3 tweet", icon: "🧵" },
  { id: "thread_orta", label: "Thread Orta", desc: "5 tweet", icon: "🧵🧵" },
  { id: "thread_uzun", label: "Thread Uzun", desc: "10 tweet", icon: "📖" },
  { id: "thunder", label: "Thunder ⚡", desc: "MAX VİRAL", icon: "🔥" },
];

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
  const [newsId, setNewsId] = useState(newsIdParam || "");
  const [selectedFormat, setSelectedFormat] = useState<string>("standard");
  const [abMode, setAbMode] = useState(false);
  const [tone, setTone] = useState<string>("");
  const [language, setLanguage] = useState<string>("tr");
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    if (newsIdParam) {
      setNewsId(newsIdParam);
      loadNewsAndDrafts(newsIdParam);
    }
  }, [newsIdParam]);

  async function loadNewsAndDrafts(id: string) {
    setLoading(true);
    try {
      const { data: news } = await supabase
        .from("news_items")
        .select("*, sources(name)")
        .eq("id", id)
        .single();

      if (news) setNewsItem(news as NewsItem);

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
        body: JSON.stringify({ news_id: newsId, format: selectedFormat, abMode, tone, language }),
      });
      const data = await res.json();
      if (res.ok && data.options) {
        setDrafts(data.options);
        const fmt = FORMATS.find((f) => f.id === selectedFormat);
        toast.success(`${fmt?.label || "Tweet"} formatında üretildi!`);
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
      await supabase.from("tweet_drafts").update({ status: "approved" }).eq("id", draftId);
      setDrafts((prev) => prev.map((d) => (d.id === draftId ? { ...d, status: "approved" } : d)));
      toast.success("Taslak onaylandı!");
    } catch {
      toast.error("Onaylama başarısız");
    }
  }

  async function handleReject(draftId: string) {
    try {
      await supabase.from("tweet_drafts").update({ status: "rejected" }).eq("id", draftId);
      setDrafts((prev) => prev.map((d) => (d.id === draftId ? { ...d, status: "rejected" } : d)));
      toast.info("Taslak reddedildi");
    } catch {
      toast.error("İşlem başarısız");
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Kopyalandı!");
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Tweet Üretici</h1>
        <p className="text-[var(--text-tertiary)] text-sm mt-1">
          12 viral pattern + 8 format — AI ile tweet seçenekleri üret
        </p>
      </div>

      {/* Format Selector */}
      <div>
        <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">Format Seç</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {FORMATS.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedFormat(f.id)}
              className={`p-2 rounded-lg border text-left transition-all ${
                selectedFormat === f.id
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                  : "border-[var(--border-subtle)] hover:border-[var(--border-default)] bg-[var(--surface-card)]"
              }`}
            >
              <div className="text-lg">{f.icon}</div>
              <div className="text-xs font-medium">{f.label}</div>
              <div className="text-[10px] text-[var(--text-tertiary)] leading-tight mt-0.5">{f.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left panel — News detail */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-0 shadow-sm bg-[var(--surface-card)] sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[var(--text-primary)]">Haber Detayı</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : newsItem ? (
                <>
                  <h3 className="font-semibold text-[var(--text-primary)]">{newsItem.title}</h3>
                  <p className="text-sm text-[var(--text-tertiary)] leading-relaxed">{newsItem.summary}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {newsItem.sources?.name}
                    </Badge>
                    <Badge
                      className={`text-xs ${
                        newsItem.viral_score >= 80
                          ? "bg-[var(--success-subtle)] text-[var(--success)]"
                          : newsItem.viral_score >= 60
                          ? "bg-amber-100 text-amber-700"
                          : "bg-[var(--surface-elevated)] text-[var(--text-tertiary)]"
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
                <div className="text-center py-8 text-[var(--text-tertiary)] text-sm">
                  <p>Tweet üretmek için bir haber seçin</p>
                  <p className="mt-2 text-xs">Haber Havuzu&apos;ndan bir haber seçip &quot;Tweet Üret&quot; butonuna tıklayın</p>
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowOptions(!showOptions)}
                  className="text-xs font-semibold text-blue-500 flex items-center gap-1"
                >
                  {showOptions ? "Gelişmiş Seçenekleri Gizle" : "Gelişmiş Seçenekler"}
                </button>
              </div>

              {showOptions && (
                <div className="space-y-4 p-4 bg-[var(--surface-elevated)] rounded-lg border border-[var(--border-subtle)]">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--text-primary)]">A/B Testi Üret</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={abMode} onChange={() => setAbMode(!abMode)} className="sr-only peer" />
                      <div className="w-9 h-5 bg-[var(--surface-elevated)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--surface-card)] after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-[var(--text-primary)]">Dil Seçimi</span>
                    <div className="flex gap-2">
                      {["tr", "en", "bilingual"].map((l) => (
                        <button
                          key={l}
                          onClick={() => setLanguage(l)}
                          className={`flex-1 py-1 rounded text-xs font-medium border ${
                            language === l ? "bg-[var(--surface-raised)] text-white" : "text-[var(--text-secondary)] bg-[var(--surface-card)] hover:bg-[var(--surface-elevated)]"
                          }`}
                        >
                          {l.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-[var(--text-primary)]">Ton / Tarz</span>
                    <select
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      className="w-full text-sm rounded-md border-[var(--border-subtle)] p-2 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Otomatik (Haber türüne göre)</option>
                      <option value="Ciddi ve Analitik">Ciddi ve Analitik</option>
                      <option value="Eğlenceli ve Heyecanlı">Eğlenceli ve Heyecanlı</option>
                      <option value="Hikayesel (Storytelling)">Hikayesel</option>
                      <option value="Provokatif / Tartışma Çıkarıcı">Provokatif / Tartışma</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-indigo-600 bg-indigo-50 rounded-lg p-2">
                <span>{FORMATS.find((f) => f.id === selectedFormat)?.icon}</span>
                <span>Format: <strong>{FORMATS.find((f) => f.id === selectedFormat)?.label}</strong></span>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={handleGenerate}
                  disabled={generating || !newsId}
                  className={`w-full h-11 text-white ${
                    !newsId
                      ? "bg-[var(--surface-overlay)] cursor-not-allowed opacity-100 hover:bg-[var(--surface-overlay)]"
                      : "bg-linear-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600"
                  }`}
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
                    `${FORMATS.find((f) => f.id === selectedFormat)?.label || "Tweet"} Üret`
                  )}
                </Button>
                {!newsId && (
                  <p className="text-xs text-center text-red-500 font-medium">
                    Lütfen Haber Havuzu&apos;ndan bir haber seçin
                  </p>
                )}
              </div>
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
            <Card className="border-0 shadow-sm bg-[var(--surface-card)]">
              <CardContent className="p-12 text-center text-[var(--text-tertiary)]">
                <div className="w-16 h-16 rounded-2xl bg-[var(--surface-elevated)] flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-secondary)]"><path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/></svg>
                </div>
                <p className="font-medium text-[var(--text-tertiary)]">Henüz tweet seçeneği yok</p>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">Bir haber seçip format belirleyerek üret butonuna tıklayın</p>
              </CardContent>
            </Card>
          ) : (
            drafts.map((draft, i) => (
              <Card
                key={draft.id}
                className={`border-0 shadow-sm bg-[var(--surface-card)] ${
                  draft.status === "approved"
                    ? "ring-2 ring-blue-500/30"
                    : draft.status === "rejected"
                    ? "opacity-50"
                    : ""
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-[var(--text-tertiary)]">Seçenek {i + 1}</span>
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
                      {draft.pattern_used && (
                        <Badge className="text-[10px] bg-amber-100 text-amber-700 hover:bg-amber-100">
                          {draft.pattern_used}
                        </Badge>
                      )}
                      {draft.status !== "pending" && (
                        <Badge
                          className={`text-[10px] ${
                            draft.status === "approved"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-red-100 text-red-600"
                          }`}
                        >
                          {draft.status === "approved" ? "Onaylandı" : "Reddedildi"}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs ${
                          draft.content.length > 280 ? "text-red-500 font-semibold" : "text-[var(--text-tertiary)]"
                        }`}
                      >
                        {draft.content.length} kar
                        {draft.content.length > 280 && " ⚠"}
                      </span>
                      <span className="text-xs font-bold text-violet-500">AI: {draft.ai_score}</span>
                    </div>
                  </div>

                  {draft.score_reason && (
                    <p className="text-[10px] text-[var(--text-tertiary)] italic mb-2">{draft.score_reason}</p>
                  )}

                  {/* Tweet content */}
                  <div className="bg-[var(--surface-elevated)] rounded-xl p-4 mb-4 relative">
                    <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                      {draft.content}
                    </p>
                    {draft.tweet_type === "thread" &&
                      draft.thread_tweets &&
                      Array.isArray(draft.thread_tweets) && (
                        <div className="mt-3 space-y-2 border-t border-[var(--border-subtle)] pt-3">
                          {draft.thread_tweets.map((tweet, j) => (
                            <div key={j} className="flex gap-2">
                              <span className="text-xs text-[var(--text-tertiary)] shrink-0 mt-0.5">{j + 1}.</span>
                              <p className="text-sm text-[var(--text-primary)]">{tweet}</p>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                  
                  {/* Hashtag Suggestions Extract Option */}
                  {draft.content.includes("#") && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {Array.from(new Set(draft.content.match(/#[\wçğıöşüÇĞİÖŞÜ]+/g) || [])).map(tag => (
                        <span key={tag} className="text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full cursor-pointer hover:bg-blue-100">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {draft.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(draft.id)}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white"
                        >
                          ✓ Onayla
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleReject(draft.id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          ✕ Reddet
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(draft.content)}
                      className="text-xs ml-auto"
                    >
                      Kopyala
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        window.open(
                          `https://twitter.com/intent/tweet?text=${encodeURIComponent(draft.content)}`,
                          "_blank"
                        )
                      }
                      className="text-xs bg-[var(--surface-raised)] hover:bg-[var(--surface-elevated)] text-white"
                    >
                      X&apos;te Paylaş
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
