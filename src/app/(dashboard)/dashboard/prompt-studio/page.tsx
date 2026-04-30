"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { Mode, Variation, HistoryEntry, ModeConfig } from "@/lib/prompt-studio/types";
import { MODES_CONFIG } from "@/lib/prompt-studio/modes.config";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { 
  Sparkles, 
  Image as ImageIcon, 
  Type, 
  Copy, 
  Save, 
  History, 
  Search, 
  Trash2, 
  ChevronRight, 
  RefreshCw,
  LoaderCircle,
  FileJson,
  Layout
} from "lucide-react";
import { Button } from "@/components/ui/button";

const HISTORY_KEY = "prompt_studio_history";
const MAX_HISTORY = 20;

export default function PromptStudioPage() {
  const [activeTab, setActiveTab] = useState<"text" | "image">( "text");
  const [selectedMode, setSelectedMode] = useState<Mode>("image_video");
  const [selectedAiModel, setSelectedAiModel] = useState("Genel");
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  
  // Image state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveText, setSaveText] = useState("");
  const [saveData, setSaveData] = useState({ title: "", titleTr: "", category: "Midjourney", rating: 8 });
  const [saving, setSaving] = useState(false);
  
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
    setResult(null);
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
      setResult(data.result);
      saveToHistory({
        id: Date.now().toString(),
        mode: selectedMode,
        userInput,
        variations: [data.result],
        createdAt: new Date().toISOString(),
      });
      toast.success("Prompt hazır.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeImage = async () => {
    if (!imagePreview) {
      toast.error("Lütfen bir görsel seçin");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/prompt-studio/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          imageBase64: imagePreview,
          mimeType: imageFile?.type 
        }),
      });
      if (!res.ok) throw new Error("Görsel analizi başarısız oldu");
      const data = await res.json();
      setResult(data.analysis);
      saveToHistory({
        id: Date.now().toString(),
        mode: "image_video",
        userInput: "Görsel analizi",
        variations: [data.analysis],
        createdAt: new Date().toISOString(),
      });
      toast.success("Görsel analiz edildi.");
    } catch (err) {
       toast.error(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
       setLoading(false);
    }
  };

  const handleSaveToLibrary = async () => {
    if (!saveData.titleTr) return toast.error("Türkçe başlık zorunludur.");
    setSaving(true);
    try {
      const { error } = await supabase.from("prompts").insert({
        title_original: saveData.title || saveData.titleTr,
        title_tr: saveData.titleTr,
        description_tr: "Prompt Studio'dan eklendi",
        category: saveData.category,
        quality_score: saveData.rating,
        prompt_text: saveText,
        use_count: 0,
      });
      if (error) throw error;
      toast.success("Kütüphaneye kaydedildi!");
      setSaveModalOpen(false);
      setSaveData({ title: "", titleTr: "", category: "Midjourney", rating: 8 });
    } catch {
      toast.error("Kaydetme başarısız oldu.");
    } finally {
      setSaving(false);
    }
  };

  const activeMode = MODES_CONFIG.find((m) => m.id === selectedMode)!;

  return (
    <div className="flex h-[calc(100vh-52px)] overflow-hidden bg-[var(--bg-base)]">
      {/* LEFT PANEL */}
      <div className="w-1/2 flex flex-col border-r border-[var(--border-subtle)]">
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Prompt Studio</h1>
              <p className="text-sm text-[var(--text-secondary)]">AI görsel & video mühendisliği</p>
            </div>
            <div className="flex bg-[var(--bg-elevated)] p-1 rounded-lg border border-[var(--border-subtle)]">
              <button 
                onClick={() => setActiveTab("text")}
                className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all", activeTab === "text" ? "bg-[var(--bg-surface)] text-white" : "text-[var(--text-muted)]")}
              >
                Fikirden
              </button>
              <button 
                onClick={() => setActiveTab("image")}
                className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all", activeTab === "image" ? "bg-[var(--bg-surface)] text-white" : "text-[var(--text-muted)]")}
              >
                Görselden
              </button>
            </div>
          </div>

          {activeTab === "text" ? (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)]">AI Modeli</label>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {["Midjourney", "Sora", "Kling", "DALL-E", "Ideogram", "Genel"].map((m) => (
                    <button
                      key={m}
                      onClick={() => setSelectedAiModel(m)}
                      className={cn(
                        "px-3 py-2 rounded-xl border text-[11px] font-medium transition-all",
                        selectedAiModel === m 
                          ? "bg-[var(--bg-active)] border-[var(--accent)] text-white" 
                          : "bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)]">Fikrin (Türkçe)</label>
                <div className="relative group">
                  <textarea
                    ref={textareaRef}
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Örn: Cyberpunk bir İstanbul sokak manzarası, yağmurlu..."
                    className="w-full h-40 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-2xl p-4 text-sm text-white placeholder-[var(--text-muted)] focus:border-[var(--border-strong)] outline-none resize-none leading-relaxed transition-all"
                  />
                  <div className="absolute bottom-3 right-4 text-[10px] font-mono text-[var(--text-muted)]">
                    {userInput.length}/1000
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)]">Görsel Yükle</label>
                <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-[var(--border-default)] rounded-2xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-active)] hover:border-[var(--border-strong)] transition-all cursor-pointer relative overflow-hidden group">
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setImageFile(file);
                      const reader = new FileReader();
                      reader.onloadend = () => setImagePreview(reader.result as string);
                      reader.readAsDataURL(file);
                    }
                  }} />
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="absolute inset-0 w-full h-full object-contain" />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <ImageIcon className="w-8 h-8 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-all" />
                      <p className="text-xs text-[var(--text-muted)]">Tıkla veya sürükle</p>
                    </div>
                  )}
                </label>
              </div>
            </div>
          )}

          {/* History Section (Collapsible in sidebar or small area) */}
          <div className="space-y-4 pt-4">
            <h2 className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
              <History size={12} />
              Geçmiş ({history.length})
            </h2>
            <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-2">
              {history.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => {
                    setUserInput(entry.userInput);
                    setResult(entry.variations?.[0]);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-all text-left"
                >
                  <span className="text-[11px] text-[var(--text-secondary)] truncate flex-1 pr-4">{entry.userInput}</span>
                  <ChevronRight size={12} className="text-[var(--text-muted)]" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Generate Footer */}
        <div className="p-6 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <Button
            onClick={activeTab === "text" ? handleGenerate : handleAnalyzeImage}
            disabled={loading || (activeTab === "text" ? !userInput.trim() : !imagePreview)}
            className="w-full h-12 text-base font-semibold bg-[var(--accent)] text-black hover:opacity-90 transition-all rounded-xl"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <LoaderCircle className="w-5 h-5 animate-spin" />
                {activeTab === "text" ? "Üretiliyor..." : "Analiz Ediliyor..."}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                {activeTab === "text" ? "Prompt Mühendisliği Yap" : "Görseli Prompt'a Dönüştür"}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-1/2 overflow-y-auto p-6 bg-[var(--bg-surface)] custom-scrollbar">
        {!result && !loading ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
            <div className="p-4 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
              <Layout className="w-8 h-8" />
            </div>
            <div>
              <p className="text-lg font-medium">Hazır prompt burada görünecek</p>
              <p className="text-sm">Parametreler, negatif prompt ve teknik detaylar.</p>
            </div>
          </div>
        ) : result ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Main Result Card */}
            <div className="p-6 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                  <span className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Engineered Prompt</span>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2" onClick={() => {
                  navigator.clipboard.writeText(result.prompt);
                  toast.success("Kopyalandı.");
                }}>
                  <Copy size={12} className="mr-1" /> KOPYALA
                </Button>
              </div>
              
              <div className="p-4 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)]">
                <p className="text-base text-white font-mono leading-relaxed break-words">{result.prompt}</p>
              </div>

              {result.negative_prompt && (
                <div className="space-y-2">
                  <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest">Negative Prompt</p>
                  <div className="p-3 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] opacity-60">
                    <p className="text-xs text-[var(--text-secondary)] font-mono leading-relaxed">{result.negative_prompt}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[var(--border-subtle)]">
                {[
                  { label: "STYLE", value: result.style },
                  { label: "ASPECT", value: result.aspect_ratio },
                  { label: "LIGHT", value: result.lighting },
                  { label: "CAMERA", value: result.camera },
                ].map((chip) => (
                  <div key={chip.label} className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                    <p className="text-[9px] text-[var(--text-muted)] font-mono uppercase">{chip.label}</p>
                    <p className="text-[11px] text-white font-medium truncate">{chip.value || "Default"}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button className="flex-1 bg-[var(--accent)] text-black" onClick={() => {
                  setSaveText(result.prompt);
                  setSaveModalOpen(true);
                }}>
                  <Save size={16} className="mr-2" />
                  Kütüphaneye Kaydet
                </Button>
                <Button variant="outline" className="border-[var(--border-default)]" onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(result, null, 2));
                  toast.success("JSON kopyalandı.");
                }}>
                  <FileJson size={16} />
                </Button>
              </div>
            </div>

            {/* Model Suggestion */}
            <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
              <p className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest mb-1">Model Suggestion</p>
              <p className="text-sm text-emerald-100/70">{result.model_suggestion || "Midjourney v6 or Ideogram 2.0"}</p>
            </div>
          </div>
        ) : loading ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
             <div className="w-12 h-12 border-4 border-[var(--border-subtle)] border-t-[var(--accent)] rounded-full animate-spin" />
             <p className="text-sm text-[var(--text-secondary)] font-medium">Prompt motoru analiz ediyor...</p>
          </div>
        ) : null}
      </div>

      <Dialog open={saveModalOpen} onOpenChange={setSaveModalOpen}>
        <DialogContent className="bg-[var(--bg-surface)] border-[var(--border-subtle)] text-white">
          <DialogHeader>
            <DialogTitle>Kütüphaneye Kaydet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-[var(--text-muted)] uppercase">Türkçe Başlık</label>
              <input
                type="text"
                value={saveData.titleTr}
                onChange={(e) => setSaveData({ ...saveData, titleTr: e.target.value })}
                className="w-full h-10 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 text-sm focus:border-[var(--border-strong)] outline-none"
                placeholder="Örn: Sinematik Cyberpunk İstanbul"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-[var(--text-muted)] uppercase">Kategori</label>
                <select
                  value={saveData.category}
                  onChange={(e) => setSaveData({ ...saveData, category: e.target.value })}
                  className="w-full h-10 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-2 text-sm outline-none"
                >
                  {["Midjourney", "Sora", "Genel", "Kling", "Ideogram"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-[var(--text-muted)] uppercase">Kalite (1-10)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={saveData.rating}
                  onChange={(e) => setSaveData({ ...saveData, rating: parseInt(e.target.value) })}
                  className="w-full h-10 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 text-sm outline-none"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveModalOpen(false)}>İptal</Button>
            <Button className="bg-[var(--accent)] text-black" onClick={handleSaveToLibrary} disabled={saving}>
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
