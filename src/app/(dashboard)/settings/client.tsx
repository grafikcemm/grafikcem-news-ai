"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  Settings, 
  Shield, 
  Clock, 
  Sparkles, 
  Save, 
  Lock, 
  Cpu,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsClientProps {
  initialPrompt: string;
  envs: {
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
    <div className="p-6 lg:p-10 space-y-10 max-w-5xl mx-auto min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Ayarlar</h1>
        </div>
        <p className="text-[var(--text-secondary)] text-sm">Platform tercihleri, AI konfigürasyonu ve otomasyon yönetimi.</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Personal Voice Prompt */}
        <Card className="bg-[var(--bg-surface)] border-[var(--border-subtle)] rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-[var(--accent)]" />
              <CardTitle className="text-lg">Kişisel Ses Promptu</CardTitle>
            </div>
            <CardDescription className="text-[var(--text-muted)] text-xs">
              AI'nın üretim yaparken size özel bir ton yakalaması için ek kurallar girin.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Örn: 'Daha çok soru sorarak bitir', 'Asla teknik jargon kullanma'..."
                className="w-full h-40 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl p-4 text-sm text-white placeholder-[var(--text-muted)] focus:border-[var(--border-strong)] outline-none resize-none leading-relaxed transition-all font-mono"
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={savePrompt}
                disabled={saving || prompt === initialPrompt}
                className="bg-white text-black hover:opacity-90 font-bold px-8 rounded-xl h-11"
              >
                {saving ? "Kaydediliyor..." : "Ayarları Güncelle"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security & API */}
        <Card className="bg-[var(--bg-surface)] border-[var(--border-subtle)] rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-[var(--text-secondary)]" />
              <CardTitle className="text-lg">Sistem Güvenliği</CardTitle>
            </div>
            <CardDescription className="text-[var(--text-muted)] text-xs">
              Aktif API anahtarları ve servis durumu (Salt Okunur).
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3 p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-[var(--accent)]" />
                    <span className="text-xs font-bold font-mono uppercase tracking-widest text-white">Google Gemini</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-bold text-emerald-400">ACTIVE</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-[var(--text-muted)] font-mono uppercase">API ENDPOINT</Label>
                  <p className="text-xs text-[var(--text-secondary)] truncate font-mono">generativelanguage.googleapis.com</p>
                </div>
              </div>

              <div className="space-y-3 p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[var(--text-secondary)]" />
                    <span className="text-xs font-bold font-mono uppercase tracking-widest text-white">Anthropic (Legacy)</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-[var(--text-muted)] font-mono uppercase">API KEY</Label>
                  <p className="text-xs text-[var(--text-secondary)] font-mono">{envs.anthropicKey}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
              <AlertCircle size={14} className="text-blue-400" />
              <p className="text-[11px] text-blue-100/60 leading-tight">
                Not: Gemini API Key güvenli bir şekilde .env.local üzerinden yönetilmektedir ve UI'da maskelenmiştir.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Cron Timings */}
        <Card className="bg-[var(--bg-surface)] border-[var(--border-subtle)] rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-[var(--text-secondary)]" />
              <CardTitle className="text-lg">Otomasyon Zamanlamaları</CardTitle>
            </div>
            <CardDescription className="text-[var(--text-muted)] text-xs">
              Arka planda çalışan cron işlemlerinin frekansları.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[var(--border-subtle)]">
              {[
                { 
                  title: "Haber Tarama & Skorlama", 
                  desc: "RSS feed'leri taranır ve Gemini ile haber değerleri ölçülür.",
                  cron: "*/30 * * * *",
                  freq: "Her 30 Dakika"
                },
                { 
                  title: "Tweet Taslağı Hazırlama", 
                  desc: "En yüksek skorlu haberler için otomatik taslak tweetler üretilir.",
                  cron: "0 4 * * *",
                  freq: "Her Gün 07:00 (TR)"
                },
                { 
                  title: "Carousel Strateji Planı", 
                  desc: "Rakiplerin analizi yapılarak haftalık içerik stratejisi yenilenir.",
                  cron: "0 0 * * 1",
                  freq: "Her Pazartesi"
                }
              ].map((item, i) => (
                <div key={i} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-bold text-white text-sm">{item.title}</p>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-md">{item.desc}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] text-white px-3 py-1.5 rounded-lg text-[11px] font-mono">
                      {item.cron}
                    </div>
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tight">{item.freq}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
