"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PromptMeta } from '@/lib/prompt-library/types';
import { CATEGORY_CONFIG } from '@/lib/prompt-library/categories';

interface PromptModalProps {
  prompt: PromptMeta | null;
  promptText: string;
  onClose: () => void;
  onCopy: () => void;
  isCopied: boolean;
}

export default function PromptModal({ prompt, promptText, onClose, onCopy, isCopied }: PromptModalProps) {
  const router = useRouter();

  // ESC ile kapat
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Body scroll kilitle
  useEffect(() => {
    if (prompt) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [prompt]);

  if (prompt === null) return null;

  const catConfig = CATEGORY_CONFIG[prompt.category];

  return (
    <div
      className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#111111] border border-[#333333] rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Üst satır */}
        <div className="flex justify-between items-center">
          <span
            className="inline-flex px-2 py-0.5 rounded text-xs"
            style={{
              color: catConfig?.color || '#6B7280',
              backgroundColor: catConfig?.bg || 'rgba(107,114,128,0.15)',
            }}
          >
            {catConfig?.label || prompt.category}
          </span>
          <button
            onClick={onClose}
            className="text-[#888] hover:text-white text-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Başlık bloğu */}
        <div>
          <h2 className="text-[#F5F5F0] text-xl font-semibold">{prompt.title_tr}</h2>
          <p className="text-[#555] text-xs mt-1">{prompt.title_original}</p>
        </div>

        {/* Meta satırı */}
        <div className="flex gap-4 text-xs text-[#888]">
          <span>★ {prompt.quality_score}/10</span>
          <span>👤 @{prompt.author}</span>
          {prompt.votes > 0 && <span>{prompt.votes} oy</span>}
        </div>

        {/* Açıklama */}
        <div>
          <p className="text-xs font-medium text-[#C8F135] mb-1">Açıklama</p>
          <p className="text-sm text-[#CCCCCC]">{prompt.description_tr}</p>
        </div>

        {/* Kullanım senaryosu */}
        <div>
          <p className="text-xs font-medium text-[#C8F135] mb-1">Ne Zaman Kullanılır?</p>
          <p className="text-sm text-[#CCCCCC]">{prompt.use_case_tr}</p>
        </div>

        {/* Etiketler */}
        <div className="flex flex-wrap gap-2">
          {prompt.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded text-[10px] bg-white/5 border border-white/10 text-[#888888]"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Ayırıcı */}
        <hr className="border-[#222]" />

        {/* Prompt metni */}
        <div>
          <p className="text-xs font-medium text-[#C8F135] mb-2">Prompt Metni</p>
          <div className="bg-[#0A0A0A] border border-[#222] rounded-md p-4 font-mono text-xs text-[#F5F5F0] whitespace-pre-wrap max-h-64 overflow-y-auto leading-relaxed">
            {promptText || 'Prompt metni yüklenemedi.'}
          </div>
        </div>

        {/* Alt butonlar */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onCopy}
            className={`px-4 py-2 rounded text-sm font-medium transition ${
              isCopied
                ? 'bg-[#22C55E] text-white'
                : 'bg-[#C8F135] text-black hover:opacity-90'
            }`}
          >
            {isCopied ? '✅ Kopyalandı!' : '📋 Kopyala'}
          </button>
          <button
            onClick={() => {
              localStorage.setItem(
                'promptStudioPreload',
                JSON.stringify({
                  text: promptText,
                  source: prompt.title_tr,
                })
              );
              router.push('/dashboard/prompt-studio');
              onClose();
            }}
            className="border border-[#333] text-[#F5F5F0] px-4 py-2 rounded text-sm hover:border-[#C8F135] transition-colors"
          >
            ✨ Prompt Studio&apos;da Kullan
          </button>
        </div>
      </div>
    </div>
  );
}
