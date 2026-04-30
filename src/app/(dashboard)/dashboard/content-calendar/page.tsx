"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  startOfWeek, 
  endOfWeek 
} from "date-fns";
import { tr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  List, 
  Plus,
  Search,
  Layout,
  Instagram,
  Linkedin,
  Clock,
  MoreVertical,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ContentItem {
  id: string;
  title: string;
  platform: string;
  format: string;
  status: string;
  scheduled_date: string;
  caption?: string;
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  "@grafikcem": <Instagram size={10} className="text-pink-400" />,
  "@maskulenkod": <Instagram size={10} className="text-blue-400" />,
  "LinkedIn": <Linkedin size={10} className="text-blue-500" />
};

export default function ContentCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [fStatus, setFStatus] = useState("Tümü");
  const [fPlatform, setFPlatform] = useState("Tümü");
  const [fFormat, setFFormat] = useState("Tümü");

  // Panel state
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [form, setForm] = useState<Partial<ContentItem>>({});

  useEffect(() => {
    fetchItems();
  }, [currentDate]);

  async function fetchItems() {
    setLoading(true);
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }).toISOString();
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }).toISOString();
    
    // Fetch from legacy/general items
    const { data: items1 } = await supabase
      .from("content_items")
      .select("*")
      .gte("scheduled_date", start)
      .lte("scheduled_date", end);

    // Fetch from new LinkedIn calendar
    const { data: items2 } = await supabase
      .from("content_calendar")
      .select("*")
      .gte("date", start)
      .lte("date", end);
      
    const combined: ContentItem[] = [
      ...(items1 || []).map(i => i as ContentItem),
      ...(items2 || []).map(i => ({
        id: i.id,
        title: i.topic,
        platform: i.platform,
        format: i.format,
        status: "Planned",
        scheduled_date: i.date,
        caption: ""
      } as ContentItem))
    ];

    setItems(combined);
    setLoading(false);
  }

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const filteredItems = items.filter(i => {
    if (fStatus !== "Tümü" && i.status.toLowerCase() !== fStatus.toLowerCase()) return false;
    if (fPlatform !== "Tümü" && i.platform !== fPlatform) return false;
    if (fFormat !== "Tümü" && i.format !== fFormat) return false;
    return true;
  });

  const getDays = () => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  };

  const handleDayClick = (day: Date) => {
    setSelectedDay(day);
    setForm({ scheduled_date: format(day, "yyyy-MM-dd"), status: "draft" });
    setPanelOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.platform || !form.format) return alert("Başlık, platform ve format zorunlu.");
    
    const { data, error } = await supabase.from("content_items").insert([form]).select();
    if (!error && data) {
      setItems(prev => [...prev, data[0]]);
      setPanelOpen(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 space-y-10 max-w-7xl mx-auto min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">İçerik Takvimi</h1>
          <p className="text-[var(--text-secondary)] text-sm">Gelecek içerikleri planla ve organize et.</p>
        </div>
        
        <div className="flex bg-[var(--bg-surface)] p-1 rounded-xl border border-[var(--border-subtle)]">
          <button 
            onClick={() => setViewMode('calendar')}
            className={cn("px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-2", viewMode === 'calendar' ? 'bg-white text-black' : 'text-[var(--text-muted)]')}
          >
            <CalendarIcon size={14} /> TAKVİM
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={cn("px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-2", viewMode === 'list' ? 'bg-white text-black' : 'text-[var(--text-muted)]')}
          >
            <List size={14} /> LİSTE
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-[var(--bg-surface)] p-4 rounded-2xl border border-[var(--border-subtle)]">
        <div className="flex gap-2">
          <Select value={fStatus} onValueChange={(v) => setFStatus(v ?? '')}>
            <SelectTrigger className="w-36 h-10 bg-[var(--bg-elevated)] border-[var(--border-default)] text-[10px] font-bold font-mono uppercase rounded-xl"><SelectValue placeholder="DURUM" /></SelectTrigger>
            <SelectContent>
              {['Tümü', 'Taslak', 'Hazırlanıyor', 'Hazır', 'Zamanlandı', 'Yayınlandı'].map(s => <SelectItem key={s} value={s}>{s.toUpperCase()}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={fPlatform} onValueChange={(v) => setFPlatform(v ?? '')}>
            <SelectTrigger className="w-36 h-10 bg-[var(--bg-elevated)] border-[var(--border-default)] text-[10px] font-bold font-mono uppercase rounded-xl"><SelectValue placeholder="PLATFORM" /></SelectTrigger>
            <SelectContent>
              {['Tümü', '@grafikcem', '@maskulenkod', 'LinkedIn'].map(s => <SelectItem key={s} value={s}>{s.toUpperCase()}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1" />
        <Button onClick={() => handleDayClick(new Date())} className="bg-white text-black font-bold rounded-xl h-10 px-6 gap-2">
          <Plus size={16} /> YENİ İÇERİK
        </Button>
      </div>

      {viewMode === "calendar" ? (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl overflow-hidden shadow-2xl animate-in fade-in duration-500">
          <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30">
            <h2 className="text-xl font-bold capitalize">{format(currentDate, "MMMM yyyy", { locale: tr })}</h2>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="rounded-lg border border-[var(--border-default)] hover:bg-[var(--bg-elevated)]"><ChevronLeft size={18} /></Button>
              <Button variant="ghost" size="icon" onClick={handleNextMonth} className="rounded-lg border border-[var(--border-default)] hover:bg-[var(--bg-elevated)]"><ChevronRight size={18} /></Button>
            </div>
          </div>
          
          <div className="grid grid-cols-7 border-b border-[var(--border-subtle)]">
            {['PZT', 'SAL', 'ÇAR', 'PER', 'CUM', 'CMT', 'PAZ'].map(d => (
              <div key={d} className="p-4 text-center text-[10px] font-bold font-mono tracking-widest text-[var(--text-muted)] border-r border-[var(--border-subtle)] last:border-0">{d}</div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 auto-rows-[140px]">
            {getDays().map((day, i) => {
              const dayItems = filteredItems.filter(item => item.scheduled_date && item.scheduled_date.startsWith(format(day, "yyyy-MM-dd")));
              const isToday = isSameDay(day, new Date());
              const isCurrentMonth = isSameMonth(day, currentDate);

              return (
                <div 
                  key={i} 
                  onClick={() => handleDayClick(day)} 
                  className={cn(
                    "p-3 border-r border-b border-[var(--border-subtle)] cursor-pointer hover:bg-[var(--bg-elevated)]/50 transition-all group",
                    !isCurrentMonth && "bg-[var(--bg-base)] opacity-30"
                  )}
                >
                  <div className={cn(
                    "text-[11px] font-bold w-7 h-7 flex items-center justify-center rounded-lg mb-3 transition-all",
                    isToday ? "bg-white text-black" : "text-[var(--text-muted)] group-hover:text-white"
                  )}>
                    {format(day, "d")}
                  </div>
                  
                  <div className="space-y-1.5 overflow-hidden">
                    {dayItems.slice(0, 3).map(item => (
                      <div 
                        key={item.id} 
                        className="text-[9px] font-bold font-mono truncate px-2 py-1 rounded-md bg-[var(--bg-elevated)] border border-white/5 flex items-center gap-1.5"
                      >
                        {PLATFORM_ICONS[item.platform]}
                        <span className="truncate">{item.title}</span>
                      </div>
                    ))}
                    {dayItems.length > 3 && (
                      <div className="text-[8px] font-bold font-mono text-[var(--text-muted)] pl-1">
                        + {dayItems.length - 3} MORE
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl overflow-hidden divide-y divide-[var(--border-subtle)] shadow-xl animate-in slide-in-from-bottom-4 duration-500">
          {filteredItems.sort((a,b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()).map(item => (
            <div key={item.id} className="p-6 flex items-center gap-6 hover:bg-[var(--bg-elevated)] transition-all group">
              <div className="w-40 flex flex-col">
                <span className="text-[10px] font-bold font-mono text-[var(--text-muted)] uppercase">{format(new Date(item.scheduled_date), "EEEE", { locale: tr })}</span>
                <span className="text-sm font-bold text-white">{format(new Date(item.scheduled_date), "dd MMM yyyy", { locale: tr })}</span>
              </div>
              
              <div className="flex-1 flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center border border-[var(--border-subtle)]">
                  {PLATFORM_ICONS[item.platform]}
                </div>
                <div className="space-y-0.5">
                  <p className="font-bold text-white group-hover:text-[var(--accent)] transition-colors">{item.title}</p>
                  <p className="text-[10px] font-bold font-mono text-[var(--text-muted)] uppercase tracking-wider">{item.platform}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold font-mono px-3 py-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-secondary)]">
                  {item.format?.toUpperCase()}
                </span>
                <span className={cn(
                  "text-[10px] font-bold font-mono px-3 py-1 rounded-lg border",
                  item.status.toLowerCase() === 'yayınlandı' ? 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5' : 'border-[var(--border-default)] text-[var(--text-muted)] bg-[var(--bg-elevated)]'
                )}>
                  {item.status?.toUpperCase()}
                </span>
                <Button variant="ghost" size="icon" className="text-[var(--text-muted)] hover:text-white"><MoreVertical size={16} /></Button>
              </div>
            </div>
          ))}
          {filteredItems.length === 0 && (
            <div className="p-20 text-center opacity-20 flex flex-col items-center gap-3">
              <Layout size={40} />
              <p className="text-[10px] font-bold font-mono tracking-widest">İÇERİK BULUNAMADI</p>
            </div>
          )}
        </div>
      )}

      {/* Sheet Panel */}
      <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
        <SheetContent className="w-full sm:max-w-md bg-[var(--bg-surface)] border-l border-[var(--border-subtle)] text-white p-8 overflow-y-auto">
          <SheetHeader className="mb-8 space-y-1">
            <SheetTitle className="text-xl font-bold">İçerik Planla</SheetTitle>
            {selectedDay && <p className="text-[10px] font-bold font-mono text-[var(--text-muted)] uppercase">{format(selectedDay, "dd MMMM yyyy, EEEE", { locale: tr })}</p>}
          </SheetHeader>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold font-mono text-[var(--text-muted)] uppercase tracking-widest">İçerik Başlığı *</label>
              <Input 
                value={form.title || ""} 
                onChange={e => setForm({...form, title: e.target.value})} 
                className="h-12 bg-[var(--bg-elevated)] border-[var(--border-default)] text-sm rounded-xl focus:border-[var(--border-strong)] transition-all" 
                placeholder="Örn: AI Trendleri Carousel"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold font-mono text-[var(--text-muted)] uppercase tracking-widest">Platform</label>
                <Select value={form.platform ?? undefined} onValueChange={v => setForm({...form, platform: v ?? ''})}>
                  <SelectTrigger className="h-12 bg-[var(--bg-elevated)] border-[var(--border-default)] text-xs rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['@grafikcem', '@maskulenkod', 'LinkedIn'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold font-mono text-[var(--text-muted)] uppercase tracking-widest">Format</label>
                <Select value={form.format ?? undefined} onValueChange={v => setForm({...form, format: v ?? ''})}>
                  <SelectTrigger className="h-12 bg-[var(--bg-elevated)] border-[var(--border-default)] text-xs rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Reel', 'Carousel', 'Story', 'Post'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold font-mono text-[var(--text-muted)] uppercase tracking-widest">Durum</label>
              <Select value={form.status ?? undefined} onValueChange={v => setForm({...form, status: v ?? ''})}>
                <SelectTrigger className="h-12 bg-[var(--bg-elevated)] border-[var(--border-default)] text-xs rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['draft', 'hazırlanıyor', 'hazır', 'zamanlandı', 'yayınlandı'].map(s => <SelectItem key={s} value={s}>{s.toUpperCase()}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold font-mono text-[var(--text-muted)] uppercase tracking-widest">Açıklama / Metin</label>
              <Textarea 
                value={form.caption || ""} 
                onChange={e => setForm({...form, caption: e.target.value})} 
                className="min-h-[120px] bg-[var(--bg-elevated)] border-[var(--border-default)] text-sm rounded-xl focus:border-[var(--border-strong)] transition-all resize-none" 
              />
            </div>

            <div className="pt-6 border-t border-white/5 space-y-4">
              <Button onClick={handleSave} className="w-full h-12 bg-white text-black font-bold rounded-xl hover:opacity-90 transition-all">
                Planı Kaydet
              </Button>
              <Button variant="ghost" onClick={() => setPanelOpen(false)} className="w-full h-12 text-[var(--text-muted)] hover:text-white">
                İptal
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
