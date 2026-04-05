"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Topic {
  id: string;
  name: string;
  category: string;
  priority: "high" | "medium" | "low";
  keywords: string[];
  is_active: boolean;
  created_at: string;
}

const CATEGORIES = [
  { id: "ai_tools", label: "AI Araçları", icon: "🤖", color: "bg-violet-100 text-violet-700" },
  { id: "design", label: "Tasarım", icon: "🎨", color: "bg-pink-100 text-pink-700" },
  { id: "automation", label: "Otomasyon", icon: "⚡", color: "bg-amber-100 text-amber-700" },
  { id: "freelance", label: "Freelance", icon: "💼", color: "bg-blue-100 text-blue-700" },
  { id: "dev_tools", label: "Geliştirici Araçları", icon: "🛠️", color: "bg-emerald-100 text-emerald-700" },
  { id: "growth", label: "Büyüme & Algoritma", icon: "📈", color: "bg-orange-100 text-orange-700" },
];

const PRIORITIES = [
  { id: "high", label: "Yüksek", color: "bg-red-100 text-red-700" },
  { id: "medium", label: "Orta", color: "bg-yellow-100 text-yellow-700" },
  { id: "low", label: "Düşük", color: "bg-slate-100 text-slate-600" },
];

const DEFAULT_TOPICS: Omit<Topic, "id" | "created_at">[] = [
  { name: "Claude & Anthropic", category: "ai_tools", priority: "high", keywords: ["claude", "anthropic", "sonnet", "opus"], is_active: true },
  { name: "Cursor IDE", category: "ai_tools", priority: "high", keywords: ["cursor", "ide", "copilot"], is_active: true },
  { name: "Figma & AI Pluginleri", category: "design", priority: "high", keywords: ["figma", "figma ai", "figma plugin", "figma mcp"], is_active: true },
  { name: "n8n & Make Otomasyonları", category: "automation", priority: "high", keywords: ["n8n", "make.com", "zapier", "otomasyon"], is_active: true },
  { name: "Freelancer Gelir Stratejileri", category: "freelance", priority: "medium", keywords: ["freelance", "fiyatlandırma", "gelir"], is_active: true },
  { name: "X Algoritması & Büyüme", category: "growth", priority: "high", keywords: ["twitter algoritma", "x büyüme", "viral"], is_active: true },
  { name: "Logo & Marka Tasarımı", category: "design", priority: "medium", keywords: ["logo", "branding", "marka"], is_active: true },
  { name: "Web Geliştirme", category: "dev_tools", priority: "medium", keywords: ["nextjs", "react", "vercel", "supabase"], is_active: true },
  { name: "AI Art & Görsel Üretim", category: "ai_tools", priority: "low", keywords: ["midjourney", "dall-e", "stable diffusion"], is_active: false },
  { name: "Müşteri Yönetimi", category: "freelance", priority: "low", keywords: ["müşteri", "proje yönetimi", "brief"], is_active: true },
];

export default function TopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("ai_tools");
  const [newPriority, setNewPriority] = useState<"high" | "medium" | "low">("medium");
  const [newKeywords, setNewKeywords] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  async function loadTopics() {
    setLoading(true);
    const { data, error } = await supabase
      .from("topics")
      .select("*")
      .order("priority", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      // Table might not exist yet — use default topics
      console.warn("Topics table not found, using defaults");
      setTopics(DEFAULT_TOPICS.map((t, i) => ({
        ...t,
        id: `default-${i}`,
        created_at: new Date().toISOString(),
      })));
    } else if (data && data.length > 0) {
      setTopics(data as unknown as Topic[]);
    } else {
      // Table exists but empty — seed with defaults
      setTopics(DEFAULT_TOPICS.map((t, i) => ({
        ...t,
        id: `default-${i}`,
        created_at: new Date().toISOString(),
      })));
    }
    setLoading(false);
  }

  useEffect(() => {
    loadTopics();
  }, []);

  async function handleAdd() {
    if (!newName.trim()) return;
    const topic: Omit<Topic, "id" | "created_at"> = {
      name: newName.trim(),
      category: newCategory,
      priority: newPriority,
      keywords: newKeywords.split(",").map(k => k.trim()).filter(Boolean),
      is_active: true,
    };

    const { error } = await supabase.from("topics").insert([topic]);
    if (error) {
      // If table doesn't exist, just add to local state
      setTopics(prev => [...prev, { ...topic, id: `local-${Date.now()}`, created_at: new Date().toISOString() }]);
      toast.success("Konu eklendi (yerel)");
    } else {
      toast.success("Konu eklendi!");
      loadTopics();
    }
    setNewName("");
    setNewKeywords("");
    setAdding(false);
  }

  async function toggleActive(id: string) {
    const topic = topics.find(t => t.id === id);
    if (!topic) return;

    if (!id.startsWith("default-") && !id.startsWith("local-")) {
      await supabase.from("topics").update({ is_active: !topic.is_active }).eq("id", id);
    }
    setTopics(prev => prev.map(t => t.id === id ? { ...t, is_active: !t.is_active } : t));
  }

  async function handleDelete(id: string) {
    if (!id.startsWith("default-") && !id.startsWith("local-")) {
      await supabase.from("topics").delete().eq("id", id);
    }
    setTopics(prev => prev.filter(t => t.id !== id));
    toast.info("Konu silindi");
  }

  const filtered = filterCategory === "all" ? topics : topics.filter(t => t.category === filterCategory);
  const activeCount = topics.filter(t => t.is_active).length;
  const highCount = topics.filter(t => t.priority === "high" && t.is_active).length;

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-(--text-primary)">Konular</h1>
          <p className="text-(--text-muted) text-sm mt-1">
            İçerik üretimi ve haber takibi için odak konularını yönet
          </p>
        </div>
        <Button
          onClick={() => setAdding(!adding)}
          className="bg-accent hover:bg-(--accent-hover) text-white"
        >
          {adding ? "İptal" : "+ Yeni Konu Ekle"}
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-(--bg-card) border border-border rounded-xl p-4">
          <p className="text-2xl font-bold text-(--text-primary)">{topics.length}</p>
          <p className="text-xs text-(--text-muted) mt-1">Toplam Konu</p>
        </div>
        <div className="bg-(--bg-card) border border-border rounded-xl p-4">
          <p className="text-2xl font-bold text-emerald-500">{activeCount}</p>
          <p className="text-xs text-(--text-muted) mt-1">Aktif</p>
        </div>
        <div className="bg-(--bg-card) border border-border rounded-xl p-4">
          <p className="text-2xl font-bold text-red-500">{highCount}</p>
          <p className="text-xs text-(--text-muted) mt-1">Yüksek Öncelik</p>
        </div>
        <div className="bg-(--bg-card) border border-border rounded-xl p-4">
          <p className="text-2xl font-bold text-(--text-primary)">{CATEGORIES.length}</p>
          <p className="text-xs text-(--text-muted) mt-1">Kategori</p>
        </div>
      </div>

      {/* Add New Topic Form */}
      {adding && (
        <Card className="bg-(--bg-card) border-(--accent)/30 border-2">
          <CardContent className="p-5 space-y-4">
            <h3 className="font-semibold text-(--text-primary)">Yeni Konu Ekle</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-(--text-secondary) mb-1 block">Konu Adı</label>
                <Input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Örn: Claude MCP"
                  className="bg-(--bg-elevated) border-border"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-(--text-secondary) mb-1 block">Anahtar Kelimeler (virgülle)</label>
                <Input
                  value={newKeywords}
                  onChange={e => setNewKeywords(e.target.value)}
                  placeholder="Örn: claude, mcp, tool use"
                  className="bg-(--bg-elevated) border-border"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="text-xs font-medium text-(--text-secondary) mb-2 block">Kategori</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setNewCategory(c.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        newCategory === c.id ? c.color + " ring-2 ring-offset-1 ring-current" : "bg-(--bg-elevated) text-(--text-muted)"
                      }`}
                    >
                      {c.icon} {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-(--text-secondary) mb-2 block">Öncelik</label>
                <div className="flex gap-2">
                  {PRIORITIES.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setNewPriority(p.id as "high" | "medium" | "low")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        newPriority === p.id ? p.color + " ring-2 ring-offset-1 ring-current" : "bg-(--bg-elevated) text-(--text-muted)"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <Button onClick={handleAdd} disabled={!newName.trim()} className="bg-accent hover:bg-(--accent-hover) text-white">
              Konuyu Kaydet
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterCategory("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            filterCategory === "all" ? "bg-accent text-white" : "bg-(--bg-elevated) text-(--text-muted) hover:text-(--text-secondary)"
          }`}
        >
          Tümü ({topics.length})
        </button>
        {CATEGORIES.map(c => {
          const count = topics.filter(t => t.category === c.id).length;
          return (
            <button
              key={c.id}
              onClick={() => setFilterCategory(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterCategory === c.id ? c.color : "bg-(--bg-elevated) text-(--text-muted) hover:text-(--text-secondary)"
              }`}
            >
              {c.icon} {c.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Topic Cards */}
      {loading ? (
        <div className="grid gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-(--bg-card) border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center bg-(--bg-card) border border-border rounded-xl">
          <p className="text-(--text-primary) font-semibold">Bu kategoride konu bulunamadı</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(topic => {
            const cat = CATEGORIES.find(c => c.id === topic.category);
            const pri = PRIORITIES.find(p => p.id === topic.priority);
            return (
              <Card
                key={topic.id}
                className={`bg-(--bg-card) border-border transition-all ${
                  !topic.is_active ? "opacity-50" : ""
                }`}
              >
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <h3 className="font-semibold text-(--text-primary) text-sm">{topic.name}</h3>
                      <Badge className={`text-[10px] ${cat?.color || "bg-slate-100 text-slate-600"}`}>
                        {cat?.icon} {cat?.label}
                      </Badge>
                      <Badge className={`text-[10px] ${pri?.color || "bg-slate-100 text-slate-600"}`}>
                        {pri?.label}
                      </Badge>
                      {!topic.is_active && (
                        <Badge className="text-[10px] bg-slate-200 text-slate-500">Pasif</Badge>
                      )}
                    </div>
                    {topic.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {topic.keywords.map(kw => (
                          <span key={kw} className="text-[10px] px-2 py-0.5 rounded-full bg-(--bg-elevated) text-(--text-muted) border border-border">
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleActive(topic.id)}
                      className="text-xs bg-(--bg-elevated) border-border"
                    >
                      {topic.is_active ? "Pasife Al" : "Aktifleştir"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(topic.id)}
                      className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      Sil
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
