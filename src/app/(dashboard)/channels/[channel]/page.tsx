"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

interface ContentItem {
  id: string;
  channel: string;
  content: string;
  content_category: string | null;
  linkedin_format: string | null;
  status: "draft" | "used" | "rejected" | "editing";
  used_at: string | null;
  created_at: string;
  news_items?: { title: string; url: string } | null;
}

const CHANNEL_CONFIG = {
  grafikcem: {
    label: "@grafikcem",
    description: "X (Twitter) — AI & Tasarım & Freelance",
    color: "blue",
    accent: "bg-blue-500",
    light: "bg-blue-50 border-blue-200",
    badge: "bg-blue-100 text-blue-700",
  },
  maskulenkod: {
    label: "@maskulenkod",
    description: "X (Twitter) — Disiplin & Mentorluk",
    color: "slate",
    accent: "bg-[var(--surface-elevated)]",
    light: "bg-slate-50 border-[var(--border-subtle)]",
    badge: "bg-[var(--surface-elevated)] text-slate-700",
  },
  linkedin: {
    label: "LinkedIn",
    description: "LinkedIn — Profesyonel İçerik",
    color: "indigo",
    accent: "bg-indigo-600",
    light: "bg-indigo-50 border-indigo-200",
    badge: "bg-indigo-100 text-indigo-700",
  },
} as const;

type TabStatus = "all" | "draft" | "used" | "editing";

function StatusDot({ status }: { status: ContentItem["status"] }) {
  const colors = {
    draft: "bg-amber-400",
    used: "bg-emerald-400",
    editing: "bg-blue-400",
    rejected: "bg-slate-300",
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status] || "bg-slate-400"}`} />;
}

function ContentCard({
  item,
  onUpdate,
  isSelected,
  onToggleSelect,
}: {
  item: ContentItem;
  onUpdate: (id: string, updates: Partial<ContentItem>) => void;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(item.content);

  const handleCopy = () => {
    navigator.clipboard.writeText(item.content);
    toast.success("Kopyalandı!");
  };

  const handleMarkUsed = async () => {
    const res = await fetch(`/api/channels/${item.channel}/content`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, status: "used" }),
    });
    if (res.ok) {
      onUpdate(item.id, { status: "used", used_at: new Date().toISOString() });
      toast.success("Kullanıldı olarak işaretlendi");
    }
  };

  const handleReject = async () => {
    const res = await fetch(`/api/channels/${item.channel}/content`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, status: "rejected" }),
    });
    if (res.ok) {
      onUpdate(item.id, { status: "rejected" });
      toast.success("Silindi");
    }
  };

  const handleSaveEdit = async () => {
    if (editText === item.content) { setEditing(false); return; }
    const res = await fetch(`/api/channels/${item.channel}/content`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, content: editText }),
    });
    if (res.ok) {
      onUpdate(item.id, { content: editText });
      toast.success("Kaydedildi");
    }
    setEditing(false);
  };

  const charCount = item.content.length;
  const maxChar = item.channel === "linkedin" ? 3000 : 280;
  const isLong = charCount > maxChar;

  return (
    <Card className={`border shadow-sm transition-all ${isSelected ? 'border-blue-400 bg-blue-50/10' : 'border-[var(--border-subtle)] bg-[var(--surface-card)]'}`}>
      <CardContent className="p-4 relative">
        {onToggleSelect && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(item.id)}
            className="absolute top-4 left-4 z-10 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
        )}
        {/* Header */}
        <div className={`flex items-center gap-2 mb-3 flex-wrap ${onToggleSelect ? 'pl-7' : ''}`}>
          <StatusDot status={item.status} />
          <span className="text-xs text-slate-500">
            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: tr })}
          </span>
          {item.content_category && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              {item.content_category}
            </span>
          )}
          {item.linkedin_format && (
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
              {item.linkedin_format}
            </span>
          )}
          <span className={`text-xs ml-auto font-mono ${isLong ? "text-rose-500" : "text-slate-400"}`}>
            {charCount} / {maxChar}
          </span>
        </div>

        {/* Content */}
        {editing ? (
          <textarea
            className="w-full text-sm text-slate-800 border border-slate-300 rounded-md p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleSaveEdit}
            autoFocus
          />
        ) : (
          <p
            className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed cursor-text"
            onClick={() => item.status === "draft" && setEditing(true)}
          >
            {item.content}
          </p>
        )}

        {/* News source */}
        {item.news_items?.title && (
          <p className="text-xs text-slate-400 mt-2 italic truncate">
            📰 {item.news_items.title}
          </p>
        )}

        {/* Used date */}
        {item.status === "used" && item.used_at && (
          <p className="text-xs text-emerald-600 mt-2">
            ✓ Kullanıldı: {formatDistanceToNow(new Date(item.used_at), { addSuffix: true, locale: tr })}
          </p>
        )}

        {/* Actions */}
        {item.status === "draft" && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border-subtle)]">
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 px-3"
              onClick={() => setEditing(true)}
            >
              ✏️ Düzenle
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 px-3"
              onClick={handleCopy}
            >
              📋 Kopyala
            </Button>
            <Button
              size="sm"
              className="text-xs h-7 px-3 bg-emerald-500 hover:bg-emerald-600 text-white"
              onClick={handleMarkUsed}
            >
              ✅ Kullanıldı
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs h-7 px-2 text-slate-400 hover:text-rose-500 ml-auto"
              onClick={handleReject}
            >
              🗑️
            </Button>
          </div>
        )}
        {item.status === "used" && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border-subtle)]">
            <Button size="sm" variant="outline" className="text-xs h-7 px-3" onClick={handleCopy}>
              📋 Kopyala
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ChannelPage() {
  const params = useParams();
  const channel = params.channel as string;
  const config = CHANNEL_CONFIG[channel as keyof typeof CHANNEL_CONFIG];

  const [activeTab, setActiveTab] = useState<TabStatus>("all");
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchContent = useCallback(async (status?: TabStatus) => {
    setLoading(true);
    const s = status || activeTab;
    const res = await fetch(`/api/channels/${channel}/content?status=${s}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.content || []);
    }
    setLoading(false);
  }, [channel, activeTab]);

  useEffect(() => { 
    // disable exhaustive-deps warning to fix cascade render issue temporarily
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchContent(); 
  }, [channel]);

  const handleTabChange = (tab: TabStatus) => {
    setActiveTab(tab);
    setLoading(true);
    fetch(`/api/channels/${channel}/content?status=${tab}`)
      .then((r) => r.json())
      .then((d) => { setItems(d.content || []); setLoading(false); });
  };

  const handleGenerate = async () => {
    setGenerating(true);
    const res = await fetch(`/api/channels/${channel}/generate`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      toast.success("İçerik üretildi!");
      if (activeTab === "draft") {
        setItems((prev) => [data.content, ...prev]);
      }
    } else {
      toast.error(data.error || "Üretim başarısız");
    }
    setGenerating(false);
  };

  const handleUpdate = (id: string, updates: Partial<ContentItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
        .filter((item) => {
          if (activeTab === "all") return item.status !== "rejected";
          return item.status === activeTab;
        })
    );
  };

  const handleExportCSV = () => {
    if (selectedIds.size === 0) return toast.error("Kayıt seçilmedi");
    const selectedItems = items.filter(i => selectedIds.has(i.id));
    const header = "ID,Tarih,Durum,Icerik\n";
    const csv = selectedItems.map(i => `"${i.id}","${i.created_at}","${i.status}","${i.content.replace(/"/g, '""')}"`).join("\n");
    const blob = new Blob(["\ufeff" + header + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `export_${channel}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderCalendar = () => {
    const days = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
    return (
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {days.map((day, i) => {
          const dayItems = items.filter((_, idx) => (idx % 7) === i);
          return (
            <div key={day} className="border border-[var(--border-subtle)] rounded-lg bg-slate-50 min-h-[300px] flex flex-col">
              <div className="bg-[var(--surface-elevated)] border-b border-[var(--border-subtle)] px-3 py-2 text-center text-xs font-bold text-slate-500">
                {day}
              </div>
              <div className="p-2 space-y-2 flex-1 relative">
                {dayItems.map(item => (
                  <div key={item.id} className="bg-[var(--surface-card)] border flex flex-col border-slate-300 rounded p-2 text-[10px] shadow-sm overflow-hidden">
                     <span className="line-clamp-4 text-slate-700">{item.content}</span>
                     <div className="mt-1 flex items-center justify-between">
                       <StatusDot status={item.status} />
                       <span className="text-slate-400">{item.content.length}c</span>
                     </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    );
  };

  if (!config) {
    return <div className="p-8 text-slate-500">Kanal bulunamadı: {channel}</div>;
  }

  const tabs: { key: TabStatus; label: string }[] = [
    { key: "all", label: "Tümü" },
    { key: "draft", label: "Bekleyen" },
    { key: "used", label: "Kullanıldı" },
    { key: "editing", label: "Düzenleniyor" },
  ];

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className={`w-3 h-3 rounded-full ${config.accent}`} />
            <h1 className="text-2xl font-bold text-slate-900">{config.label}</h1>
          </div>
          <p className="text-slate-500 text-sm">{config.description}</p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-blue-500 hover:bg-blue-600 text-white shrink-0"
        >
          {generating ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Üretiliyor...
            </span>
          ) : (
            "✨ İçerik Üret"
          )}
        </Button>
      </div>

      {/* Views & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex gap-1 bg-[var(--surface-elevated)] p-1 rounded-lg w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-[var(--surface-card)] text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button size="sm" variant="outline" className="text-sm shadow-sm" onClick={handleExportCSV}>
              📥 Seçili İndir ({selectedIds.size})
            </Button>
          )}
          <div className="flex bg-[var(--surface-elevated)] p-1 rounded-lg">
            <button 
              onClick={() => setViewMode("list")} 
              className={`px-3 py-1 rounded-md text-sm font-medium ${viewMode === "list" ? "bg-[var(--surface-card)] shadow-sm" : "text-slate-500"}`}
            >
              Liste
            </button>
            <button 
              onClick={() => setViewMode("calendar")} 
              className={`px-3 py-1 rounded-md text-sm font-medium ${viewMode === "calendar" ? "bg-[var(--surface-card)] shadow-sm" : "text-slate-500"}`}
            >
              Takvim
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg mb-2">
            {activeTab === "draft" ? "Henüz taslak yok" : activeTab === "used" ? "Henüz kullanılmış içerik yok" : activeTab === "editing" ? "Düzenlenen içerik yok" : "İçerik yok"}
          </p>
          {activeTab === "draft" && (
            <p className="text-sm">
              &quot;İçerik Üret&quot; butonuna basarak yeni içerik oluşturun.
            </p>
          )}
        </div>
      ) : viewMode === "calendar" ? (
        renderCalendar()
      ) : (
        <div className="space-y-4">
          <div className="flex items-center mb-2 px-2 text-xs font-semibold text-slate-400 tracking-wider uppercase">
            <input 
              type="checkbox" 
              checked={selectedIds.size === items.length && items.length > 0}
              onChange={() => {
                if (selectedIds.size === items.length) setSelectedIds(new Set());
                else setSelectedIds(new Set(items.map(i => i.id)));
              }}
              className="mr-3 w-4 h-4 rounded border-slate-300"
            />
            <span>Tümünü Seç</span>
          </div>
          {items.map((item) => (
            <ContentCard 
              key={item.id} 
              item={item} 
              onUpdate={handleUpdate} 
              isSelected={selectedIds.has(item.id)}
              onToggleSelect={toggleSelection}
            />
          ))}
        </div>
      )}
    </div>
  );
}
