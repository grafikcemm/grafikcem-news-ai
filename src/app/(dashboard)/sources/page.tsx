"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Source {
  id: string;
  name: string;
  rss_url: string;
  category: string;
  is_active: boolean;
  created_at: string;
  article_count?: number;
}

const categoryLabels: Record<string, string> = {
  ai_news: "AI News",
  design: "Design",
  automation: "Otomasyon",
  dev_tools: "Dev Tools",
  turkish: "Türkçe",
};

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newSource, setNewSource] = useState({
    name: "",
    rss_url: "",
    category: "ai_news",
  });

  useEffect(() => {
    fetchSources();
  }, []);

  async function fetchSources() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("sources")
        .select("*")
        .order("created_at", { ascending: true });

      if (!error && data) {
        // Get article counts per source
        const sourcesWithCounts = await Promise.all(
          data.map(async (source) => {
            const { count } = await supabase
              .from("news_items")
              .select("id", { count: "exact", head: true })
              .eq("source_id", source.id);
            return { ...source, article_count: count || 0 } as Source;
          })
        );
        setSources(sourcesWithCounts);
      }
    } catch (err) {
      console.error("Sources fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    try {
      await supabase
        .from("sources")
        .update({ is_active: !isActive })
        .eq("id", id);
      setSources((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_active: !isActive } : s))
      );
      toast.success(isActive ? "Kaynak devre dışı bırakıldı" : "Kaynak aktif edildi");
    } catch {
      toast.error("Güncelleme başarısız");
    }
  }

  async function addSource() {
    if (!newSource.name || !newSource.rss_url) {
      toast.error("Ad ve URL gerekli");
      return;
    }
    try {
      const { data, error } = await supabase
        .from("sources")
        .insert(newSource)
        .select()
        .single();

      if (!error && data) {
        setSources((prev) => [...prev, { ...data, article_count: 0 } as Source]);
        setNewSource({ name: "", rss_url: "", category: "ai_news" });
        setDialogOpen(false);
        toast.success("Kaynak eklendi!");
      } else {
        toast.error("Ekleme başarısız");
      }
    } catch {
      toast.error("Bir hata oluştu");
    }
  }

  async function deleteSource(id: string) {
    if (!confirm("Bu kaynağı silmek istediğinize emin misiniz?")) return;
    try {
      await supabase.from("sources").delete().eq("id", id);
      setSources((prev) => prev.filter((s) => s.id !== id));
      toast.success("Kaynak silindi");
    } catch {
      toast.error("Silme başarısız");
    }
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kaynaklar</h1>
          <p className="text-slate-500 text-sm mt-1">RSS kaynaklarını yönet</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={<Button className="bg-slate-900 hover:bg-slate-800 text-white" />}
          >
            + Kaynak Ekle
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Yeni RSS Kaynağı</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label className="text-xs font-medium text-slate-600">Kaynak Adı</Label>
                <Input
                  value={newSource.name}
                  onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                  placeholder="örn. TechCrunch AI"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-600">RSS URL</Label>
                <Input
                  value={newSource.rss_url}
                  onChange={(e) => setNewSource({ ...newSource, rss_url: e.target.value })}
                  placeholder="https://example.com/feed.xml"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-600">Kategori</Label>
                <Select
                  value={newSource.category}
                  onValueChange={(val) => val && setNewSource({ ...newSource, category: val })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ai_news">AI News</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="automation">Otomasyon</SelectItem>
                    <SelectItem value="dev_tools">Dev Tools</SelectItem>
                    <SelectItem value="turkish">Türkçe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={addSource} className="w-full bg-blue-500 hover:bg-blue-600 text-white">
                Kaynak Ekle
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sources table */}
      <Card className="border-0 shadow-sm bg-white overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">
                      Kaynak
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3 hidden md:table-cell">
                      Kategori
                    </th>
                    <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3 hidden sm:table-cell">
                      Haber
                    </th>
                    <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">
                      Aktif
                    </th>
                    <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">
                      İşlem
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sources.map((source) => (
                    <tr key={source.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{source.name}</p>
                          <p className="text-xs text-slate-400 truncate max-w-[200px]">
                            {source.rss_url}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                          {categoryLabels[source.category] || source.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center hidden sm:table-cell">
                        <span className="text-sm font-semibold text-slate-700">
                          {source.article_count}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Switch
                          checked={source.is_active}
                          onCheckedChange={() => toggleActive(source.id, source.is_active)}
                        />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteSource(source.id)}
                          className="text-red-400 hover:text-red-600 hover:bg-red-50 text-xs"
                        >
                          Sil
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
