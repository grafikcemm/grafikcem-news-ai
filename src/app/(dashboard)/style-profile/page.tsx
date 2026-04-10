"use client";

import { useEffect, useState, KeyboardEvent } from "react";
import { toast } from "sonner";

type Channel = "grafikcem" | "maskulenkod" | "linkedin";

interface StyleProfile {
  sample_tweets: string;
  tone: string;
  sentence_length: number;
  emoji_usage: string;
  signature_closer: string;
  avoid_words: string[];
  sample_count?: number;
  updated_at?: string;
}

const CHANNELS: { id: Channel; label: string; dot: string }[] = [
  { id: "grafikcem", label: "@grafikcem", dot: "bg-blue-400" },
  { id: "maskulenkod", label: "@maskulenkod", dot: "bg-[var(--text-tertiary)]" },
  { id: "linkedin", label: "LinkedIn", dot: "bg-indigo-400" },
];

const TONES = ["Analitik", "Heyecanlı", "Felsefi", "Direkt", "Mentor"];
const EMOJI_OPTIONS = ["Yok", "Az", "Orta"];

const DEFAULT_PROFILE: StyleProfile = {
  sample_tweets: "",
  tone: "Direkt",
  sentence_length: 40,
  emoji_usage: "Yok",
  signature_closer: "",
  avoid_words: [],
};

function TagInput({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [input, setInput] = useState("");

  const addTag = (val: string) => {
    const trimmed = val.trim().replace(/,+$/, "");
    if (trimmed && !tags.includes(trimmed)) onChange([...tags, trimmed]);
    setInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] min-h-[44px] focus-within:border-slate-500 transition-colors">
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 text-xs bg-[var(--surface-overlay)] text-[var(--text-primary)] rounded-full px-2.5 py-1"
        >
          {tag}
          <button
            onClick={() => onChange(tags.filter((t) => t !== tag))}
            className="text-[var(--text-tertiary)] hover:text-white ml-0.5"
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => input.trim() && addTag(input)}
        placeholder={tags.length === 0 ? "Kelime yaz, Enter ile ekle..." : ""}
        className="flex-1 min-w-[120px] bg-transparent text-sm text-white placeholder-slate-600 focus:outline-none"
      />
    </div>
  );
}

export default function StyleProfilePage() {
  const [activeChannel, setActiveChannel] = useState<Channel>("grafikcem");
  const [profile, setProfile] = useState<StyleProfile>(DEFAULT_PROFILE);
  const [savedProfile, setSavedProfile] = useState<StyleProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile(activeChannel);
  }, [activeChannel]);

  async function loadProfile(channel: Channel) {
    setLoading(true);
    try {
      const res = await fetch(`/api/style/profile?channel=${channel}`);
      const data = await res.json();
      if (data.profile) {
        setProfile(data.profile);
        setSavedProfile(data.profile);
      } else {
        setProfile(DEFAULT_PROFILE);
        setSavedProfile(null);
      }
    } catch {
      setProfile(DEFAULT_PROFILE);
      setSavedProfile(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!profile.sample_tweets.trim()) {
      toast.error("En az bir örnek tweet gir");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/style/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: activeChannel, profile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSavedProfile(data.profile);
      toast.success("Stil profili kaydedildi");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kaydetme başarısız");
    } finally {
      setSaving(false);
    }
  }

  const sentenceLengthLabel =
    profile.sentence_length < 30
      ? "Çok Kısa"
      : profile.sentence_length < 50
      ? "Kısa"
      : profile.sentence_length < 70
      ? "Orta"
      : "Uzun";

  const sampleCount = profile.sample_tweets
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean).length;

  return (
    <div className="min-h-screen bg-[var(--surface-base)] p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Stil Profili</h1>
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">
            Her kanalın yazım stilini tanımla — üretimde kullanılır
          </p>
        </div>

        {/* Channel Tabs */}
        <div className="flex gap-1.5 p-1.5 bg-[var(--surface-raised)] border border-[var(--border-subtle)] rounded-xl w-fit">
          {CHANNELS.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setActiveChannel(ch.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeChannel === ch.id
                  ? "bg-[var(--surface-overlay)] text-white"
                  : "text-[var(--text-tertiary)] hover:text-white"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${ch.dot}`} />
              {ch.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 rounded-xl bg-[var(--surface-card)] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">

            {/* Section 1: Sample Tweets */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 space-y-3">
              <div>
                <h2 className="text-base font-semibold text-white">Yazım Stilini Tanımla</h2>
                <p className="text-sm text-[var(--text-tertiary)] mt-0.5">
                  Geçmiş paylaşımlarından 5–10 örnek yapıştır. Sistem bunları öğrenip aynı tarzda üretim yapar.
                </p>
              </div>
              <textarea
                value={profile.sample_tweets}
                onChange={(e) => setProfile({ ...profile, sample_tweets: e.target.value })}
                placeholder={"Örnek paylaşımları buraya yapıştır, her biri yeni satırda...\n\nÖrn:\nYapay zeka araçlarını kullanmak rekabet avantajı değil, minimum standart haline geliyor.\nSabah rutini olmayan biri için \"motivasyon\" kelimesi anlamsızdır."}
                rows={8}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-slate-500 resize-y transition-colors font-mono"
              />
              <p className="text-xs text-[var(--text-secondary)]">{sampleCount} örnek girişi</p>
            </div>

            {/* Section 2: Style Parameters */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 space-y-5">
              <h2 className="text-base font-semibold text-white">Stil Parametreleri</h2>

              {/* Ton */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Ton</label>
                <div className="flex flex-wrap gap-2">
                  {TONES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setProfile({ ...profile, tone: t })}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                        profile.tone === t
                          ? "bg-[#C8F135]/15 text-[#C8F135] border-[#C8F135]/40"
                          : "text-[var(--text-tertiary)] border-[var(--border-subtle)] hover:text-white hover:border-slate-600"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sentence length slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                    Cümle Uzunluğu
                  </label>
                  <span className="text-xs text-[var(--text-secondary)] font-medium">{sentenceLengthLabel}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[var(--text-secondary)] w-10">Kısa</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={profile.sentence_length}
                    onChange={(e) =>
                      setProfile({ ...profile, sentence_length: Number(e.target.value) })
                    }
                    className="flex-1 accent-[#C8F135] cursor-pointer"
                  />
                  <span className="text-xs text-[var(--text-secondary)] w-10 text-right">Uzun</span>
                </div>
              </div>

              {/* Emoji usage */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  Emoji Kullanımı
                </label>
                <div className="flex gap-2">
                  {EMOJI_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setProfile({ ...profile, emoji_usage: opt })}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                        profile.emoji_usage === opt
                          ? "bg-[#C8F135]/15 text-[#C8F135] border-[#C8F135]/40"
                          : "text-[var(--text-tertiary)] border-[var(--border-subtle)] hover:text-white hover:border-slate-600"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Signature closer */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  İmza Kapanış
                </label>
                <input
                  type="text"
                  value={profile.signature_closer}
                  onChange={(e) =>
                    setProfile({ ...profile, signature_closer: e.target.value })
                  }
                  placeholder="örn: Odakta kal."
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-slate-500 transition-colors"
                />
              </div>

              {/* Avoid words */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  Kaçınılacak Kelimeler
                </label>
                <TagInput
                  tags={profile.avoid_words}
                  onChange={(tags) => setProfile({ ...profile, avoid_words: tags })}
                />
              </div>
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded-xl bg-[#C8F135] py-3 text-sm font-bold text-slate-950 hover:bg-[#d4f54a] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {saving ? "Kaydediliyor..." : "Stili Kaydet"}
            </button>

            {/* Section 3: Active Style Summary */}
            {savedProfile && (
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 space-y-4">
                <h2 className="text-base font-semibold text-white">Aktif Stil Özeti</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: "Örnek Sayısı", value: `${savedProfile.sample_count || 0} tweet` },
                    { label: "Ton", value: savedProfile.tone },
                    { label: "Cümle Uzunluğu", value: savedProfile.sentence_length < 30 ? "Çok Kısa" : savedProfile.sentence_length < 50 ? "Kısa" : savedProfile.sentence_length < 70 ? "Orta" : "Uzun" },
                    { label: "Emoji", value: savedProfile.emoji_usage },
                    ...(savedProfile.signature_closer ? [{ label: "Kapanış", value: savedProfile.signature_closer }] : []),
                    ...(savedProfile.avoid_words?.length ? [{ label: "Kaçınılan", value: `${savedProfile.avoid_words.length} kelime` }] : []),
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg bg-[var(--surface-card)] p-3">
                      <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
                        {item.label}
                      </p>
                      <p className="text-sm text-white font-medium truncate">{item.value}</p>
                    </div>
                  ))}
                </div>
                {savedProfile.updated_at && (
                  <p className="text-xs text-[var(--text-secondary)]">
                    Son güncelleme:{" "}
                    {new Date(savedProfile.updated_at).toLocaleDateString("tr-TR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
