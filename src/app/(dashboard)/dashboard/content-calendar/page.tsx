"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek } from "date-fns";
import { tr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface ContentItem {
  id: string;
  title: string;
  platform: string;
  format: string;
  status: string;
  scheduled_date: string;
  caption?: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  "@grafikcem": "#E879A0",
  "@maskulenkod": "#60A5FA",
  "LinkedIn": "#34D399"
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
    
    const { data } = await supabase
      .from("content_items")
      .select("*")
      .gte("scheduled_date", start)
      .lte("scheduled_date", end);
      
    if (data) setItems(data as ContentItem[]);
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
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">İçerik Takvimi</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">İçerik planınızı aylık ve liste görünümlerinde yönetin.</p>
        </div>
        <div className="flex bg-[var(--bg-elevated)] p-1 rounded-lg border border-[var(--border)]">
          <Button variant="ghost" size="sm" className={`h-8 px-4 ${viewMode==='calendar' ? 'bg-[var(--bg-card)] text-[var(--accent)] shadow-xs' : 'text-[var(--text-muted)]'}`} onClick={() => setViewMode('calendar')}>Takvim</Button>
          <Button variant="ghost" size="sm" className={`h-8 px-4 ${viewMode==='list' ? 'bg-[var(--bg-card)] text-[var(--accent)] shadow-xs' : 'text-[var(--text-muted)]'}`} onClick={() => setViewMode('list')}>Liste</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border)]">
        <Select value={fStatus} onValueChange={(v) => setFStatus(v ?? '')}>
          <SelectTrigger className="w-32 h-9 bg-[var(--bg-elevated)] border-[var(--border)]"><SelectValue placeholder="Durum" /></SelectTrigger>
          <SelectContent>
            {['Tümü', 'Taslak', 'Hazırlanıyor', 'Hazır', 'Zamanlandı', 'Yayınlandı'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fPlatform} onValueChange={(v) => setFPlatform(v ?? '')}>
          <SelectTrigger className="w-32 h-9 bg-[var(--bg-elevated)] border-[var(--border)]"><SelectValue placeholder="Platform" /></SelectTrigger>
          <SelectContent>
            {['Tümü', '@grafikcem', '@maskulenkod', 'LinkedIn'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fFormat} onValueChange={(v) => setFFormat(v ?? '')}>
          <SelectTrigger className="w-32 h-9 bg-[var(--bg-elevated)] border-[var(--border)]"><SelectValue placeholder="Format" /></SelectTrigger>
          <SelectContent>
            {['Tümü', 'Reel', 'Carousel', 'Story', 'Post'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button onClick={() => handleDayClick(new Date())} className="bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]">+ Yeni Klasör</Button>
      </div>

      {viewMode === "calendar" ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
            <h2 className="text-lg font-bold text-[var(--text-primary)] capitalize">{format(currentDate, "MMMM yyyy", { locale: tr })}</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrevMonth} className="bg-[var(--bg-elevated)] border-[var(--border)]">←</Button>
              <Button variant="outline" size="sm" onClick={handleNextMonth} className="bg-[var(--bg-elevated)] border-[var(--border)]">→</Button>
            </div>
          </div>
          <div className="grid grid-cols-7 border-b border-[var(--border)]">
            {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(d => (
              <div key={d} className="p-3 text-center text-xs font-semibold tracking-wider uppercase text-[var(--text-muted)] border-r border-[var(--border)] last:border-0">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 auto-rows-[120px]">
            {getDays().map((day, i) => {
              const dayItems = filteredItems.filter(item => item.scheduled_date && item.scheduled_date.startsWith(format(day, "yyyy-MM-dd")));
              return (
                <div key={i} onClick={() => handleDayClick(day)} className={`p-2 border-r border-b border-[var(--border)] cursor-pointer hover:bg-[var(--bg-elevated)]/50 transition-colors ${!isSameMonth(day, currentDate) ? 'opacity-30' : ''}`}>
                  <div className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-2 ${isSameDay(day, new Date()) ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)]'}`}>
                    {format(day, "d")}
                  </div>
                  <div className="space-y-1">
                    {dayItems.slice(0, 3).map(item => (
                      <div key={item.id} className="text-[10px] truncate px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: PLATFORM_COLORS[item.platform] || '#888', opacity: item.status.toLowerCase() !== 'yayınlandı' ? 0.6 : 1 }}>
                        {item.title}
                      </div>
                    ))}
                    {dayItems.length > 3 && <div className="text-[9px] text-[var(--text-muted)] pl-1">+{dayItems.length - 3} daha</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)]">
          {filteredItems.sort((a,b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()).map(item => (
            <div key={item.id} className="p-4 flex items-center gap-4 hover:bg-[var(--bg-elevated)] transition-colors">
              <div className="w-32 text-sm text-[var(--text-secondary)]">{format(new Date(item.scheduled_date), "dd MMM yyyy", { locale: tr })}</div>
              <div><span className="w-2.5 h-2.5 inline-block rounded-full mr-2" style={{ backgroundColor: PLATFORM_COLORS[item.platform] || '#888' }} /></div>
              <div className="flex-1 font-semibold text-[var(--text-primary)]">{item.title}</div>
              <div className="text-xs text-[var(--text-muted)] bg-[var(--bg-elevated)] px-2 py-1 rounded border border-[var(--border)]">{item.format}</div>
              <div className={`text-xs font-medium px-2 py-1 rounded border ${item.status==='Yayınlandı' ? 'border-[var(--success)] text-[var(--success)]' : 'border-[var(--border)] text-[var(--text-secondary)]'}`}>{item.status}</div>
            </div>
          ))}
          {filteredItems.length === 0 && <div className="p-8 text-center text-[var(--text-muted)]">Veri bulunamadı.</div>}
        </div>
      )}

      {/* Sidebar Panel */}
      <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] bg-[var(--bg-card)] border-l border-[var(--border)] overflow-y-auto">
          <SheetHeader className="mb-6 border-b border-[var(--border)] pb-4">
            <SheetTitle className="text-white">İçerik Ekle / Görüntüle</SheetTitle>
            {selectedDay && <p className="text-sm text-[var(--text-muted)]">{format(selectedDay, "dd MMMM yyyy, EEEE", { locale: tr })}</p>}
          </SheetHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-1 block">Başlık *</label>
              <Input value={form.title || ""} onChange={e => setForm({...form, title: e.target.value})} className="bg-[var(--bg-elevated)] border-[var(--border)] text-white" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1 block">Platform *</label>
                <Select value={form.platform ?? undefined} onValueChange={v => setForm({...form, platform: v ?? ''})}>
                  <SelectTrigger className="bg-[var(--bg-elevated)] border-[var(--border)]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['@grafikcem', '@maskulenkod', 'LinkedIn'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1 block">Format *</label>
                <Select value={form.format ?? undefined} onValueChange={v => setForm({...form, format: v ?? ''})}>
                  <SelectTrigger className="bg-[var(--bg-elevated)] border-[var(--border)]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Reel', 'Carousel', 'Story', 'Post'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-1 block">Durum</label>
              <Select value={form.status ?? undefined} onValueChange={v => setForm({...form, status: v ?? ''})}>
                <SelectTrigger className="bg-[var(--bg-elevated)] border-[var(--border)]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['draft', 'hazırlanıyor', 'hazır', 'zamanlandı', 'yayınlandı'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-1 block">Caption / İçerik Metni</label>
              <Textarea value={form.caption || ""} onChange={e => setForm({...form, caption: e.target.value})} className="bg-[var(--bg-elevated)] border-[var(--border)] text-white min-h-[100px]" />
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-1 block">Tarih</label>
              <Input type="date" value={form.scheduled_date || ""} onChange={e => setForm({...form, scheduled_date: e.target.value})} className="bg-[var(--bg-elevated)] border-[var(--border)] text-white" />
            </div>
            <Button onClick={handleSave} className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white mt-4">Kaydet</Button>
          </div>

          {/* O günün mevcut içeriklerini listeleme eklenebilir... */}
        </SheetContent>
      </Sheet>

    </div>
  );
}
