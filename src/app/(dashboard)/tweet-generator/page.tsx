"use client";

import { ChangeEvent, DragEvent, ReactNode, Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Globe,
  ImagePlus,
  Link2,
  LoaderCircle,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  SPORTS_THEMES,
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

interface SearchSource {
  title: string;
  url: string;
  snippet: string;
}

interface WebSearchResponse {
  summary: string;
  sources: SearchSource[];
  totalSources: number;
  webContext: string;
}

interface ViralReference {
  id: string;
  tweet_text: string;
  format: string | null;
}

interface DraftNewsItem {
  title: string | null;
  summary: string | null;
}

const TOPIC_LIMIT = 280;
const FILE_LIMIT_BYTES = 5 * 1024 * 1024;

function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function formatThreadBlock(thread: ThreadTweet[]) {
  return thread.map((item) => `${item.step}/ ${item.text}`).join("\n\n");
}

function TweetGeneratorScreen() {
  const searchParams = useSearchParams();
  const newsId = searchParams.get("news_id");
  const accountParam = searchParams.get("account");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [activeAccount, setActiveAccount] = useState<TweetAccount>("grafikcem");
  const [mode, setMode] = useState<TweetMode>("tweet");
  const [topic, setTopic] = useState("");
  const [selectedFormat, setSelectedFormat] = useState<TweetFormat>("spark");
  const [advancedOpen, setAdvancedOpen] = useState(true);
  const [character, setCharacter] = useState<TweetCharacter>(ACCOUNT_CONFIGS.grafikcem.defaults.character);
  const [tone, setTone] = useState<TweetTone>(ACCOUNT_CONFIGS.grafikcem.defaults.tone);
  const [knowledge, setKnowledge] = useState<TweetKnowledge>(ACCOUNT_CONFIGS.grafikcem.defaults.knowledge);
  const [language, setLanguage] = useState<TweetLanguage>(ACCOUNT_CONFIGS.grafikcem.defaults.language);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const [stage, setStage] = useState<"idle" | "searching" | "generating">("idle");
  const [webSearch, setWebSearch] = useState<WebSearchResponse | null>(null);
  const [showSources, setShowSources] = useState(false);
  const [singleTweet, setSingleTweet] = useState("");
  const [threadTweets, setThreadTweets] = useState<ThreadTweet[]>([]);
  const [references, setReferences] = useState<ViralReference[]>([]);
  const [referencesOpen, setReferencesOpen] = useState(false);
  const [referenceInput, setReferenceInput] = useState("");
  const [referenceSaving, setReferenceSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  const [sportsHeadline, setSportsHeadline] = useState("");
  const [sportsSubjects, setSportsSubjects] = useState("");
  const [sportsTheme, setSportsTheme] = useState<(typeof SPORTS_THEMES)[number]>("Dramatik");
  const [sportsPrompt, setSportsPrompt] = useState<Record<string, string> | null>(null);
  const [sportsPromptLoading, setSportsPromptLoading] = useState(false);

  const activeConfig = ACCOUNT_CONFIGS[activeAccount];
  const selectedFormatConfig = FORMAT_CONFIGS.find((item) => item.id === selectedFormat) ?? FORMAT_CONFIGS[0];
  const isThread = selectedFormat === "thread";
  const advancedSummary = [character, tone, knowledge].map((item) => `[${item}]`).join(" • ");

  useEffect(() => {
    if (!accountParam) return;
    if (accountParam in ACCOUNT_CONFIGS) {
      setActiveAccount(accountParam as TweetAccount);
    }
  }, [accountParam]);

  useEffect(() => {
    const defaults = ACCOUNT_CONFIGS[activeAccount].defaults;
    setCharacter(defaults.character);
    setTone(defaults.tone);
    setKnowledge(defaults.knowledge);
    setLanguage(defaults.language);
  }, [activeAccount]);

  useEffect(() => {
    async function loadSeedNews() {
      if (!newsId) return;

      const { data } = await supabase
        .from("news_items")
        .select("title, summary")
        .eq("id", newsId)
        .maybeSingle();

      if (data) {
        const news = data as DraftNewsItem;
        setTopic([news.title, news.summary].filter(Boolean).join("\n\n").slice(0, TOPIC_LIMIT));
      }
    }

    loadSeedNews();
  }, [newsId]);

  useEffect(() => {
    fetchReferences(activeAccount);
  }, [activeAccount]);

  async function fetchReferences(account: TweetAccount) {
    try {
      const res = await fetch(`/api/tweet/references?account=${account}`);
      const data = await res.json();
      if (res.ok) {
        setReferences(data.references ?? []);
      }
    } catch (error) {
      console.error(error);
    }
  }

  function resetResultState() {
    setSingleTweet("");
    setThreadTweets([]);
  }

  function handleTopicChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setTopic(event.target.value.slice(0, TOPIC_LIMIT));
  }

  function validateFile(file: File) {
    const isImage = ["image/jpeg", "image/png"].includes(file.type);
    if (!isImage) {
      toast.error("Sadece JPG veya PNG yükleyebilirsin.");
      return false;
    }

    if (file.size > FILE_LIMIT_BYTES) {
      toast.error("Görsel en fazla 5MB olabilir.");
      return false;
    }

    return true;
  }

  function attachFile(file: File | null) {
    if (!file) return;
    if (!validateFile(file)) return;
    setAttachedFile(file);
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    attachFile(event.target.files?.[0] ?? null);
  }

  function onDropFile(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setIsDraggingFile(false);
    attachFile(event.dataTransfer.files?.[0] ?? null);
  }

  async function handleGenerate() {
    if (!topic.trim()) {
      toast.error("Önce bir konu veya fikir yaz.");
      return;
    }

    resetResultState();
    setWebSearch(null);
    setShowSources(false);
    setStage("searching");

    try {
      const searchRes = await fetch("/api/tweet/web-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: topic.trim() }),
      });
      const searchData = await searchRes.json();

      if (!searchRes.ok) {
        throw new Error(searchData.error || "Web araştırması başarısız.");
      }

      setWebSearch(searchData);
      setShowSources(true);
      setStage("generating");

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

      if (!generateRes.ok) {
        throw new Error(generateData.error || "Tweet üretimi başarısız.");
      }

      if (selectedFormat === "thread") {
        setThreadTweets(generateData.thread ?? []);
      } else {
        setSingleTweet(generateData.tweet ?? "");
      }

      toast.success(selectedFormat === "thread" ? "Thread hazır." : "Tweet hazır.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bir hata oluştu.";
      toast.error(message);
      setStage("idle");
      return;
    }

    setStage("idle");
  }

  async function saveDraft() {
    const content = isThread ? JSON.stringify(threadTweets) : singleTweet.trim();

    if (!content) {
      toast.error("Önce bir çıktı üret.");
      return;
    }

    setSavingDraft(true);
    try {
      const res = await fetch("/api/tweet/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: activeAccount,
          content,
          format: isThread ? "thread" : selectedFormat,
          status: "pending",
          metadata: {
            mode,
            character,
            tone,
            knowledge,
            language,
            sources: webSearch?.sources ?? [],
            imageName: attachedFile?.name ?? null,
          },
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Kaydetme başarısız.");
      }

      toast.success(isThread ? "Thread kaydedildi." : `${activeConfig.handle} için taslak kaydedildi.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kaydetme başarısız.");
    } finally {
      setSavingDraft(false);
    }
  }

  async function addReference() {
    if (!referenceInput.trim()) {
      toast.error("Referans tweet metni ekle.");
      return;
    }

    setReferenceSaving(true);
    try {
      const res = await fetch("/api/tweet/references", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account: activeAccount,
          tweetText: referenceInput.trim(),
          format: selectedFormat,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Referans eklenemedi.");
      }

      setReferenceInput("");
      await fetchReferences(activeAccount);
      toast.success("Viral referans eklendi.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Referans eklenemedi.");
    } finally {
      setReferenceSaving(false);
    }
  }

  async function deleteReference(id: string) {
    try {
      const res = await fetch(`/api/tweet/references?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Referans silinemedi.");
      }

      setReferences((prev) => prev.filter((item) => item.id !== id));
      toast.success("Referans kaldırıldı.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Referans silinemedi.");
    }
  }

  async function generateSportsPrompt() {
    if (!sportsHeadline.trim()) {
      toast.error("Önce haber başlığı yaz.");
      return;
    }

    setSportsPromptLoading(true);
    try {
      const res = await fetch("/api/tweet/sports-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline: sportsHeadline,
          subjects: sportsSubjects,
          theme: sportsTheme,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Prompt üretilemedi.");
      }

      setSportsPrompt(data.result ?? null);
      toast.success("Spor görsel promptu hazır.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Prompt üretilemedi.");
    } finally {
      setSportsPromptLoading(false);
    }
  }

  return (
    <div className="p-4 lg:p-8 text-[var(--text-primary)]">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.18),transparent_30%),linear-gradient(180deg,rgba(17,24,39,0.96),rgba(8,11,18,0.98))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-orange-300">// Tweet Üretici</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">XPatla benzeri yeni tweet motoru</h1>
            </div>

            <div className="min-w-[280px] rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="mb-2 text-[11px] uppercase tracking-[0.24em] text-[var(--text-tertiary)]">Aktif Hesap</p>
              <Select value={activeAccount} onValueChange={(value) => setActiveAccount(value as TweetAccount)}>
                <SelectTrigger className="h-12 w-full border-white/10 bg-black/20 text-[var(--text-primary)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[var(--surface-card)] text-[var(--text-primary)]">
                  {Object.values(ACCOUNT_CONFIGS).map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: account.color }}
                        />
                        <span className="flex flex-col">
                          <span>{account.handle} — {account.name}</span>
                          <span className="text-xs text-[var(--text-tertiary)]">{account.description}</span>
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-5">
              <div className="rounded-[24px] border border-white/10 bg-black/15 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    {MODE_OPTIONS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setMode(item.id)}
                        className={cn(
                          "rounded-full border px-4 py-2 text-sm transition",
                          mode === item.id
                            ? "border-orange-400 bg-orange-500/15 text-orange-200"
                            : "border-white/10 bg-white/5 text-[var(--text-secondary)] hover:border-white/20 hover:text-[var(--text-primary)]"
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-[var(--text-tertiary)]">
                    Fast • ~1 kredi
                  </div>
                </div>

                <div className="relative">
                  <Textarea
                    value={topic}
                    onChange={handleTopicChange}
                    placeholder="Konu veya fikir yaz, viral tweetler üret"
                    className="min-h-[220px] resize-none rounded-[20px] border-white/10 bg-[rgba(3,7,18,0.75)] px-5 py-5 text-[15px] leading-7 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
                  />
                  <span className="absolute right-4 top-4 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-[var(--text-secondary)]">
                    {topic.length}/{TOPIC_LIMIT}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDraggingFile(true);
                  }}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={onDropFile}
                  className={cn(
                    "mt-4 flex w-full items-center justify-between rounded-[18px] border border-dashed px-4 py-4 text-left transition",
                    isDraggingFile
                      ? "border-orange-400 bg-orange-500/10"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-white/8 p-3">
                      <ImagePlus className="size-4 text-orange-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">Görsel ekle (opsiyonel)</p>
                      <p className="text-xs text-[var(--text-tertiary)]">Drag-drop, max 5MB, JPG/PNG</p>
                    </div>
                  </div>
                  {attachedFile ? (
                    <div className="text-right">
                      <p className="text-sm text-[var(--text-primary)]">{attachedFile.name}</p>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setAttachedFile(null);
                        }}
                        className="text-xs text-orange-300"
                      >
                        Kaldır
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-[var(--text-tertiary)]">Dosya seç</span>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={onFileChange}
                />
              </div>

              <div className="rounded-[24px] border border-white/10 bg-black/10 p-4">
                <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap gap-2">
                    {FORMAT_CONFIGS.map((format) => (
                      <button
                        key={format.id}
                        type="button"
                        onClick={() => setSelectedFormat(format.id)}
                        className={cn(
                          "rounded-full border px-4 py-2 text-sm transition",
                          selectedFormat === format.id
                            ? "border-orange-400 bg-orange-500 text-black"
                            : "border-white/10 bg-white/5 text-[var(--text-secondary)] hover:border-white/20 hover:text-[var(--text-primary)]"
                        )}
                      >
                        {format.label}
                      </button>
                    ))}
                    <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--text-secondary)]">···</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-[var(--text-tertiary)]">
                      {selectedFormatConfig.rangeLabel}
                    </span>
                    <Button
                      onClick={handleGenerate}
                      disabled={stage !== "idle"}
                      className="rounded-full bg-orange-500 px-5 text-black hover:bg-orange-400"
                    >
                      {stage === "searching" ? (
                        <>
                          <LoaderCircle className="size-4 animate-spin" />
                          Web'de araştırılıyor...
                        </>
                      ) : stage === "generating" ? (
                        <>
                          <LoaderCircle className="size-4 animate-spin" />
                          Tweet üretiliyor...
                        </>
                      ) : (
                        "Üret"
                      )}
                    </Button>
                  </div>
                </div>

                <div className="rounded-[18px] border border-white/10 bg-white/5 p-4">
                  <button
                    type="button"
                    onClick={() => setAdvancedOpen((prev) => !prev)}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <div>
                      <p className="font-mono text-sm text-[var(--text-primary)]">
                        {advancedOpen ? "∧" : "∨"} GELİŞMİŞ AYARLAR • {advancedSummary} • [{language}]
                      </p>
                    </div>
                    {advancedOpen ? <ChevronUp className="size-4 text-[var(--text-tertiary)]" /> : <ChevronDown className="size-4 text-[var(--text-tertiary)]" />}
                  </button>

                  {advancedOpen && (
                    <div className="mt-4 space-y-4">
                      <SettingRow
                        title="KARAKTER"
                        value={character}
                        options={CHARACTER_OPTIONS}
                        onSelect={(value) => setCharacter(value as TweetCharacter)}
                      />
                      <SettingRow
                        title="TON"
                        value={tone}
                        options={TONE_OPTIONS}
                        onSelect={(value) => setTone(value as TweetTone)}
                      />
                      <SettingRow
                        title="KNOWLEDGE"
                        value={knowledge}
                        options={KNOWLEDGE_OPTIONS}
                        onSelect={(value) => setKnowledge(value as TweetKnowledge)}
                      />
                      <SettingRow
                        title="DİL"
                        value={language}
                        options={LANGUAGE_OPTIONS}
                        onSelect={(value) => setLanguage(value as TweetLanguage)}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <Card className="overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(17,24,39,0.94),rgba(2,6,23,0.94))]">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div
                      className="size-3 rounded-full"
                      style={{ backgroundColor: activeConfig.color }}
                    />
                    <div>
                      <p className="text-sm font-medium">{activeConfig.handle} — {activeConfig.name}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">{activeConfig.description}</p>
                    </div>
                  </div>

                  {webSearch ? (
                    <div className="mt-5 space-y-3">
                      <button
                        type="button"
                        onClick={() => setShowSources((prev) => !prev)}
                        className="flex w-full items-center justify-between rounded-[18px] border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-left"
                      >
                        <div className="flex items-center gap-3">
                          <Globe className="size-4 text-emerald-300" />
                          <div>
                            <p className="text-sm font-medium">🔍 {webSearch.totalSources} kaynak analiz edildi</p>
                            <p className="text-xs text-emerald-100/70">Tweet için kısa araştırma özeti hazır</p>
                          </div>
                        </div>
                        {showSources ? <ChevronUp className="size-4 text-emerald-200" /> : <ChevronDown className="size-4 text-emerald-200" />}
                      </button>

                      {showSources && (
                        <div className="space-y-2 rounded-[18px] border border-white/10 bg-black/15 p-3">
                          {webSearch.sources.map((source) => {
                            const domain = getDomain(source.url);
                            return (
                              <a
                                key={source.url}
                                href={source.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/5 px-3 py-3 transition hover:border-white/15"
                              >
                                <img
                                  src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                                  alt=""
                                  className="size-4 rounded-sm"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm">{source.title}</p>
                                  <p className="truncate text-xs text-[var(--text-tertiary)]">{domain}</p>
                                </div>
                                <ExternalLink className="size-3.5 text-[var(--text-tertiary)]" />
                              </a>
                            );
                          })}
                          <p className="rounded-2xl bg-white/5 px-3 py-3 text-xs leading-6 text-[var(--text-secondary)]">
                            {webSearch.summary}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-5 rounded-[18px] border border-dashed border-white/10 bg-black/10 p-5 text-sm text-[var(--text-tertiary)]">
                      Konu yazıp üret dediğinde önce web taraması başlayacak, sonra kaynaklı tweet çıkacak.
                    </div>
                  )}

                  <div className="mt-5 rounded-[18px] border border-white/10 bg-black/10 p-4">
                    <button
                      type="button"
                      onClick={() => setReferencesOpen((prev) => !prev)}
                      className="flex w-full items-center justify-between text-left"
                    >
                      <div>
                        <p className="text-sm font-medium">📌 Viral Referanslar ({references.length} tweet)</p>
                        <p className="text-xs text-[var(--text-tertiary)]">
                          Yazım kalıbını, cümle yapısını ve tonu referans alır. İçerik kopyalanmaz.
                        </p>
                      </div>
                      {referencesOpen ? <ChevronUp className="size-4 text-[var(--text-tertiary)]" /> : <ChevronDown className="size-4 text-[var(--text-tertiary)]" />}
                    </button>

                    {referencesOpen && (
                      <div className="mt-4 space-y-3">
                        <Textarea
                          value={referenceInput}
                          onChange={(event) => setReferenceInput(event.target.value)}
                          placeholder="Viral tweet yapıştır..."
                          className="min-h-[110px] border-white/10 bg-black/20"
                        />
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs text-[var(--text-tertiary)]">Maksimum 10 referans / hesap</span>
                          <Button
                            onClick={addReference}
                            disabled={referenceSaving || references.length >= 10}
                            variant="outline"
                            className="border-white/10"
                          >
                            {referenceSaving ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
                            Ekle
                          </Button>
                        </div>

                        <div className="space-y-2">
                          {references.map((reference) => (
                            <div key={reference.id} className="rounded-[18px] border border-white/8 bg-white/5 p-3">
                              <div className="flex items-start justify-between gap-3">
                                <p className="text-sm leading-6 text-[var(--text-secondary)]">{reference.tweet_text}</p>
                                <button
                                  type="button"
                                  onClick={() => deleteReference(reference.id)}
                                  className="rounded-full border border-white/10 p-2 text-[var(--text-tertiary)] transition hover:border-red-400/40 hover:text-red-300"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                          {references.length === 0 && (
                            <p className="rounded-2xl border border-dashed border-white/8 px-4 py-6 text-sm text-[var(--text-tertiary)]">
                              Bu hesap için henüz referans yok.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {activeAccount === "sporhaberleri" && (
                <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(6,78,59,0.28),rgba(2,6,23,0.94))]">
                  <CardContent className="space-y-4 p-5">
                    <div>
                      <p className="text-sm font-medium">📸 Haber Görseli Üret</p>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        Bu promptu Midjourney, Ideogram veya DALL-E’ye yapıştır.
                      </p>
                    </div>

                    <Input
                      value={sportsHeadline}
                      onChange={(event) => setSportsHeadline(event.target.value)}
                      placeholder="Haber başlığı"
                      className="border-white/10 bg-black/20"
                    />
                    <Input
                      value={sportsSubjects}
                      onChange={(event) => setSportsSubjects(event.target.value)}
                      placeholder="Takımlar / kişiler (opsiyonel)"
                      className="border-white/10 bg-black/20"
                    />

                    <div className="flex flex-wrap gap-2">
                      {SPORTS_THEMES.map((theme) => (
                        <button
                          key={theme}
                          type="button"
                          onClick={() => setSportsTheme(theme)}
                          className={cn(
                            "rounded-full border px-4 py-2 text-sm transition",
                            sportsTheme === theme
                              ? "border-emerald-300 bg-emerald-300 text-black"
                              : "border-white/10 bg-white/5 text-[var(--text-secondary)]"
                          )}
                        >
                          {theme}
                        </button>
                      ))}
                    </div>

                    <Button
                      onClick={generateSportsPrompt}
                      disabled={sportsPromptLoading}
                      className="w-full rounded-full bg-emerald-400 text-black hover:bg-emerald-300"
                    >
                      {sportsPromptLoading ? <LoaderCircle className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                      Prompt Üret
                    </Button>

                    {sportsPrompt && (
                      <div className="rounded-[18px] border border-white/10 bg-black/15 p-4">
                        <pre className="overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-[var(--text-secondary)]">
                          {JSON.stringify(sportsPrompt, null, 2)}
                        </pre>
                        <Button
                          variant="outline"
                          className="mt-3 border-white/10"
                          onClick={() => {
                            navigator.clipboard.writeText(JSON.stringify(sportsPrompt, null, 2));
                            toast.success("Prompt JSON kopyalandı.");
                          }}
                        >
                          <Copy className="size-4" />
                          Kopyala
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        {singleTweet && !isThread && (
          <ResultCard
            title="Tekli Tweet"
            description={selectedFormatConfig.description}
            charCount={singleTweet.length}
            sources={webSearch?.sources ?? []}
            onCopy={() => {
              navigator.clipboard.writeText(singleTweet);
              toast.success("Tweet kopyalandı.");
            }}
            onSave={saveDraft}
            onRegenerate={handleGenerate}
            savingDraft={savingDraft}
          >
            <Textarea
              value={singleTweet}
              onChange={(event) => setSingleTweet(event.target.value)}
              className="min-h-[240px] resize-none border-white/10 bg-black/20 text-[15px] leading-7"
            />
          </ResultCard>
        )}

        {isThread && threadTweets.length > 0 && (
          <div className="space-y-4 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,24,39,0.96),rgba(2,6,23,0.96))] p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-medium">Thread Builder</p>
                <p className="text-xs text-[var(--text-tertiary)]">Her tweet ayrı kartta düzenlenebilir.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="border-white/10"
                  onClick={() => {
                    navigator.clipboard.writeText(formatThreadBlock(threadTweets));
                    toast.success("Tüm thread kopyalandı.");
                  }}
                >
                  <Copy className="size-4" />
                  Tümünü Kopyala
                </Button>
                <Button variant="outline" className="border-white/10" onClick={handleGenerate}>
                  <RefreshCw className="size-4" />
                  Tekrar Üret
                </Button>
                <Button onClick={saveDraft} disabled={savingDraft} className="bg-orange-500 text-black hover:bg-orange-400">
                  {savingDraft ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Thread'i Kaydet
                </Button>
              </div>
            </div>

            {webSearch?.sources?.length ? (
              <div className="flex flex-wrap gap-2">
                {webSearch.sources.map((source) => (
                  <a
                    key={source.url}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-[var(--text-secondary)]"
                  >
                    <Link2 className="size-3.5" />
                    {getDomain(source.url)}
                  </a>
                ))}
              </div>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2">
              {threadTweets.map((tweet, index) => (
                <Card key={tweet.step} className="border-white/10 bg-black/15">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-orange-500 px-2.5 py-1 text-xs font-semibold text-black">
                          {index + 1}/
                        </span>
                        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                          {tweet.type}
                        </span>
                      </div>
                      <span className={cn("text-xs", tweet.text.length > 280 ? "text-red-300" : "text-[var(--text-tertiary)]")}>
                        {tweet.text.length}/280
                      </span>
                    </div>

                    <Textarea
                      value={tweet.text}
                      onChange={(event) => {
                        const next = [...threadTweets];
                        next[index] = { ...next[index], text: event.target.value };
                        setThreadTweets(next);
                      }}
                      className="min-h-[180px] resize-none border-white/10 bg-black/20 text-sm leading-7"
                    />

                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/10"
                        onClick={() => {
                          navigator.clipboard.writeText(tweet.text);
                          toast.success(`${tweet.step}. tweet kopyalandı.`);
                        }}
                      >
                        <Copy className="size-3.5" />
                        Kopyala
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SettingRow({
  title,
  value,
  options,
  onSelect,
}: {
  title: string;
  value: string;
  options: Array<{ value: string; description: string }>;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold tracking-[0.24em] text-[var(--text-tertiary)]">{title}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className={cn(
              "rounded-full border px-3 py-2 text-sm transition",
              option.value === value
                ? "border-orange-400 bg-orange-500/15 text-orange-200"
                : "border-white/10 bg-white/5 text-[var(--text-secondary)] hover:border-white/20 hover:text-[var(--text-primary)]"
            )}
            title={option.description}
          >
            {option.value}
          </button>
        ))}
      </div>
    </div>
  );
}

function ResultCard({
  title,
  description,
  charCount,
  sources,
  onCopy,
  onSave,
  onRegenerate,
  savingDraft,
  children,
}: {
  title: string;
  description: string;
  charCount: number;
  sources: SearchSource[];
  onCopy: () => void;
  onSave: () => void;
  onRegenerate: () => void;
  savingDraft: boolean;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,24,39,0.96),rgba(2,6,23,0.96))] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-lg font-semibold">{title}</p>
          <p className="text-sm text-[var(--text-tertiary)]">{description}</p>
        </div>
        <span className={cn("rounded-full px-3 py-1 text-xs", charCount > 280 ? "bg-red-500/15 text-red-200" : "bg-white/5 text-[var(--text-secondary)]")}>
          {charCount} karakter
        </span>
      </div>

      {sources.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {sources.map((source) => (
            <a
              key={source.url}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-[var(--text-secondary)]"
            >
              <Link2 className="size-3.5" />
              {getDomain(source.url)}
            </a>
          ))}
        </div>
      )}

      <div className="mt-4">{children}</div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" className="border-white/10" onClick={onCopy}>
          <Copy className="size-4" />
          Kopyala
        </Button>
        <Button onClick={onSave} disabled={savingDraft} className="bg-orange-500 text-black hover:bg-orange-400">
          {savingDraft ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
          Kaydet
        </Button>
        <Button variant="outline" className="border-white/10" onClick={onRegenerate}>
          <RefreshCw className="size-4" />
          Tekrar Üret
        </Button>
      </div>
    </div>
  );
}

export default function TweetGeneratorPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-[var(--text-tertiary)]">Tweet motoru yükleniyor...</div>}>
      <TweetGeneratorScreen />
    </Suspense>
  );
}
