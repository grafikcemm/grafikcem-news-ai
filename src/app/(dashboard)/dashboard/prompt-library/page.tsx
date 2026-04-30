"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Loader2, ChevronLeft, ChevronRight, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import promptsMetaRaw from "@/data/prompts_meta.json";
import promptsTextsRaw from "@/data/prompts_texts.json";
import { PromptMeta, PromptTexts } from "@/lib/prompt-library/types";
import PromptCard from "@/components/prompt-library/PromptCard";
import PromptModal from "@/components/prompt-library/PromptModal";
import { CATEGORY_CONFIG, ALL_CATEGORIES } from "@/lib/prompt-library/categories";

const promptsMeta = promptsMetaRaw as PromptMeta[];
const promptsTexts = promptsTextsRaw as PromptTexts;

const ITEMS_PER_PAGE = 24;

export default function PromptLibraryPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("Tümü");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptMeta | null>(null);

  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page on category change
  useEffect(() => {
    setCurrentPage(1);
  }, [category]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { "Tümü": promptsMeta.length };
    promptsMeta.forEach(p => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, []);

  const filtered = useMemo(() => {
    return promptsMeta.filter(p => {
      if (category !== "Tümü" && p.category !== category) return false;
      
      if (debouncedSearch) {
        const s = debouncedSearch.toLowerCase();
        return (
          p.title_tr?.toLowerCase().includes(s) ||
          p.title_original?.toLowerCase().includes(s) ||
          p.description_tr?.toLowerCase().includes(s) ||
          p.tags?.some(t => t.toLowerCase().includes(s)) ||
          p.category?.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [category, debouncedSearch]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = useMemo(() => {
    return filtered.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );
  }, [filtered, currentPage]);

  const handleCopy = (id: string, text?: string) => {
    const promptText = text || promptsTexts[id] || "";
    if (!promptText) {
      toast.error("Prompt metni bulunamadı.");
      return;
    }
    navigator.clipboard.writeText(promptText);
    toast.success("Prompt kopyalandı.");
  };

  const handleChatSubmit = async (e?: React.FormEvent, presetMessage?: string) => {
    e?.preventDefault();
    const msg = presetMessage || chatInput;
    if (!msg.trim()) return;

    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch('/api/prompt-library/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
      });
      const data = await res.json();
      if (data.response) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Üzgünüm, yanıt alınamadı.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const renderMessageContent = (content: string) => {
    return content.split('\n').map((line, i) => (
      <span key={i}>
        {line}
        {i !== content.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-base)]">
      {/* TOPBAR */}
      <div className="h-[52px] min-h-[52px] px-6 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm font-medium">
          <Hash size={16} />
          <span>PROMPT KÜTÜPHANESİ</span>
        </div>
        <div className="relative w-[280px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Ara... (seo, instagram, satış...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg pl-9 pr-3 py-1.5 text-sm text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-white/20 transition-colors"
          />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* SOL PANEL (260px) */}
        <div className="w-[260px] border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col p-4 overflow-y-auto custom-scrollbar">
          <div className="text-[9px] uppercase tracking-[0.1em] text-[var(--text-muted)] px-3 py-1 mb-2 font-medium">
            KATEGORİLER
          </div>
          <div className="space-y-0.5">
            {ALL_CATEGORIES.map(cat => {
              const count = categoryCounts[cat] || 0;
              const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG['Diğer'];
              const Icon = config.icon;
              
              if (count === 0 && cat !== 'Tümü') return null;

              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center justify-between",
                    category === cat
                      ? "bg-white text-black font-medium"
                      : "text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={14} className={cn(category === cat ? "text-black" : "text-[var(--text-muted)]")} />
                    <span>{cat}</span>
                  </div>
                  <span className={cn(
                    "text-[10px]",
                    category === cat ? "text-black/60" : "text-[var(--text-muted)]/60"
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* PROMPT KARTLARI */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[var(--bg-base)]">
          {paginated.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-sm">
              Bu kategoride veya arama sonucunda prompt bulunamadı.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
                {paginated.map(prompt => (
                  <PromptCard
                    key={prompt.id}
                    prompt={prompt}
                    onOpen={() => setSelectedPrompt(prompt)}
                    onCopy={() => handleCopy(prompt.id)}
                    isCopied={false}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2 pb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-9 w-9 p-0 rounded-xl border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)]"
                  >
                    <ChevronLeft size={16} />
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      let pageNum = currentPage;
                      if (currentPage <= 3) pageNum = i + 1;
                      else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                      else pageNum = currentPage - 2 + i;

                      if (pageNum <= 0 || pageNum > totalPages) return null;

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={cn(
                            "w-9 h-9 rounded-xl text-xs font-bold font-mono transition-all border",
                            currentPage === pageNum
                              ? "bg-white text-black border-white shadow-lg"
                              : "bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-white hover:border-[var(--border-default)]"
                          )}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    {totalPages > 5 && currentPage < totalPages - 2 && (
                      <span className="px-2 text-[var(--text-muted)]">...</span>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="h-9 w-9 p-0 rounded-xl border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)]"
                  >
                    <ChevronRight size={16} />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ASİSTAN CHAT PANELİ */}
      <div className="h-[280px] min-h-[280px] bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] flex flex-col">
        {/* Header */}
        <div className="px-4 py-2 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-medium">Prompt Asistanı</span>
          <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-elevated)] px-2 py-0.5 rounded">Gemini 3 Flash</span>
        </div>

        {/* Mesaj Alanı */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <span className="text-sm text-[var(--text-muted)]">Hangi konuda prompt arıyorsun?</span>
              <div className="flex gap-2">
                {["Sosyal medya stratejisi", "SEO blog yazısı", "Müşteri itirazlarına yanıt"].map(preset => (
                  <button
                    key={preset}
                    onClick={() => handleChatSubmit(undefined, preset)}
                    className="text-[11px] px-3 py-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-white hover:border-white/20 transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "p-2.5 rounded-lg text-[13px] leading-relaxed w-fit max-w-[85%]",
                  m.role === 'user' 
                    ? "ml-auto bg-[var(--accent-soft)] border border-[var(--accent-border)] text-white max-w-[70%]" 
                    : "bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)] whitespace-pre-wrap"
                )}
              >
                {renderMessageContent(m.content)}
              </div>
            ))
          )}
          {chatLoading && (
            <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] p-2.5 rounded-lg w-fit">
              <Loader2 size={14} className="animate-spin text-[var(--text-muted)]" />
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleChatSubmit} className="p-3 border-t border-[var(--border-subtle)] flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ne tür bir prompta ihtiyacın var?..."
            className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-white/20 transition-colors"
            disabled={chatLoading}
          />
          <button
            type="submit"
            disabled={chatLoading || !chatInput.trim()}
            className="bg-white text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[60px]"
          >
            {chatLoading ? <Loader2 size={16} className="animate-spin" /> : "Sor"}
          </button>
        </form>
      </div>

      {/* Modal */}
      {selectedPrompt && (
        <PromptModal
          prompt={selectedPrompt}
          promptText={promptsTexts[selectedPrompt.id] || ""}
          onClose={() => setSelectedPrompt(null)}
          onCopy={() => handleCopy(selectedPrompt.id)}
          isCopied={false}
        />
      )}
    </div>
  );
}
