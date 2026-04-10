"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Resource {
  id: string;
  title: string;
  url: string;
  resource_type: string;
  category: string;
  source: string;
  ai_summary: string;
  is_saved: boolean;
  is_completed: boolean;
  created_at: string;
}

const CAT_COLORS: Record<string, string> = {
  "design": "bg-[#E879A0]/20 text-[#E879A0]",
  "ai": "bg-[#60A5FA]/20 text-[#60A5FA]",
  "freelance": "bg-[#34D399]/20 text-[#34D399]",
  "business": "bg-[#fbbf24]/20 text-[#fbbf24]"
};

export default function LearningRadarPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Filters
  const [catFilter, setCatFilter] = useState("Tümü"); // design, ai, freelance, business
  const [typeFilter, setTypeFilter] = useState("Tümü"); // course, article, video, tool, book
  const [statusFilter, setStatusFilter] = useState("Tümü"); // saved, completed

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<Resource>>({ category: 'design', resource_type: 'article' });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data } = await supabase.from("learning_resources").select("*").order("created_at", { ascending: false });
    if (data) setResources(data as Resource[]);
    setLoading(false);
  }

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/learning/find-resources", { method: "POST" });
      if (res.ok) {
         alert("8 yeni kaynak bulundu ✓");
         fetchData();
      } else {
         alert("Hata oluştu.");
      }
    } catch {
       alert("Network hatası.");
    } finally {
       setGenerating(false);
    }
  };

  const toggleSave = async (r: Resource) => {
    setResources(prev => prev.map(x => x.id === r.id ? { ...x, is_saved: !x.is_saved } : x));
    await supabase.from("learning_resources").update({ is_saved: !r.is_saved }).eq("id", r.id);
  };

  const completeResource = async (r: Resource) => {
    setResources(prev => prev.map(x => x.id === r.id ? { ...x, is_completed: true } : x));
    await supabase.from("learning_resources").update({ is_completed: true }).eq("id", r.id);
  };

  const handleManualAdd = async () => {
    if (!form.title || !form.url) return alert("Başlık ve URL zorunlu.");
    const { error } = await supabase.from("learning_resources").insert([{
      ...form, is_saved: false, is_completed: false, 
      week_number: 0, year: new Date().getFullYear()
    }]);
    if (!error) {
      alert("Manuel kaynak eklendi ✓");
      setModalOpen(false);
      fetchData();
    } else alert("Hata oluştu.");
  };

  const filtered = useMemo(() => {
    return resources.filter(r => {
      // mapping tr -> en for filters
      const c = catFilter === 'Tasarım' ? 'design' : catFilter === 'AI' ? 'ai' : catFilter === 'Freelance' ? 'freelance' : catFilter === 'İş Geliştirme' ? 'business' : 'Tümü';
      const t = typeFilter === 'Kurs' ? 'course' : typeFilter === 'Makale' ? 'article' : typeFilter === 'Video' ? 'video' : typeFilter === 'Araç' ? 'tool' : typeFilter === 'Kitap' ? 'book' : 'Tümü';
      
      if (c !== 'Tümü' && r.category !== c) return false;
      if (t !== 'Tümü' && r.resource_type !== t) return false;
      if (statusFilter === 'Kaydedilenler' && !r.is_saved) return false;
      if (statusFilter === 'Tamamlananlar' && !r.is_completed) return false;
      return true;
    });
  }, [resources, catFilter, typeFilter, statusFilter]);

  const sortedAndFiltered = filtered.sort((a,b) => Number(a.is_completed) - Number(b.is_completed));

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto min-h-screen bg-[var(--surface-base)]">
      {/* Üst Bar */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
         <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Kaynak Radarı</h1>
            <p className="text-[var(--text-secondary)] text-sm mt-1">Sizin için seçilmiş güncel tasarım ve AI odaklı öğrenim materyalleri.</p>
         </div>
         <div className="flex gap-2">
            <Button variant="outline" onClick={() => setModalOpen(true)} className="bg-[var(--surface-overlay)] border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] rounded-[var(--radius-md)]">+ Manuel Ekle</Button>
            <Button onClick={handleGenerate} disabled={generating} className="bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] font-medium rounded-[var(--radius-md)]">✨ AI ile Kaynak Bul</Button>
         </div>
      </div>

      {/* Filtreler */}
      <div className="bg-[var(--surface-raised)] border border-[var(--border-subtle)] p-4 rounded-[var(--radius-lg)] flex flex-wrap gap-4 items-center">
         <div className="flex bg-[var(--surface-base)] rounded-md p-1 border border-[var(--border-subtle)]">
            {['Tümü', 'Tasarım', 'AI', 'Freelance', 'İş Geliştirme'].map(c => (
              <button key={c} onClick={() => setCatFilter(c)} className={`px-3 py-1 text-xs rounded transition-colors ${catFilter === c ? 'bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent-muted)]' : 'bg-[var(--surface-overlay)] text-[var(--text-tertiary)] hover:bg-[var(--surface-elevated)]'}`}>{c}</button>
            ))}
         </div>
         <div className="flex bg-[var(--surface-base)] rounded-md p-1 border border-[var(--border-subtle)]">
            {['Tümü', 'Kurs', 'Makale', 'Video', 'Araç', 'Kitap'].map(c => (
              <button key={c} onClick={() => setTypeFilter(c)} className={`px-3 py-1 text-xs rounded transition-colors ${typeFilter === c ? 'bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent-muted)]' : 'bg-[var(--surface-overlay)] text-[var(--text-tertiary)] hover:bg-[var(--surface-elevated)]'}`}>{c}</button>
            ))}
         </div>
         <div className="flex bg-[var(--surface-base)] rounded-md p-1 border border-[var(--border-subtle)]">
            {['Tümü', 'Kaydedilenler', 'Tamamlananlar'].map(c => (
              <button key={c} onClick={() => setStatusFilter(c)} className={`px-3 py-1 text-xs rounded transition-colors ${statusFilter === c ? 'bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent-muted)]' : 'bg-[var(--surface-overlay)] text-[var(--text-tertiary)] hover:bg-[var(--surface-elevated)]'}`}>{c}</button>
            ))}
         </div>
       </div>

       {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             {[1,2,3,4].map(i=><Skeleton key={i} className="h-48 bg-[var(--surface-raised)] rounded-[var(--radius-lg)]" />)}
          </div>
       ) : resources.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center bg-[var(--surface-raised)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)]">
             <div className="text-4xl mb-4 opacity-60 text-[var(--text-tertiary)]">📚</div>
             <p className="text-[var(--text-primary)] font-semibold mb-1">Henüz kaynak yok</p>
             <p className="text-[var(--text-secondary)] text-sm mb-6">Öğrenme haftanıza taze içeriklerle başlayın.</p>
             <Button onClick={handleGenerate} disabled={generating} className="bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] font-medium rounded-[var(--radius-md)]">✨ AI ile Bu Haftanın Kaynaklarını Bul</Button>
          </div>
       ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             {sortedAndFiltered.map(r => (
               <Card key={r.id} className={`bg-[var(--surface-raised)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] flex flex-col transition-all ${r.is_completed ? 'opacity-50' : 'hover:border-[var(--border-default)]'}`}>
                  <CardContent className="p-4 flex flex-col h-full">
                     <div className="flex justify-between items-start mb-3">
                        <div className="flex gap-2">
                          <Badge variant="outline" className="text-[9px] border-[var(--border-subtle)] text-[var(--text-secondary)] capitalize bg-[var(--surface-overlay)]">{r.resource_type}</Badge>
                          <Badge className={`text-[9px] border-0 capitalize ${CAT_COLORS[r.category] || 'bg-[#555]/20 text-[#ccc]'}`}>{r.category}</Badge>
                        </div>
                        <button onClick={() => toggleSave(r)} className="text-lg leading-none cursor-pointer hover:scale-110 transition-transform">
                          {r.is_saved ? '❤️' : '🤍'}
                        </button>
                     </div>
                     <h3 className="font-bold text-[var(--text-primary)] text-sm mb-2 line-clamp-2">{r.title}</h3>
                     <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-3">{r.ai_summary}</p>
                     
                     <div className="mt-auto pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
                         <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">{r.source}</span>
                         <div className="flex gap-2">
                           {!r.is_completed && <Button variant="ghost" size="sm" onClick={() => completeResource(r)} className="h-7 px-2 text-[10px] text-[var(--text-tertiary)] hover:text-[var(--success)]">Tamamlandı ✓</Button>}
                           <a href={r.url} target="_blank" rel="noopener noreferrer" className="h-7 px-3 flex items-center justify-center rounded-[var(--radius-md)] text-[10px] font-medium bg-[var(--surface-overlay)] border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]">Ziyaret Et →</a>
                         </div>
                     </div>
                  </CardContent>
               </Card>
             ))}
             {sortedAndFiltered.length === 0 && <div className="col-span-full py-12 text-center text-[var(--text-tertiary)] text-sm">Filtrelere uygun kaynak bulunamadı.</div>}
          </div>
       )}

       {/* Manuel Ekle Modal */}
       <Sheet open={modalOpen} onOpenChange={setModalOpen}>
        <SheetContent className="w-[400px] bg-[var(--surface-raised)] border-l border-[var(--border-subtle)]">
          <SheetHeader className="mb-6"><SheetTitle className="text-[var(--text-primary)]">Manuel Kaynak Ekle</SheetTitle></SheetHeader>
          <div className="space-y-4">
             <div>
               <label className="text-xs text-[var(--text-secondary)] mb-1 block">Başlık *</label>
               <Input value={form.title || ''} onChange={e => setForm({...form, title: e.target.value})} className="bg-[var(--surface-overlay)] border-[var(--border-default)] text-[var(--text-primary)] rounded-[var(--radius-md)] focus:border-[var(--accent)]" />
             </div>
             <div>
               <label className="text-xs text-[var(--text-secondary)] mb-1 block">URL *</label>
               <Input value={form.url || ''} onChange={e => setForm({...form, url: e.target.value})} className="bg-[var(--surface-overlay)] border-[var(--border-default)] text-[var(--text-primary)] rounded-[var(--radius-md)] focus:border-[var(--accent)]" />
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="text-xs text-[var(--text-secondary)] mb-1 block">Tür</label>
                   <Select value={form.resource_type ?? undefined} onValueChange={v => setForm({...form, resource_type: v ?? ''})}>
                      <SelectTrigger className="bg-[var(--surface-overlay)] border-[var(--border-default)] text-[var(--text-primary)] rounded-[var(--radius-md)]"><SelectValue/></SelectTrigger>
                      <SelectContent>
                        {['course', 'article', 'video', 'tool', 'book'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                   </Select>
                </div>
                <div>
                   <label className="text-xs text-[var(--text-secondary)] mb-1 block">Kategori</label>
                   <Select value={form.category ?? undefined} onValueChange={v => setForm({...form, category: v ?? ''})}>
                      <SelectTrigger className="bg-[var(--surface-overlay)] border-[var(--border-default)] text-[var(--text-primary)] rounded-[var(--radius-md)]"><SelectValue/></SelectTrigger>
                      <SelectContent>
                        {['design', 'ai', 'freelance', 'business'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                   </Select>
                </div>
             </div>
             <div>
               <label className="text-xs text-[var(--text-secondary)] mb-1 block">Notlar (neden eklendi?)</label>
               <Textarea value={form.ai_summary || ''} onChange={e => setForm({...form, ai_summary: e.target.value})} className="bg-[var(--surface-overlay)] border-[var(--border-default)] text-[var(--text-primary)] min-h-[80px] rounded-[var(--radius-md)] focus:border-[var(--accent)]" />
             </div>
             <Button onClick={handleManualAdd} className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white mt-4 font-medium rounded-[var(--radius-md)]">Kaydet</Button>
          </div>
        </SheetContent>
      </Sheet>

    </div>
  );
}
