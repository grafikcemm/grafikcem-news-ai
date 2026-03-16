"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface SettingsClientProps {
  initialPrompt: string;
  envs: {
    xApiKey: string;
    xApiSecret: string;
    xAccessToken: string;
    xAccessSecret: string;
    anthropicKey: string;
  };
}

export function SettingsClient({ initialPrompt, envs }: SettingsClientProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [saving, setSaving] = useState(false);

  async function savePrompt() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("settings")
        .upsert({ key: "custom_voice_prompt", value: prompt });

      if (error) throw error;
      toast.success("Kişisel ses promptu başarıyla kaydedildi");
    } catch (err) {
      console.error("Save settings error:", err);
      toast.error("Ayarlar kaydedilirken bir hata oluştu");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Ayarlar</h1>
        <p className="text-slate-500 text-sm mt-1">Platform tercihleri, API anahtarları ve otomasyon ayarları</p>
      </div>

      {/* Prompts Section */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader>
          <CardTitle className="text-lg">Kişisel Ses Promptu</CardTitle>
          <CardDescription>
            Claude'un tweet üretirken size özel davranabilmesi için ek yönlendirmeler girin.
            (Örn: "Daha çok soru sorarak bitir, X kelimesini çok sık kullan")
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Buraya ek kişisel ses kurallarını yazın..."
            className="min-h-[150px] resize-y"
          />
          <Button
            onClick={savePrompt}
            disabled={saving || prompt === initialPrompt}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            {saving ? "Kaydediliyor..." : "Promptu Kaydet"}
          </Button>
        </CardContent>
      </Card>

      {/* Env Vars (Read Only) */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader>
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <CardTitle className="text-lg">API Anahtarları (Salt Okunur)</CardTitle>
          </div>
          <CardDescription>
            Güvenlik nedeniyle API anahtarlarınız veritabanında tutulmamaktadır.
            Bu değerleri projenizin .env ortam değişkenlerinden düzenleyebilirsiniz.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-slate-900 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                X (Twitter) API
              </h3>
              <div>
                <Label className="text-xs text-slate-500">API Key</Label>
                <Input value={envs.xApiKey} disabled className="mt-1 bg-slate-50 font-mono text-sm" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">API Secret</Label>
                <Input value={envs.xApiSecret} disabled className="mt-1 bg-slate-50 font-mono text-sm" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Access Token</Label>
                <Input value={envs.xAccessToken} disabled className="mt-1 bg-slate-50 font-mono text-sm" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Access Secret</Label>
                <Input value={envs.xAccessSecret} disabled className="mt-1 bg-slate-50 font-mono text-sm" />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-sm text-slate-900 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                Anthropic (Claude) API
              </h3>
              <div>
                <Label className="text-xs text-slate-500">API Key</Label>
                <Input value={envs.anthropicKey} disabled className="mt-1 bg-slate-50 font-mono text-sm" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cron Info */}
      <Card className="border-0 shadow-sm bg-white overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <CardTitle className="text-lg">Cron Zamanlamaları</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            <div className="p-5 flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
              <div>
                <p className="font-medium text-slate-900">Otomatik Haber Çekimi</p>
                <p className="text-sm text-slate-500 mt-1">Aktif kaynaklardaki RSS feed'leri taranır, yeni haberler veritabanına eklenir ve Claude ile skorlanır.</p>
              </div>
              <div className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-sm font-mono shrink-0">
                */30 * * * * (Her 30 dk)
              </div>
            </div>
            <div className="p-5 flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
              <div>
                <p className="font-medium text-slate-900">Günlük Tweet Üretimi</p>
                <p className="text-sm text-slate-500 mt-1">Son 48 saat içindeki en viral 3 haber için günlük otomatik taslaklar oluşturulur.</p>
              </div>
              <div className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-sm font-mono shrink-0">
                0 4 * * * (Her gün 07:00 TR)
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
