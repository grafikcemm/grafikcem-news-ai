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
import { 
  Sparkles, 
  Plus, 
  BookOpen, 
  Heart, 
  CheckCircle2, 
  ExternalLink, 
  Search, 
  Filter, 
  LoaderCircle,
  Video,
  FileText,
  Wrench,
  GraduationCap,
  Library
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

const TYPE_ICONS: Record<string, React.ReactNode> = {
  "course": <GraduationCap size={14} />,
  "article": <FileText size={14} />,
  "video": <Video size={14} />,
  "tool": <Wrench size={14} />,
  "book": <BookOpen size={14} />
};

export default function LearningRadarPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Filters
  const [catFilter, setCatFilter] = useState("Tümü");
  const [typeFilter, setTypeFilter] = useState("Tümü");
  const [statusFilter, setStatusFilter] = useState("Tümü");

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
         toast.success("Yeni kaynaklar başarıyla radarımıza takıldı!");
         fetchData();
      } else {
         toast.error("Kaynak tarama başarısız oldu.");
      }
    } catch {
       toast.error("Network hatası.");
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
    toast.success("Kaynak tamamlandı olarak işaretlendi!");
  };

  const handleManualAdd = async () => {
    if (!form.title || !form.url) return toast.error("Başlık ve URL zorunlu.");
    const { error } = await supabase.from("learning_resources").insert([{
      ...form, is_saved: false, is_completed: false, 
      week_number: 0, year: new Date().getFullYear()
    }]);
    if (!error) {
      toast.success("Yeni kaynak manuel olarak eklendi.");
      setModalOpen(false);
      fetchData();
    } else toast.error("Kayıt sırasında bir hata oluştu.");
  };

  const filtered = useMemo(() => {
    return resources.filter(r => {
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
    <div className="p-6 lg:p-10 space-y-10 max-w-[1600px] mx-auto min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
         <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Kaynak Radarı</h1>
            <p className="text-[var(--text-secondary)] text-sm">Zihnini besleyecek en taze tasarım ve AI kaynakları.</p>
         </div>
         <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setModalOpen(true)} className="h-12 px-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] transition-all font-bold text-xs gap-2">
              <Plus size={16} /> MANUEL EKLE
            </Button>
            <Button onClick={handleGenerate} disabled={generating} className="h-12 px-6 rounded-2xl bg-white text-black hover:opacity-90 transition-all font-bold text-xs gap-2">
              {generating ? <LoaderCircle className="animate-spin" size={16} /> : <Sparkles size={16} />}
              AI İLE TARA
            </Button>
         </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap gap-4 p-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl items-center shadow-sm">
           <Filter size={16} className="text-[var(--text-muted)] mr-2" />
           
           <FilterGroup label="KATEGORİ" options={['Tümü', 'Tasarım', 'AI', 'Freelance', 'İş Geliştirme']} active={catFilter} onChange={setCatFilter} />
           <div className="w-px h-6 bg-white/5" />
           <FilterGroup label="TÜR" options={['Tümü', 'Kurs', 'Makale', 'Video', 'Araç', 'Kitap']} active={typeFilter} onChange={setTypeFilter} />
           <div className="w-px h-6 bg-white/5" />
           <FilterGroup label="DURUM" options={['Tümü', 'Kaydedilenler', 'Tamamlananlar']} active={statusFilter} onChange={setStatusFilter} />
        </div>
      </div>

       {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
             {[1,2,3,4,5,6,7,8].map(i=><Skeleton key={i} className="h-[280px] bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-subtle)]" />)}
          </div>
       ) : resources.length === 0 ? (
          <div className="py-32 flex flex-col items-center justify-center bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[40px] space-y-6 text-center">
             <div className="w-20 h-20 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-3xl">
                <Library size={32} className="text-[var(--text-muted)]" />
             </div>
             <div className="space-y-1">
               <p className="text-xl font-bold">Henüz kaynak taranmadı</p>
               <p className="text-[var(--text-secondary)] text-sm max-w-sm mx-auto">Radar henüz boş. AI tarayıcısını başlatarak web'deki en iyi kaynakları toplayabilirsin.</p>
             </div>
             <Button onClick={handleGenerate} disabled={generating} className="h-14 px-8 rounded-2xl bg-white text-black font-bold text-sm gap-2">
               <Sparkles size={18} /> Radar Taramasını Başlat
             </Button>
          </div>
       ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-700">
             {sortedAndFiltered.map(r => (
               <Card key={r.id} className={cn(
                 "bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[32px] flex flex-col transition-all group hover:border-[var(--border-default)] overflow-hidden",
                 r.is_completed && "opacity-40 grayscale"
               )}>
                  <CardContent className="p-6 flex flex-col h-full space-y-5">
                     <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-[var(--bg-elevated)] border border-white/5 text-[var(--text-secondary)]">
                            {TYPE_ICONS[r.resource_type] || <BookOpen size={14} />}
                          </div>
                          <span className="text-[10px] font-bold font-mono text-[var(--text-muted)] uppercase tracking-widest">{r.category}</span>
                        </div>
                        <button 
                          onClick={() => toggleSave(r)} 
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center transition-all border",
                            r.is_saved ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-[var(--bg-elevated)] border-white/5 text-[var(--text-muted)] hover:text-white"
                          )}
                        >
                          <Heart size={14} fill={r.is_saved ? "currentColor" : "none"} />
                        </button>
                     </div>

                     <div className="space-y-2 flex-1">
                       <h3 className="font-bold text-white leading-tight line-clamp-2 group-hover:text-[var(--accent)] transition-colors">{r.title}</h3>
                       <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-3">{r.ai_summary}</p>
                     </div>
                     
                     <div className="pt-5 border-t border-white/5 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold font-mono text-[var(--text-muted)] uppercase tracking-wider">{r.source || 'BİLİNMEYEN'}</span>
                          <span className="text-[9px] font-mono text-[var(--text-muted)]">{new Date(r.created_at).toLocaleDateString()}</span>
                        </div>
                        
                        <div className="flex gap-2">
                           {!r.is_completed ? (
                             <Button variant="ghost" onClick={() => completeResource(r)} className="h-10 flex-1 bg-[var(--bg-elevated)] border border-white/5 rounded-xl text-[10px] font-bold font-mono uppercase text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-hover)]">
                                <CheckCircle2 size={12} className="mr-2" /> TAMAMLANDI
                             </Button>
                           ) : (
                             <div className="h-10 flex-1 flex items-center justify-center text-[10px] font-bold font-mono text-emerald-500 uppercase">
                               <CheckCircle2 size={12} className="mr-2" /> BİTİRİLDİ
                             </div>
                           )}
                           <a href={r.url} target="_blank" rel="noopener noreferrer" className="h-10 px-4 flex items-center justify-center rounded-xl bg-white text-black hover:opacity-90 transition-all shadow-sm">
                             <ExternalLink size={14} />
                           </a>
                        </div>
                     </div>
                  </CardContent>
               </Card>
             ))}
             {sortedAndFiltered.length === 0 && (
               <div className="col-span-full py-20 text-center opacity-20 flex flex-col items-center gap-4">
                 <Search size={40} />
                 <p className="text-[10px] font-bold font-mono tracking-widest uppercase">KRİTERLERE UYGUN KAYNAK BULUNAMADI</p>
               </div>
             )}
          </div>
       )}

       {/* Modal */}
       <Sheet open={modalOpen} onOpenChange={setModalOpen}>
        <SheetContent className="w-full sm:max-w-md bg-[var(--bg-surface)] border-l border-[var(--border-subtle)] text-white p-8 overflow-y-auto">
          <SheetHeader className="mb-8 space-y-1">
            <SheetTitle className="text-xl font-bold">Manuel Kaynak Ekle</SheetTitle>
            <p className="text-[10px] font-bold font-mono text-[var(--text-muted)] uppercase tracking-widest">Kendi keşfettiğin kaynakları radara dahil et</p>
          </SheetHeader>
          
          <div className="space-y-6">
             <div className="space-y-2">
               <label className="text-[10px] font-bold font-mono text-[var(--text-muted)] uppercase tracking-widest">Başlık *</label>
               <Input 
                value={form.title || ''} 
                onChange={e => setForm({...form, title: e.target.value})} 
                className="h-12 bg-[var(--bg-elevated)] border-[var(--border-default)] text-sm rounded-xl focus:border-[var(--border-strong)] transition-all" 
                placeholder="Örn: Framer Motion Masterclass"
               />
             </div>
             
             <div className="space-y-2">
               <label className="text-[10px] font-bold font-mono text-[var(--text-muted)] uppercase tracking-widest">URL *</label>
               <Input 
                value={form.url || ''} 
                onChange={e => setForm({...form, url: e.target.value})} 
                className="h-12 bg-[var(--bg-elevated)] border-[var(--border-default)] text-sm rounded-xl focus:border-[var(--border-strong)] transition-all" 
                placeholder="https://..."
               />
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <label className="text-[10px] font-bold font-mono text-[var(--text-muted)] uppercase tracking-widest">Kaynak Türü</label>
                   <Select value={form.resource_type ?? undefined} onValueChange={v => setForm({...form, resource_type: v ?? ''})}>
                      <SelectTrigger className="h-12 bg-[var(--bg-elevated)] border-[var(--border-default)] text-xs rounded-xl"><SelectValue/></SelectTrigger>
                      <SelectContent>
                        {['course', 'article', 'video', 'tool', 'book'].map(s => <SelectItem key={s} value={s}>{s.toUpperCase()}</SelectItem>)}
                      </SelectContent>
                   </Select>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-bold font-mono text-[var(--text-muted)] uppercase tracking-widest">Kategori</label>
                   <Select value={form.category ?? undefined} onValueChange={v => setForm({...form, category: v ?? ''})}>
                      <SelectTrigger className="h-12 bg-[var(--bg-elevated)] border-[var(--border-default)] text-xs rounded-xl"><SelectValue/></SelectTrigger>
                      <SelectContent>
                        {['design', 'ai', 'freelance', 'business'].map(s => <SelectItem key={s} value={s}>{s.toUpperCase()}</SelectItem>)}
                      </SelectContent>
                   </Select>
                </div>
             </div>

             <div className="space-y-2">
               <label className="text-[10px] font-bold font-mono text-[var(--text-muted)] uppercase tracking-widest">Neden ekledin? (Notlar)</label>
               <Textarea 
                value={form.ai_summary || ''} 
                onChange={e => setForm({...form, ai_summary: e.target.value})} 
                className="min-h-[100px] bg-[var(--bg-elevated)] border-[var(--border-default)] text-sm rounded-xl focus:border-[var(--border-strong)] transition-all resize-none" 
               />
             </div>

             <div className="pt-6 border-t border-white/5 space-y-4">
              <Button onClick={handleManualAdd} className="w-full h-14 bg-white text-black font-bold text-lg rounded-2xl hover:opacity-90 transition-all">
                Kaynağı Kaydet
              </Button>
              <Button variant="ghost" onClick={() => setModalOpen(false)} className="w-full h-12 text-[var(--text-muted)] hover:text-white">
                İptal
              </Button>
             </div>
          </div>
        </SheetContent>
      </Sheet>

    </div>
  );
}

function FilterGroup({ label, options, active, onChange }: any) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[8px] font-bold font-mono text-[var(--text-muted)] uppercase tracking-[0.2em]">{label}</span>
      <div className="flex gap-1">
        {options.map((opt: string) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono transition-all",
              active === opt ? "bg-white text-black" : "text-[var(--text-muted)] hover:text-white"
            )}
          >
            {opt.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
