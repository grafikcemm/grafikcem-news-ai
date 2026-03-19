"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { Mode, Variation, HistoryEntry, ModeConfig } from "@/lib/prompt-studio/types";
import { MODES_CONFIG } from "@/lib/prompt-studio/modes.config";

const HISTORY_KEY = "prompt_studio_history";
const MAX_HISTORY = 5;

function VariationCard({ variation, onCopy }: { variation: Variation; onCopy: (text: string) => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const fullText = variation.negative_prompt
      ? `${variation.prompt}\n\n${variation.negative_prompt}`
      : variation.prompt;
    await onCopy(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-700/60 bg-slate-800/50 p-5 hover:border-slate-600 transition-colors">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{variation.icon}</span>
          <span className="font-semibold text-white text-sm">{variation.label}</span>
        </div>
        <span className="text-[10px] font-medium text-slate-400 bg-slate-700/60 rounded-full px-2 py-0.5 whitespace-nowrap">
          {variation.best_for}
        </span>
      </div>

      <div className="flex-1">
        <p className="text-sm font-mono text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
          {variation.prompt}
        </p>
        {variation.negative_prompt && (
          <p className="mt-3 text-xs font-mono text-slate-500 leading-relaxed">
            {variation.negative_prompt}
          </p>
        )}
      </div>

      <button
        onClick={handleCopy}
        className={`mt-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
          copied
            ? "bg-[#C8F135]/20 text-[#C8F135] border border-[#C8F135]/40"
            : "bg-slate-700/60 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-600/40 hover:border-slate-500"
        }`}
      >
        {copied ? "✅ Kopyalandı!" : "📋 Kopyala"}
      </button>
    </div>
  );
}

function ModeButton({ config, active, onClick }: { config: ModeConfig; active: boolean; onClick: () => void }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
          active
            ? "bg-[#C8F135]/15 text-[#C8F135] border border-[#C8F135]/40"
            : "text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent"
        }`}
      >
        <span className="text-base">{config.icon}</span>
        <span>{config.label}</span>
      </button>
      {showTooltip && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 w-56 rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-xs text-slate-300 shadow-xl pointer-events-none">
          {config.tooltip}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-700 border-l border-t border-slate-600 rotate-45" />
        </div>
      )}
    </div>
  );
}

export default function PromptStudioPage() {
  const [selectedMode, setSelectedMode] = useState<Mode>("image_video");
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [variations, setVariations] = useState<Variation[] | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) setHistory(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  const saveToHistory = (entry: HistoryEntry) => {
    setHistory((prev) => {
      const updated = [entry, ...prev].slice(0, MAX_HISTORY);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
  };

  const handleGenerate = async () => {
    if (!userInput.trim()) {
      toast.error("Lütfen bir fikir yaz");
      return;
    }
    setLoading(true);
    setVariations(null);
    try {
      const res = await fetch("/api/prompt-studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userInput, mode: selectedMode }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Üretim başarısız");
      }
      const data = await res.json();
      setVariations(data.variations);
      saveToHistory({
        id: Date.now().toString(),
        mode: selectedMode,
        userInput,
        variations: data.variations,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Kopyalandı!");
    } catch {
      toast.error("Kopyalama başarısız");
    }
  };

  const handleHistoryReuse = (entry: HistoryEntry) => {
    setSelectedMode(entry.mode);
    setUserInput(entry.userInput);
    setVariations(entry.variations);
    textareaRef.current?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const activeMode = MODES_CONFIG.find((m) => m.id === selectedMode)!;

  return (
    <div className="min-h-screen bg-slate-950 p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Prompt Studio</h1>
          <p className="mt-1 text-sm text-slate-400">Ham fikrinden → Hazır İngilizce prompt</p>
        </div>

        {/* Mode Selector */}
        <div className="overflow-x-auto">
          <div className="flex gap-1.5 p-1.5 bg-slate-900 border border-slate-700/60 rounded-xl w-fit">
            {MODES_CONFIG.map((config) => (
              <ModeButton
                key={config.id}
                config={config}
                active={selectedMode === config.id}
                onClick={() => {
                  setSelectedMode(config.id);
                  setVariations(null);
                }}
              />
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="space-y-3">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate();
              }}
              placeholder={`${activeMode.icon} Türkçe fikrini yaz...\n(örn: kırmızı bir spor araba yağmurlu gecede hızla gidiyor)`}
              rows={4}
              maxLength={1000}
              className="w-full rounded-xl border border-slate-700/60 bg-slate-900 px-5 py-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#C8F135]/40 focus:ring-1 focus:ring-[#C8F135]/20 resize-none transition-colors font-mono"
            />
            <div className="absolute bottom-3 right-4 text-xs text-slate-600">
              {userInput.length}/1000
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-600">⌘+Enter ile üret</p>
            <button
              onClick={handleGenerate}
              disabled={loading || !userInput.trim()}
              className="flex items-center gap-2 rounded-xl bg-[#C8F135] px-6 py-2.5 text-sm font-bold text-slate-950 hover:bg-[#d4f54a] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                  Üretiliyor...
                </>
              ) : (
                <>Üret →</>
              )}
            </button>
          </div>
        </div>

        {/* Results */}
        {variations && variations.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-800" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {activeMode.icon} {activeMode.label} — 3 Varyasyon
              </span>
              <div className="h-px flex-1 bg-slate-800" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {variations.map((v, i) => (
                <VariationCard key={i} variation={v} onCopy={handleCopy} />
              ))}
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-800" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Son Üretimler</span>
              <div className="h-px flex-1 bg-slate-800" />
            </div>
            <div className="space-y-2">
              {history.map((entry) => {
                const modeConf = MODES_CONFIG.find((m) => m.id === entry.mode);
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-base flex-shrink-0">{modeConf?.icon}</span>
                      <span className="text-sm text-slate-300 truncate">{entry.userInput}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-slate-600">
                        {new Date(entry.createdAt).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <button
                        onClick={() => handleHistoryReuse(entry)}
                        className="text-xs text-slate-400 hover:text-[#C8F135] transition-colors font-medium whitespace-nowrap"
                      >
                        Tekrar Üret →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
