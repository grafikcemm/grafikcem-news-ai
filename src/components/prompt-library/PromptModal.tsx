"use client";

import { useEffect, useState } from 'react';
import { PromptMeta } from '@/lib/prompt-library/types';
import { CATEGORY_CONFIG } from '@/lib/prompt-library/categories';
import { X, Copy, Check, Info, Target, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface PromptModalProps {
  prompt: PromptMeta | null;
  promptText: string;
  onClose: () => void;
  onCopy: () => void;
  isCopied: boolean;
}

export default function PromptModal({ prompt, promptText, onClose, onCopy, isCopied: externalIsCopied }: PromptModalProps) {
  const [internalIsCopied, setInternalIsCopied] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    if (prompt) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [prompt]);

  if (prompt === null) return null;

  const catConfig = CATEGORY_CONFIG[prompt.category] || CATEGORY_CONFIG['Diğer'];
  const isCopied = externalIsCopied || internalIsCopied;

  const handleCopy = () => {
    onCopy();
    setInternalIsCopied(true);
    setTimeout(() => setInternalIsCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-8 py-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase tracking-wider"
              style={{
                color: catConfig.color,
                backgroundColor: catConfig.bg,
                border: `1px solid ${catConfig.color}20`
              }}
            >
              {prompt.category}
            </span>
            <div className="flex gap-1">
              {prompt.tags.slice(0, 3).map(tag => (
                <span key={tag} className="text-[10px] font-medium text-[var(--text-muted)]">#{tag}</span>
              ))}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-muted)] hover:text-white transition-all border border-transparent hover:border-[var(--border-subtle)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
          {/* Title & Description */}
          <div className="space-y-4">
            <h2 className="text-2xl font-black tracking-tight text-white leading-tight">
              {prompt.title_tr}
            </h2>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-[var(--bg-elevated)] border border-white/5">
              <Info size={16} className="text-[var(--accent)] mt-0.5 flex-shrink-0" />
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {prompt.description_tr}
              </p>
            </div>
          </div>

          {/* Use Case */}
          {prompt.use_case_tr && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[11px] font-bold font-mono text-[var(--text-muted)] uppercase tracking-widest">
                <Target size={12} className="text-[var(--accent)]" />
                NE ZAMAN KULLANILIR?
              </div>
              <p className="text-sm text-[var(--text-secondary)]">
                {prompt.use_case_tr}
              </p>
            </div>
          )}

          {/* Prompt Content */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] font-bold font-mono text-[var(--text-muted)] uppercase tracking-widest">
                <Zap size={12} className="text-[var(--accent)]" />
                PROMPT METNİ
              </div>
            </div>
            <div className="relative group">
              <div className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-xl p-6 font-mono text-[13px] text-stone-100 whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed selection:bg-[var(--accent)]/30">
                {promptText || 'Prompt metni yüklenemedi.'}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-white/5 bg-[var(--bg-base)]/50">
          <button
            onClick={handleCopy}
            className={cn(
              "w-full h-12 rounded-xl flex items-center justify-center gap-3 text-sm font-bold tracking-tight transition-all",
              isCopied
                ? "bg-green-500 text-white shadow-lg shadow-green-500/10"
                : "bg-[var(--accent)] text-black hover:opacity-90 shadow-lg shadow-[var(--accent)]/10"
            )}
          >
            {isCopied ? <Check size={18} /> : <Copy size={18} />}
            {isCopied ? 'PROMPT KOPYALANDI ✓' : 'PROMPT METNİ KOPYALA'}
          </button>
        </div>
      </div>
    </div>
  );
}
