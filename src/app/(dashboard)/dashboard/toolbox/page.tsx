"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Loader2, Star, Send } from "lucide-react";
import { TOOLBOX_FALLBACK } from "@/lib/toolbox-data";
import { cn } from "@/lib/utils";

interface Resource {
  id: string;
  name: string;
  url: string;
  description: string;
  category: string;
  subcategory: string;
  tags: string[];
  is_favorite: boolean;
}

type CategoryItem = { name: string; cat?: string; subcat?: string; isSub?: boolean };

const CATEGORY_GROUPS: { title: string; items: CategoryItem[] }[] = [
  { title: "GENEL", items: [{ name: "Tümü" }] },
  { title: "TASARIM", items: [{ name: "Tasarım" }, { name: "UI/UX" }, { name: "İlham" }] },
  { title: "MEDYA & ARAÇLAR", items: [{ name: "Medya" }, { name: "Araçlar" }, { name: "Yapay Zeka" }] },
  { title: "İÇERİK", items: [{ name: "İçerik" }, { name: "Rakip Takip" }] },
  { title: "GELİŞİM", items: [
      { name: "Kişisel Gelişim", cat: "Kişisel Gelişim" },
      { name: "Yapay Zeka Kursları", cat: "Kişisel Gelişim", subcat: "Yapay Zeka Kursları", isSub: true }
    ] 
  },
  { title: "PORTFOLYO", items: [{ name: "Behance TR" }, { name: "Behance INT" }] }
];

export default function ToolboxPage() {
  const [allResources, setAllResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("Tümü");
  const [subcategory, setSubcategory] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch ALL resources once
  useEffect(() => {
    const fetchResources = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/toolbox/resources`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setAllResources(data);
      } catch (err) {
        console.error("Error fetching toolbox resources, using fallback", err);
        const fallback = TOOLBOX_FALLBACK.map((r, i) => ({ ...r, id: `fb-${i}`, is_favorite: false } as Resource));
        setAllResources(fallback);
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, []);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { "Tümü": allResources.length };
    allResources.forEach(r => {
      counts[r.category] = (counts[r.category] || 0) + 1;
      if (r.subcategory) {
        counts[`${r.category}-${r.subcategory}`] = (counts[`${r.category}-${r.subcategory}`] || 0) + 1;
      }
    });
    return counts;
  }, [allResources]);

  const resources = useMemo(() => {
    return allResources.filter(r => {
      if (category !== "Tümü" && r.category !== category) return false;
      if (subcategory && r.subcategory !== subcategory) return false;
      if (favoritesOnly && !r.is_favorite) return false;
      
      if (debouncedSearch) {
        const s = debouncedSearch.toLowerCase();
        return (
          r.name.toLowerCase().includes(s) ||
          (r.description && r.description.toLowerCase().includes(s)) ||
          (r.subcategory && r.subcategory.toLowerCase().includes(s)) ||
          r.category.toLowerCase().includes(s) ||
          (r.tags && r.tags.some(t => t.toLowerCase().includes(s)))
        );
      }
      return true;
    });
  }, [allResources, category, favoritesOnly, debouncedSearch]);

  const toggleFavorite = async (e: React.MouseEvent, id: string, currentFav: boolean) => {
    e.stopPropagation();
    
    // Optimistic update
    setAllResources(prev => prev.map(r => r.id === id ? { ...r, is_favorite: !currentFav } : r));

    try {
      await fetch('/api/toolbox/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_favorite: !currentFav })
      });
    } catch (err) {
      console.error("Failed to update favorite", err);
      // Revert on error
      setAllResources(prev => prev.map(r => r.id === id ? { ...r, is_favorite: currentFav } : r));
    }
  };

  const handleChatSubmit = async (e?: React.FormEvent, presetMessage?: string) => {
    e?.preventDefault();
    const msg = presetMessage || chatInput;
    if (!msg.trim()) return;

    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch('/api/toolbox/chat', {
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
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);
    
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-[var(--info)] hover:underline break-all">{part}</a>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-base)]">
      {/* TOPBAR */}
      <div className="h-[52px] min-h-[52px] px-6 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm font-medium">
          <span>TOOLBOX</span>
        </div>
        <div className="relative w-[280px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Ara... (mockup, font, ses...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg pl-9 pr-3 py-1.5 text-sm text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-white/20 transition-colors"
          />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* SOL PANEL (260px) */}
        <div className="w-[260px] border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col p-4 overflow-y-auto custom-scrollbar">
          <div className="space-y-4 mb-6">
            {CATEGORY_GROUPS.map((group, groupIdx) => (
              <div key={groupIdx}>
                <div 
                  className="text-[9px] uppercase tracking-[0.1em] text-[var(--text-muted)] px-3 py-1 mb-1 font-medium"
                  style={{ letterSpacing: '0.1em' }}
                >
                  {group.title}
                </div>
                <div className="space-y-0.5">
                  {group.items.map(item => {
                    const isActive = category === (item.cat || item.name) && subcategory === (item.subcat || "");
                    const countKey = item.subcat ? `${item.cat}-${item.subcat}` : (item.cat || item.name);
                    const count = categoryCounts[countKey] || 0;

                    return (
                      <button
                        key={item.name}
                        onClick={() => {
                          setCategory(item.cat || item.name);
                          setSubcategory(item.subcat || "");
                        }}
                        className={cn(
                          "w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center justify-between",
                          isActive
                            ? "bg-white text-black font-medium"
                            : "text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-white",
                          item.isSub && "ml-4 text-xs w-[calc(100%-1rem)]"
                        )}
                      >
                        <span className={cn(item.isSub && "text-[var(--text-muted)] flex items-center gap-2")}>
                          {item.isSub && <span className="w-1 h-1 rounded-full bg-[var(--text-muted)]" />}
                          {item.name}
                        </span>
                        <span className={cn(
                          "text-[10px]",
                          isActive ? "text-black/60" : "text-[var(--text-muted)]/60"
                        )}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="h-px bg-[var(--border-subtle)] my-2 w-full" />

          <label className="flex items-center justify-between cursor-pointer px-3 py-2 rounded-lg hover:bg-[var(--bg-elevated)]">
            <span className="text-sm text-[var(--text-muted)]">Sadece Favoriler</span>
            <div className={cn(
              "w-8 h-4 rounded-full relative transition-colors duration-200",
              favoritesOnly ? "bg-white" : "bg-[var(--bg-elevated)] border border-[var(--border-subtle)]"
            )}>
              <div className={cn(
                "absolute top-0.5 left-0.5 w-3 h-3 rounded-full transition-transform duration-200",
                favoritesOnly ? "bg-black translate-x-4" : "bg-[var(--text-muted)]"
              )} />
            </div>
            <input 
              type="checkbox" 
              className="sr-only" 
              checked={favoritesOnly} 
              onChange={(e) => setFavoritesOnly(e.target.checked)} 
            />
          </label>
        </div>

        {/* KAYNAK KARTLARI */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-[var(--bg-base)]">
          {loading ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-[10px]">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-[100px] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : resources.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-sm">
              Bu kategoride veya arama sonucunda kaynak bulunamadı.
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-[10px]">
              {resources.map(resource => {
                const domain = new URL(resource.url).hostname;
                const isBehance = resource.category?.startsWith('Behance');
                const isInstagram = resource.category === 'Rakip Takip';
                const isAIKurs = resource.subcategory === 'Yapay Zeka Kursları';

                return (
                  <div
                    key={resource.id}
                    onClick={() => window.open(resource.url, '_blank')}
                    className={cn(
                      "group bg-[var(--bg-elevated)] rounded-lg p-3 hover:bg-[var(--bg-hover)] transition-all duration-150 cursor-pointer flex flex-col h-[100px]",
                      isBehance 
                        ? "border-l-[2px] border-l-[var(--border-strong)] border-y border-r border-[var(--border-subtle)] hover:border-y-[var(--border-strong)] hover:border-r-[var(--border-strong)]" 
                        : isAIKurs
                        ? "border-l-[2px] border-l-[#60a5fa] border-y border-r border-[var(--border-subtle)] hover:border-y-[#60a5fa]/50 hover:border-r-[#60a5fa]/50"
                        : "border border-[var(--border-subtle)] hover:border-[var(--border-strong)]"
                    )}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <img 
                          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
                          alt=""
                          className="w-4 h-4 rounded-sm flex-shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                        <span className="font-bold text-[13px] text-white truncate">{resource.name}</span>
                      </div>
                      <button
                        onClick={(e) => toggleFavorite(e, resource.id, resource.is_favorite)}
                        className="text-white/40 hover:text-white transition-colors flex-shrink-0 ml-2"
                      >
                        <Star size={14} className={cn(resource.is_favorite && "fill-white text-white")} />
                      </button>
                    </div>
                    
                    <div className="text-[10px] text-[var(--text-muted)] mb-1 tracking-wider truncate">
                      {resource.subcategory || resource.category}
                    </div>
                    
                    <div className="text-[12px] text-[var(--text-muted)] line-clamp-2 mb-auto leading-relaxed">
                      {resource.description}
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--border-subtle)]">
                      <div className="flex gap-1 overflow-hidden">
                        {isAIKurs && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-400/10 text-blue-400 truncate border border-blue-400/20">
                            #kurs
                          </span>
                        )}
                        {isInstagram && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--info)]/10 text-[var(--info)] truncate">
                            #instagram
                          </span>
                        )}
                        {resource.tags?.filter(t => (!isInstagram || t.toLowerCase() !== 'instagram') && (!isAIKurs || t.toLowerCase() !== 'kurs')).slice(0, isInstagram || isAIKurs ? 2 : 3).map(tag => (
                          <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-black/30 text-[var(--text-muted)] truncate">
                            #{tag}
                          </span>
                        ))}
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)] group-hover:text-white transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0">
                        ↗ Aç
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ASİSTAN CHAT PANELİ */}
      <div className="h-[280px] min-h-[280px] bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] flex flex-col">
        {/* Header */}
        <div className="px-4 py-2 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-medium">Toolbox Asistanı</span>
          <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-elevated)] px-2 py-0.5 rounded">Gemini 3 Flash</span>
        </div>

        {/* Mesaj Alanı */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <span className="text-sm text-[var(--text-muted)]">Ne arıyorsun? (örn: ücretsiz mockup, ses efekti, font önerisi...)</span>
              <div className="flex gap-2">
                {["Logo referansı", "Ücretsiz fotoğraf", "AI video aracı"].map(preset => (
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
                {m.role === 'user' ? m.content : renderMessageContent(m.content)}
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
            placeholder="Bir şey ara veya sor..."
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
    </div>
  );
}
