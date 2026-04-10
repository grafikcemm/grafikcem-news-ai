"use client";

import { PromptMeta } from '@/lib/prompt-library/types';
import { CATEGORY_CONFIG } from '@/lib/prompt-library/categories';

interface PromptCardProps {
  prompt: PromptMeta;
  onOpen: () => void;
  onCopy: () => void;
  isCopied: boolean;
}

export default function PromptCard({ prompt, onOpen, onCopy, isCopied }: PromptCardProps) {
  const catConfig = CATEGORY_CONFIG[prompt.category];

  const qualityColor =
    prompt.quality_score >= 8
      ? '#22C55E'
      : prompt.quality_score >= 6
        ? '#EAB308'
        : '#6B7280';

  return (
    <div className="bg-[#111111] border border-[#222222] rounded-lg p-4 hover:border-[#C8F135] transition-colors duration-200 flex flex-col gap-3">
      {/* Üst satır */}
      <div className="flex justify-between items-start">
        {/* Kategori badge */}
        <span
          className="inline-flex px-2 py-0.5 rounded text-xs"
          style={{
            color: catConfig?.color || '#6B7280',
            backgroundColor: catConfig?.bg || 'rgba(107,114,128,0.15)',
          }}
        >
          {catConfig?.label || prompt.category}
        </span>

        {/* Kalite badge */}
        <span className="text-xs font-medium" style={{ color: qualityColor }}>
          ★ {prompt.quality_score}/10
        </span>
      </div>

      {/* Başlık */}
      <div>
        <h3 className="text-[#F5F5F0] font-semibold text-sm line-clamp-2">
          {prompt.title_tr || prompt.title_original}
        </h3>
        {prompt.title_tr && prompt.title_original && (
          <p className="text-[#888888] text-[10px] mt-0.5 line-clamp-1">
            {prompt.title_original}
          </p>
        )}
      </div>

      {/* Açıklama */}
      <p className="text-[#888888] text-xs line-clamp-3">
        {prompt.description_tr}
      </p>

      {/* Kullanım senaryosu */}
      <p className="text-[#666666] text-xs italic truncate">
        {prompt.use_case_tr}
      </p>

      {/* Etiketler */}
      <div className="flex flex-wrap gap-1">
        {prompt.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 rounded text-[10px] bg-[var(--surface-elevated)] border border-white/10 text-[#888888]"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Alt satır */}
      <div className="flex justify-between items-center mt-auto">
        <span className="text-[#555] text-xs">@{prompt.author}</span>
        <div className="flex gap-2">
          <button
            onClick={onOpen}
            className="border border-[#333] text-[#F5F5F0] text-xs px-3 py-1 rounded hover:border-[#C8F135] transition-colors"
          >
            Gör
          </button>
          <button
            onClick={onCopy}
            className={`text-xs px-3 py-1 rounded transition ${
              isCopied
                ? 'bg-[#22C55E] text-white'
                : 'bg-[#C8F135] text-black hover:opacity-90'
            }`}
          >
            {isCopied ? '✅ Kopyalandı!' : '📋 Kopyala'}
          </button>
        </div>
      </div>
    </div>
  );
}
