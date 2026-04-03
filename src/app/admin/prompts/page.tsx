"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface Prompt {
  id: string;
  title_original: string;
  title_tr: string | null;
  category: string;
  description_tr: string;
}

export default function AdminPromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrompts();
  }, []);

  async function loadPrompts() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prompts')
        .select('id, title_original, title_tr, category, description_tr')
        .order('created_at', { ascending: false });

      if (error) {
        // Fallback or handle error if table is empty or missing locally
        console.error("Supabase fetch error:", error);
      } else {
        setPrompts(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function updateTitleTr(id: string, newTitle: string) {
    // Optimistic update
    setPrompts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, title_tr: newTitle } : p))
    );

    try {
      const { error } = await supabase
        .from('prompts')
        .update({ title_tr: newTitle })
        .eq('id', id);

      if (error) throw error;
      toast.success("Güncellendi");
    } catch (err) {
      console.error(err);
      toast.error("Güncelleme başarısız!");
      loadPrompts(); // Rollback
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Prompt Yönetimi</h1>
        <p className="text-slate-500 text-sm">Toplu title_tr düzenleme (Auto-save on blur)</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : prompts.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-medium">
            Veritabanında hiç prompt bulunamadı. JSON verileri &apos;prompts&apos; tablosuna taşındıysa burada listelenecektir.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 border-b">
                <tr>
                  <th className="px-4 py-3 font-medium">ID / Kategori</th>
                  <th className="px-4 py-3 font-medium cursor-help" title="title_original (İngilizce)">English Title</th>
                  <th className="px-4 py-3 font-medium text-blue-600">Turkish Title (title_tr)</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {prompts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 align-top whitespace-nowrap">
                      <span className="text-xs text-slate-400 block mb-1 truncate w-24" title={p.id}>{p.id.split('-')[0]}...</span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{p.category}</span>
                    </td>
                    <td className="px-4 py-3 align-top text-slate-600 max-w-[200px]">
                      {p.title_original}
                    </td>
                    <td className="px-4 py-3 align-top max-w-[250px]">
                      <Input
                        defaultValue={p.title_tr || ""}
                        onBlur={(e) => {
                          if (e.target.value !== (p.title_tr || "")) {
                            updateTitleTr(p.id, e.target.value);
                          }
                        }}
                        className="h-8 text-xs border-slate-300 focus-visible:ring-blue-500"
                        placeholder="Türkçe başlık..."
                      />
                    </td>
                    <td className="px-4 py-3 align-top text-slate-500 text-xs max-w-[300px] truncate">
                      {p.description_tr}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
