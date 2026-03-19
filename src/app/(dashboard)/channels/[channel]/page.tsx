"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  status: "draft" | "used" | "rejected";
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
    accent: "bg-slate-800",
    light: "bg-slate-50 border-slate-200",
    badge: "bg-slate-100 text-slate-700",
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

type TabStatus = "draft" | "used" | "rejected";

function StatusDot({ status }: { status: ContentItem["status"] }) {
  const colors = {
    draft: "bg-amber-400",
    used: "bg-emerald-400",
    rejected: "bg-slate-300",
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status]}`} />;
}

function ContentCard({
  item,
  onUpdate,
}: {
  item: ContentItem;
  onUpdate: (id: string, updates: Partial<ContentItem>) => void;
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
  const isLong = charCount > 280;

  return (
    <Card className="border border-slate-200 shadow-sm bg-white">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
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
            {charCount} kr
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
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
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
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
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

  const [activeTab, setActiveTab] = useState<TabStatus>("draft");
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

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

  useEffect(() => { fetchContent(); }, [fetchContent]);

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
          if (activeTab === "draft") return item.status === "draft";
          if (activeTab === "used") return item.status === "used";
          return item.status === "rejected";
        })
    );
  };

  if (!config) {
    return <div className="p-8 text-slate-500">Kanal bulunamadı: {channel}</div>;
  }

  const tabs: { key: TabStatus; label: string }[] = [
    { key: "draft", label: "Taslak" },
    { key: "used", label: "Kullanıldı" },
    { key: "rejected", label: "Reddedildi" },
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

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg mb-2">
            {activeTab === "draft" ? "Henüz taslak yok" : activeTab === "used" ? "Henüz kullanılmış içerik yok" : "Reddedilmiş içerik yok"}
          </p>
          {activeTab === "draft" && (
            <p className="text-sm">
              "İçerik Üret" butonuna basarak yeni içerik oluşturun.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <ContentCard key={item.id} item={item} onUpdate={handleUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}
