"use client";

import { useState, useMemo, useCallback } from 'react';
import promptsMetaRaw from '@/data/prompts_meta.json';
import promptsTextsRaw from '@/data/prompts_texts.json';
import { PromptMeta, PromptTexts, SortOption, QualityFilter } from '@/lib/prompt-library/types';
import { CATEGORY_CONFIG, ALL_CATEGORIES } from '@/lib/prompt-library/categories';
import PromptCard from '@/components/prompt-library/PromptCard';
import PromptModal from '@/components/prompt-library/PromptModal';

const promptsMeta = promptsMetaRaw as PromptMeta[];
const promptsTexts = promptsTextsRaw as PromptTexts;

const ITEMS_PER_PAGE = 24;

export default function PromptLibraryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const [qualityFilter, setQualityFilter] = useState<QualityFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('default');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptMeta | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Helper to reset page when filters change
  const resetPage = useCallback(() => setCurrentPage(1), []);

  // Wrapped setters that also reset page
  const updateSearch = useCallback((val: string) => { setSearchQuery(val); resetPage(); }, [resetPage]);
  const updateCategory = useCallback((val: string) => { setSelectedCategory(val); resetPage(); }, [resetPage]);
  const updateQuality = useCallback((val: QualityFilter) => { setQualityFilter(val); resetPage(); }, [resetPage]);
  const updateSort = useCallback((val: SortOption) => { setSortOption(val); resetPage(); }, [resetPage]);

  // Filtreleme
  const filteredPrompts = useMemo(() => {
    let result = [...promptsMeta];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title_tr.toLowerCase().includes(q) ||
          p.description_tr.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)) ||
          p.author.toLowerCase().includes(q)
      );
    }

    if (selectedCategory !== 'Tümü') {
      result = result.filter((p) => p.category === selectedCategory);
    }

    if (qualityFilter === '7plus') result = result.filter((p) => p.quality_score >= 7);
    if (qualityFilter === '8plus') result = result.filter((p) => p.quality_score >= 8);

    if (sortOption === 'az') result.sort((a, b) => a.title_tr.localeCompare(b.title_tr, 'tr'));
    if (sortOption === 'quality') result.sort((a, b) => b.quality_score - a.quality_score);
    if (sortOption === 'votes') result.sort((a, b) => b.votes - a.votes);

    return result;
  }, [searchQuery, selectedCategory, qualityFilter, sortOption]);

  const totalPages = Math.ceil(filteredPrompts.length / ITEMS_PER_PAGE);
  const paginatedPrompts = filteredPrompts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Kopyala fonksiyonu
  const handleCopy = (prompt: PromptMeta) => {
    const text = promptsTexts[prompt.id] || '';
    navigator.clipboard.writeText(text);
    setCopiedId(prompt.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Kategori sayıları
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { 'Tümü': promptsMeta.length };
    promptsMeta.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, []);

  return (
    <>
      <div className="p-6 space-y-6">
        {/* HEADER */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#F5F5F0]">
              Prompt Kütüphanesi
            </h1>
            <p className="text-[#888] text-sm mt-1">
              450 kurasyonlu prompt — kopyala, kullan
            </p>
          </div>
          <span className="bg-[#C8F135]/10 text-[#C8F135] border border-[#C8F135]/20 px-3 py-1 rounded-full text-sm font-medium">
            {filteredPrompts.length} prompt
          </span>
        </div>

        {/* FİLTRE BARI */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          {/* Sıralama */}
          <div className="flex gap-2">
            {(['default', 'az', 'quality', 'votes'] as SortOption[]).map((opt) => (
              <button
                key={opt}
                onClick={() => updateSort(opt)}
                className={`px-3 py-1.5 rounded text-xs border transition-colors ${
                  sortOption === opt
                    ? 'border-[#C8F135] text-[#C8F135] bg-[#C8F135]/10'
                    : 'border-[#333] text-[#888] hover:border-[#555]'
                }`}
              >
                {{ default: 'Varsayılan', az: 'A-Z', quality: 'Kalite ↓', votes: 'Oy ↓' }[opt]}
              </button>
            ))}
          </div>

          {/* Kalite Filtresi */}
          <div className="flex gap-1">
            {(['all', '7plus', '8plus'] as QualityFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => updateQuality(f)}
                className={`px-3 py-1.5 rounded text-xs transition-colors ${
                  qualityFilter === f
                    ? 'bg-[#C8F135] text-black font-medium'
                    : 'bg-[#1A1A1A] text-[#888] hover:bg-[#222]'
                }`}
              >
                {{ all: 'Tümü', '7plus': '7+', '8plus': '8+' }[f]}
              </button>
            ))}
          </div>

          {/* Arama */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => updateSearch(e.target.value)}
            placeholder="Başlık, açıklama veya etiket ara..."
            className="bg-[#111] border border-[#333] rounded-lg px-3 py-1.5 text-sm text-[#F5F5F0] placeholder-[#555] focus:outline-none focus:border-[#C8F135] w-72 transition-colors"
          />
        </div>

        {/* KATEGORİ CHİPLERİ */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {ALL_CATEGORIES.map((cat) => {
            const config = CATEGORY_CONFIG[cat];
            const isActive = selectedCategory === cat;
            const count = categoryCounts[cat] || 0;
            return (
              <button
                key={cat}
                onClick={() => updateCategory(cat)}
                className="whitespace-nowrap px-3 py-1.5 rounded-full text-xs border transition-all duration-200 shrink-0"
                style={{
                  borderColor: isActive ? (config?.color || '#C8F135') : '#333',
                  backgroundColor: isActive ? (config?.bg || 'rgba(200,241,53,0.1)') : 'transparent',
                  color: isActive ? (config?.color || '#C8F135') : '#888',
                }}
              >
                {cat === 'Tümü' ? `Tümü (${count})` : `${config?.label || cat} (${count})`}
              </button>
            );
          })}
        </div>

        {/* SONUÇ SAYACI */}
        <p className="text-xs text-[#555]">
          {filteredPrompts.length === promptsMeta.length
            ? `${promptsMeta.length} prompt`
            : `${filteredPrompts.length} sonuç (${promptsMeta.length} prompttan filtrelendi)`}
        </p>

        {/* GRID */}
        {paginatedPrompts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paginatedPrompts.map((prompt) => (
              <PromptCard
                key={prompt.id}
                prompt={prompt}
                onOpen={() => setSelectedPrompt(prompt)}
                onCopy={() => handleCopy(prompt)}
                isCopied={copiedId === prompt.id}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-[#555] text-sm">
              &ldquo;{searchQuery}&rdquo; için sonuç bulunamadı.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('Tümü');
                setQualityFilter('all');
                setSortOption('default');
                setCurrentPage(1);
              }}
              className="mt-3 text-[#C8F135] text-xs hover:underline"
            >
              Filtreleri temizle
            </button>
          </div>
        )}

        {/* PAGİNASYON */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded border border-[#333] text-[#888] text-xs disabled:opacity-30 hover:border-[#555] transition-colors"
            >
              ← Önceki
            </button>

            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              let page: number;
              if (totalPages <= 7) {
                page = i + 1;
              } else if (currentPage <= 4) {
                page = i + 1;
              } else if (currentPage >= totalPages - 3) {
                page = totalPages - 6 + i;
              } else {
                page = currentPage - 3 + i;
              }
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded text-xs transition-colors ${
                    currentPage === page
                      ? 'bg-[#C8F135] text-black font-medium'
                      : 'border border-[#333] text-[#888] hover:border-[#555]'
                  }`}
                >
                  {page}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded border border-[#333] text-[#888] text-xs disabled:opacity-30 hover:border-[#555] transition-colors"
            >
              Sonraki →
            </button>
          </div>
        )}
      </div>

      {/* MODAL */}
      <PromptModal
        prompt={selectedPrompt}
        promptText={selectedPrompt ? (promptsTexts[selectedPrompt.id] || '') : ''}
        onClose={() => setSelectedPrompt(null)}
        onCopy={() => selectedPrompt && handleCopy(selectedPrompt)}
        isCopied={copiedId === selectedPrompt?.id}
      />
    </>
  );
}
