"use client";

import { ChangeEvent, Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Copy,
  Globe,
  LoaderCircle,
  RefreshCw,
  Save,
  Sparkles,
  Search,
  MessageSquare,
  Hash,
  ChevronDown,
  ChevronUp,
  Zap,
  Clock,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ACCOUNT_CONFIGS,
  CHARACTER_OPTIONS,
  FORMAT_CONFIGS,
  KNOWLEDGE_OPTIONS,
  LANGUAGE_OPTIONS,
  MODE_OPTIONS,
  ThreadTweet,
  TONE_OPTIONS,
  TweetAccount,
  TweetCharacter,
  TweetFormat,
  TweetKnowledge,
  TweetLanguage,
  TweetMode,
  TweetTone,
} from "@/lib/tweet-engine";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

interface NewsItem {
  id: string;
  title: string;
  title_tr: string | null;
  summary_tr: string | null;
  viral_score: number;
  fetched_at: string;
}

const TOPIC_LIMIT = 1000;

function formatThreadBlock(thread: ThreadTweet[]) {
  return thread.map((item) => `${item.step}/ ${item.text}`).join("\n\n");
}

function TweetGeneratorScreen() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const newsIdParam = searchParams.get("news_id");

  // State: News Pool (Left)
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsSearch, setNewsSearch] = useState("");

  // State: Generator (Right)
  const [activeAccount, setActiveAccount] = useState<TweetAccount>("grafikcem");
  const [mode, setMode] = useState<TweetMode>("tweet");
  const [topic, setTopic] = useState("");
  const [selectedFormat, setSelectedFormat] = useState<TweetFormat>("spark");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [character, setCharacter] = useState<TweetCharacter>(ACCOUNT_CONFIGS.grafikcem.defaults.character);
  const [tone, setTone] = useState<TweetTone>(ACCOUNT_CONFIGS.grafikcem.defaults.tone);
  const [knowledge, setKnowledge] = useState<TweetKnowledge>(ACCOUNT_CONFIGS.grafikcem.defaults.knowledge);
  const [language, setLanguage] = useState<TweetLanguage>(ACCOUNT_CONFIGS.grafikcem.defaults.language);

  const [stage, setStage] = useState<"idle" | "searching" | "generating">("idle");
  const [webSearch, setWebSearch] = useState<any | null>(null);
  const [singleTweet, setSingleTweet] = useState("");
  const [threadTweets, setThreadTweets] = useState<ThreadTweet[]>([]);
  const [savingDraft, setSavingDraft] = useState(false);

  const isThread = selectedFormat === "thread";

  // Load News for Left Panel
  useEffect(() => {
    fetchNews();
  }, []);

  async function fetchNews() {
    setNewsLoading(true);
    const { data } = await supabase
      .from("news_items")
      .select("id, title, title_tr, summary_tr, viral_score, fetched_at")
      .gte("viral_score", 60)
      .order("fetched_at", { ascending: false })
      .limit(20);
    if (data) setNews(data);
    setNewsLoading(false);
  }

  // Load selected news into generator
  useEffect(() => {
    if (!newsIdParam) return;
    loadSelectedNews(newsIdParam);
  }, [newsIdParam]);

  async function loadSelectedNews(id: string) {
    const { data } = await supabase
      .from("news_items")
      .select("title, title_tr, summary_tr")
      .eq("id", id)
      .maybeSingle();

    if (data) {
      const text = [data.title_tr || data.title, data.summary_tr].filter(Boolean).join("\n\n");
      setTopic(text.slice(0, TOPIC_LIMIT));
    }
  }

  const handleTopicChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setTopic(event.target.value.slice(0, TOPIC_LIMIT));
  };

  async function handleGenerate() {
    if (!topic.trim()) {
      toast.error("Önce bir konu veya haber seç.");
      return;
    }

    setSingleTweet("");
    setThreadTweets([]);
    setWebSearch(null);
    setStage("searching");

    try {
      // 1. Web Search
      const searchRes = await fetch("/api/tweet/web-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: topic.trim() }),
      });
      const searchData = await searchRes.json();
      setWebSearch(searchData);
      
      setStage("generating");

      // 2. Generate
      const generateRes = await fetch("/api/tweet/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          format: selectedFormat,
          character,
          tone,
          knowledge,
          language,
          account: activeAccount,
          webContext: searchData.webContext,
          mode,
        }),
      });

      const generateData = await generateRes.json();
      if (!generateRes.ok) throw new Error(generateData.error || "Üretim başarısız.");

      if (isThread) setThreadTweets(generateData.thread ?? []);
      else setSingleTweet(generateData.tweet ?? "");

      toast.success("İçerik hazır.");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setStage("idle");
    }
  }

  async function saveDraft() {
    const content = isThread ? JSON.stringify(threadTweets) : singleTweet.trim();
    if (!content) return toast.error("Önce bir çıktı üret.");

    setSavingDraft(true);
    try {
      const { error } = await supabase.from("tweet_drafts").insert({
        channel: activeAccount,
        content,
        format: selectedFormat,
        tweet_type: isThread ? "thread" : "single",
        status: "pending",
        metadata: { mode, character, tone, knowledge, language },
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success("Taslak kaydedildi.");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSavingDraft(false);
    }
  }

  const filteredNews = news.filter(n => 
    (n.title_tr || n.title).toLowerCase().includes(newsSearch.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-52px)] overflow-hidden bg-[var(--bg-base)]">
      
      {/* LEFT: Haber Listesi (50%) */}
      <div className="w-1/2 flex flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <div className="p-6 border-b border-[var(--border-subtle)] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold font-mono text-white tracking-widest uppercase">HABER SEÇ</h2>
              <p className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-tighter mt-1">Sadece Viral (60+)</p>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchNews} className="h-8 text-[10px] text-[var(--text-muted)] hover:text-white">
              <RefreshCw size={12} className="mr-2" /> YENİLE
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
            <input 
              type="text" 
              placeholder="HABERLERDE ARA..." 
              value={newsSearch}
              onChange={(e) => setNewsSearch(e.target.value)}
              className="w-full h-10 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl pl-9 pr-4 text-xs text-white placeholder-[var(--text-muted)] focus:border-[var(--border-strong)] outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {newsLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 w-full bg-[var(--bg-elevated)]/50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {filteredNews.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => {
                    const text = [item.title_tr || item.title, item.summary_tr].filter(Boolean).join("\n\n");
                    setTopic(text.slice(0, TOPIC_LIMIT));
                    router.push(`/tweet-generator?news_id=${item.id}`, { scroll: false });
                  }}
                  className={cn(
                    "p-[12px] px-[16px] cursor-pointer transition-all hover:bg-[var(--bg-elevated)] group",
                    newsIdParam === item.id ? "bg-[var(--bg-elevated)] border-r-2 border-r-white" : ""
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold font-mono shrink-0",
                      item.viral_score >= 70 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-[var(--bg-base)] text-[var(--text-muted)] border border-[var(--border-default)]"
                    )}>
                      {item.viral_score}
                    </div>
                    <div className="flex-1 space-y-2">
                      <h4 className="text-[13px] leading-snug text-[var(--text-secondary)] group-hover:text-white transition-colors">
                        {item.title_tr || item.title}
                      </h4>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[9px] font-bold font-mono text-[var(--text-muted)] uppercase tracking-wider">
                          <Clock size={10} />
                          {formatDistanceToNow(new Date(item.fetched_at), { addSuffix: true, locale: tr })}
                        </div>
                        <ChevronRight size={14} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-all" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Üretim Merkezi (50%) */}
      <div className="w-1/2 flex flex-col bg-[var(--bg-base)]">
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          {/* Channel & Mode Selection */}
          <div className="flex items-center justify-between bg-[var(--bg-surface)] p-4 rounded-2xl border border-[var(--border-subtle)]">
             <div className="space-y-1">
               <p className="text-[10px] font-bold font-mono text-[var(--text-muted)] uppercase tracking-widest">AKTİF KANAL</p>
               <div className="flex items-center gap-3">
                 <button 
                  onClick={() => setActiveAccount("grafikcem")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                    activeAccount === "grafikcem" ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.1)]" : "bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-muted)]"
                  )}
                 >
                   @grafikcem
                 </button>
                 <button 
                  onClick={() => setActiveAccount("maskulenkod")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                    activeAccount === "maskulenkod" ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.1)]" : "bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-muted)]"
                  )}
                 >
                   @maskulenkod
                 </button>
               </div>
             </div>
             <div className="h-10 w-px bg-white/5 mx-2" />
             <div className="flex bg-[var(--bg-elevated)] p-1 rounded-xl border border-[var(--border-default)]">
               {MODE_OPTIONS.map(m => (
                 <button 
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono transition-all uppercase", mode === m.id ? "bg-[var(--bg-surface)] text-white" : "text-[var(--text-muted)]")}
                 >
                   {m.label}
                 </button>
               ))}
             </div>
          </div>

          {/* Topic / Input */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)]">Haber Özeti / Konu</label>
              <span className="text-[10px] font-mono text-[var(--text-muted)]">{topic.length} / {TOPIC_LIMIT}</span>
            </div>
            <div className="relative group">
              <Textarea 
                value={topic}
                onChange={handleTopicChange}
                placeholder="Sol taraftan bir haber seçin veya buraya bir fikir yazın..."
                className="min-h-[160px] bg-[var(--bg-elevated)] border-[var(--border-default)] rounded-2xl p-4 text-[15px] leading-relaxed resize-none focus:border-[var(--border-strong)] outline-none transition-all"
              />
              <div className="absolute top-4 right-4 animate-pulse">
                {newsIdParam && <Zap size={14} className="text-emerald-400" />}
              </div>
            </div>
          </div>

          {/* Format & Advanced */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)]">Format</label>
              <div className="grid grid-cols-2 gap-2">
                {FORMAT_CONFIGS.map(f => (
                  <button 
                    key={f.id}
                    onClick={() => setSelectedFormat(f.id)}
                    className={cn(
                      "p-3 rounded-xl border text-[11px] font-bold font-mono transition-all text-center",
                      selectedFormat === f.id ? "bg-[var(--bg-active)] border-[var(--accent)] text-white" : "bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-muted)]"
                    )}
                  >
                    {f.label.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
               <label className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)]">Hızlı Ayarlar</label>
               <button 
                onClick={() => setAdvancedOpen(!advancedOpen)}
                className="w-full h-10 px-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-xs text-[var(--text-secondary)] flex items-center justify-between hover:border-[var(--border-strong)] transition-all"
               >
                 <span>TON / KARAKTER</span>
                 {advancedOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
               </button>
               {advancedOpen && (
                 <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <SettingRow label="Ton" value={tone} options={TONE_OPTIONS} onChange={(v: string) => setTone(v as TweetTone)} />
                    <SettingRow label="Karakter" value={character} options={CHARACTER_OPTIONS} onChange={(v: string) => setCharacter(v as TweetCharacter)} />
                 </div>
               )}
            </div>
          </div>

          <div className="h-px bg-white/5" />

          {/* Result Area */}
          <div className="space-y-6">
            {stage === "idle" && !singleTweet && threadTweets.length === 0 ? (
              <div className="p-10 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-center space-y-3 opacity-20">
                 <Sparkles size={32} />
                 <p className="text-sm font-medium">İçerik üretmek için butona bas.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Web Search Summary */}
                {webSearch && (
                  <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                     <div className="flex items-center gap-2 text-emerald-400 mb-2">
                        <Globe size={12} />
                        <span className="text-[10px] font-bold font-mono tracking-widest">ARAŞTIRMA TAMAMLANDI</span>
                     </div>
                     <p className="text-xs text-emerald-100/60 leading-relaxed italic">&ldquo;{webSearch.summary}&rdquo;</p>
                  </div>
                )}

                {/* Output Card */}
                <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-6 shadow-2xl">
                   <div className="flex items-center justify-between border-b border-white/5 pb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
                        <span className="text-[10px] font-bold font-mono text-white tracking-widest uppercase">AI ÇIKTISI</span>
                      </div>
                      <span className={cn("text-[10px] font-mono", (isThread ? threadTweets.length * 200 : singleTweet.length) > 280 ? "text-amber-400" : "text-[var(--text-muted)]")}>
                        {isThread ? `${threadTweets.length} TWEET` : `${singleTweet.length} KARAKTER`}
                      </span>
                   </div>

                   {isThread ? (
                     <div className="space-y-4">
                        {threadTweets.map((t, i) => (
                          <div key={i} className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-3">
                             <div className="flex items-center justify-between">
                               <span className="text-[10px] font-bold font-mono text-[var(--text-muted)]">TWEET {i+1}</span>
                               <span className="text-[10px] font-mono text-[var(--text-muted)]">{t.text.length}/280</span>
                             </div>
                             <p className="text-sm text-white leading-relaxed font-mono">{t.text}</p>
                          </div>
                        ))}
                     </div>
                   ) : (
                     <Textarea 
                      value={singleTweet}
                      onChange={(e) => setSingleTweet(e.target.value)}
                      className="bg-transparent border-none p-0 focus-visible:ring-0 text-lg leading-relaxed resize-none h-auto min-h-[150px] font-mono text-white"
                     />
                   )}

                   <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          const text = isThread ? formatThreadBlock(threadTweets) : singleTweet;
                          navigator.clipboard.writeText(text);
                          toast.success("Kopyalandı.");
                        }}
                        className="flex-1 border-[var(--border-default)] h-12 rounded-xl text-xs font-bold"
                      >
                        <Copy size={14} className="mr-2" /> KOPYALA
                      </Button>
                      <Button 
                        onClick={saveDraft}
                        disabled={savingDraft}
                        className="flex-1 bg-white text-black font-bold h-12 rounded-xl"
                      >
                        {savingDraft ? <LoaderCircle className="animate-spin" size={14} /> : <Save size={14} className="mr-2" />}
                        TASLAK OLARAK KAYDET
                      </Button>
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Generate Footer */}
        <div className="p-6 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <Button 
            onClick={handleGenerate}
            disabled={stage !== "idle" || !topic.trim()}
            className="w-full h-14 bg-white text-black font-black text-lg rounded-2xl hover:bg-white/90 transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)]"
          >
            {stage === "idle" ? (
              <span className="flex items-center gap-3 uppercase tracking-tighter">
                <Sparkles size={20} className="fill-black" />
                İçerik Stratejisini Başlat
              </span>
            ) : (
              <span className="flex items-center gap-3 uppercase tracking-tighter">
                <LoaderCircle size={20} className="animate-spin" />
                AI Motoru Çalışıyor...
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SettingRow({ label, value, options, onChange }: any) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-bold font-mono text-[var(--text-muted)] uppercase">{label}</span>
      <select 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-[11px] text-white font-bold outline-none border-none cursor-pointer"
      >
        {options.map((opt: any) => (
          <option key={opt.value} value={opt.value} className="bg-black">{opt.value.toUpperCase()}</option>
        ))}
      </select>
    </div>
  );
}

export default function TweetGeneratorPage() {
  return (
    <Suspense fallback={<div className="p-10 text-white font-mono text-xs">YÜKLENİYOR...</div>}>
      <TweetGeneratorScreen />
    </Suspense>
  );
}
