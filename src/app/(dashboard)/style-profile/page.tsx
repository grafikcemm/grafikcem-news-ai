"use client";

import { useEffect, useState, KeyboardEvent } from "react";
import { toast } from "sonner";
import { 
  Sparkles, 
  Trash2, 
  Save, 
  MessageSquare, 
  Type, 
  Zap, 
  ShieldAlert,
  LoaderCircle,
  X,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  { id: "maskulenkod", label: "@maskulenkod", dot: "bg-[var(--text-muted)]" },
  { id: "linkedin", label: "LinkedIn", dot: "bg-indigo-500" },
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
    <div className="flex flex-wrap gap-2 p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] min-h-[56px] focus-within:border-[var(--border-strong)] transition-all">
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1.5 text-[10px] font-bold font-mono bg-white text-black rounded-lg px-2.5 py-1"
        >
          {tag.toUpperCase()}
          <button
            onClick={() => onChange(tags.filter((t) => t !== tag))}
            className="hover:opacity-60 transition-opacity"
          >
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => input.trim() && addTag(input)}
        placeholder={tags.length === 0 ? "Kelime yaz ve Enter'a bas..." : ""}
        className="flex-1 min-w-[140px] bg-transparent text-sm text-white placeholder-[var(--text-muted)] focus:outline-none"
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
      ? "ÇOK KISA"
      : profile.sentence_length < 50
      ? "KISA"
      : profile.sentence_length < 70
      ? "ORTA"
      : "UZUN";

  const sampleCount = profile.sample_tweets
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean).length;

  return (
    <div className="min-h-screen bg-[var(--bg-base)] p-6 lg:p-10 animate-in fade-in duration-700">
      <div className="max-w-4xl mx-auto space-y-10">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Stil Profili</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Yapay zekaya yazım stilini öğret ve her kanala özel karakter kazandır.
            </p>
          </div>
          
          <div className="flex bg-[var(--bg-surface)] p-1 rounded-xl border border-[var(--border-subtle)]">
            {CHANNELS.map((ch) => (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id)}
                className={cn(
                  "px-4 py-2 rounded-lg text-[10px] font-bold font-mono transition-all flex items-center gap-2",
                  activeChannel === ch.id ? "bg-white text-black" : "text-[var(--text-muted)] hover:text-white"
                )}
              >
                <div className={cn("w-1.5 h-1.5 rounded-full", ch.dot)} />
                {ch.label.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <LoaderCircle className="w-8 h-8 animate-spin text-white/20" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left: Editor */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Section 1: Samples */}
              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center">
                      <MessageSquare size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold">Örnek Paylaşımlar</h3>
                      <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase">{sampleCount} KAYITLI ÖRNEK</p>
                    </div>
                  </div>
                </div>
                
                <div className="relative group">
                  <textarea
                    value={profile.sample_tweets}
                    onChange={(e) => setProfile({ ...profile, sample_tweets: e.target.value })}
                    placeholder={"Geçmiş tweetlerini buraya yapıştır...\n\nÖrn:\nYapay zeka araçlarını kullanmak artık bir seçenek değil, zorunluluk."}
                    className="w-full h-[320px] bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-2xl p-6 text-sm leading-relaxed text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-strong)] transition-all font-mono resize-none"
                  />
                  <div className="absolute bottom-4 right-4 pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity">
                    <Type size={40} />
                  </div>
                </div>
              </div>

              {/* Section 2: Parameters */}
              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl p-8 space-y-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center">
                    <Zap size={18} />
                  </div>
                  <h3 className="font-bold">Stil Parametreleri</h3>
                </div>

                <div className="space-y-8">
                  {/* Ton */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold font-mono text-[var(--text-muted)] uppercase tracking-widest">Anlatım Tonu</label>
                    <div className="flex flex-wrap gap-2">
                      {TONES.map((t) => (
                        <button
                          key={t}
                          onClick={() => setProfile({ ...profile, tone: t })}
                          className={cn(
                            "px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all border",
                            profile.tone === t 
                              ? "bg-white text-black border-white" 
                              : "bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-muted)] hover:text-white"
                          )}
                        >
                          {t.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Length Slider */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold font-mono text-[var(--text-muted)] uppercase tracking-widest">Cümle Uzunluğu</label>
                      <span className="text-[10px] font-bold font-mono bg-[var(--bg-elevated)] px-2 py-0.5 rounded border border-white/10 text-white">{sentenceLengthLabel}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={profile.sentence_length}
                      onChange={(e) => setProfile({ ...profile, sentence_length: Number(e.target.value) })}
                      className="w-full h-1.5 bg-[var(--bg-elevated)] rounded-lg appearance-none cursor-pointer accent-white"
                    />
                  </div>

                  {/* Avoid words */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <ShieldAlert size={14} className="text-amber-500" />
                      <label className="text-[10px] font-bold font-mono text-[var(--text-muted)] uppercase tracking-widest">Kullanılmayacak Kelimeler</label>
                    </div>
                    <TagInput
                      tags={profile.avoid_words}
                      onChange={(tags) => setProfile({ ...profile, avoid_words: tags })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Sidebar & Save */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl p-6 sticky top-6 space-y-6">
                <div className="space-y-4">
                  <Button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="w-full h-14 bg-white text-black font-bold text-lg rounded-2xl hover:opacity-90 disabled:opacity-30 transition-all flex items-center justify-center gap-2"
                  >
                    {saving ? <LoaderCircle className="animate-spin" /> : <Save size={20} />}
                    Stili Kaydet
                  </Button>
                  <p className="text-[10px] text-center text-[var(--text-muted)] font-mono uppercase">Değişiklikler anında AI modeline yansıtılır</p>
                </div>

                {savedProfile && (
                  <div className="pt-6 border-t border-white/5 space-y-6">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-white">Aktif Profil Özeti</h4>
                    <div className="space-y-3">
                      <SummaryItem label="Anlatım Tonu" value={savedProfile.tone} />
                      <SummaryItem label="Cümle Yapısı" value={sentenceLengthLabel} />
                      <SummaryItem label="Emoji" value={savedProfile.emoji_usage} />
                      <SummaryItem label="Yasaklı Kelime" value={`${savedProfile.avoid_words.length} Adet`} />
                    </div>
                    
                    <div className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-white/5">
                      <p className="text-[10px] font-bold font-mono text-[var(--text-muted)] uppercase mb-1">Son Güncelleme</p>
                      <p className="text-[10px] font-mono text-white">
                        {savedProfile.updated_at ? new Date(savedProfile.updated_at).toLocaleString('tr-TR') : 'HİÇBİR ZAMAN'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5">
      <span className="text-[10px] font-bold font-mono text-[var(--text-muted)] uppercase">{label}</span>
      <span className="text-[11px] font-bold text-white">{value.toUpperCase()}</span>
    </div>
  );
}

function Button({ children, onClick, disabled, className, variant = "primary" }: any) {
  return (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={cn(className)}
    >
      {children}
    </button>
  );
}
