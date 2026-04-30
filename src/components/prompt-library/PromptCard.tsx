"use client";

import { useState } from "react";
import { PromptMeta } from '@/lib/prompt-library/types';
import { CATEGORY_CONFIG } from '@/lib/prompt-library/categories';
import { Eye, Copy, Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface PromptCardProps {
  prompt: PromptMeta;
  onOpen: () => void;
  onCopy: () => void;
  isCopied: boolean;
}

export default function PromptCard({ prompt, onOpen, onCopy, isCopied: externalIsCopied }: PromptCardProps) {
  const [internalIsCopied, setInternalIsCopied] = useState(false);
  const catConfig = CATEGORY_CONFIG[prompt.category] || CATEGORY_CONFIG['Diğer'];

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopy();
    setInternalIsCopied(true);
    setTimeout(() => setInternalIsCopied(false), 2000);
  };

  const isCopied = externalIsCopied || internalIsCopied;

  return (
    <div 
      onClick={onOpen}
      className="group bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-[14px] cursor-pointer hover:border-[var(--border-default)] transition-all flex flex-col h-[220px]"
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <span
            className="px-2 py-0.5 rounded text-[9px] font-bold font-mono uppercase tracking-wider"
            style={{
              color: catConfig.color,
              backgroundColor: catConfig.bg,
              border: `1px solid ${catConfig.color}20`
            }}
          >
            {prompt.category}
          </span>
          {prompt.source === 'grafikcem' && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono uppercase tracking-wider bg-blue-500/10 text-blue-500 border border-blue-500/20">
              YENİ
            </span>
          )}
        </div>

        {prompt.quality_score >= 8 && (
          <div className="flex items-center gap-1 text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">
            <Sparkles size={8} />
            <span className="text-[9px] font-bold font-mono">{prompt.quality_score}</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 space-y-2">
        <h3 className="text-[13px] font-bold text-white group-hover:text-[var(--accent)] transition-colors line-clamp-1">
          {prompt.title_tr}
        </h3>
        <p className="text-[12px] text-[var(--text-muted)] leading-relaxed line-clamp-2">
          {prompt.description_tr}
        </p>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-4">
        {prompt.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-[var(--bg-surface)] border border-white/5 text-[var(--text-muted)]"
          >
            #{tag}
          </span>
        ))}
      </div>

      {/* Footer / Buttons */}
      <div className="flex gap-2 pt-3 border-t border-white/5">
        <button
          onClick={(e) => { e.stopPropagation(); onOpen(); }}
          className="flex-1 flex items-center justify-center gap-1.5 h-8 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg text-[10px] font-bold font-mono text-[var(--text-muted)] hover:text-white hover:border-[var(--border-default)] transition-all"
        >
          <Eye size={12} />
          GÖRÜNTÜLE
        </button>
        <button
          onClick={handleCopy}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg text-[10px] font-bold font-mono transition-all",
            isCopied
              ? "bg-green-500 text-white"
              : "bg-[var(--accent)] text-black hover:opacity-90"
          )}
        >
          {isCopied ? <Check size={12} /> : <Copy size={12} />}
          {isCopied ? 'KOPYALANDI ✓' : 'KOPYALA'}
        </button>
      </div>
    </div>
  );
}
