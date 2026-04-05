"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface FormatInfo {
  id: string;
  label: string;
  icon: string;
  description: string;
  maxLength: string;
  pattern: string;
  structure: string[];
  example: string;
  viralLevel: number; // 1-5
  bestFor: string;
  color: string;
}

const FORMATS: FormatInfo[] = [
  {
    id: "mikro",
    label: "Mikro",
    icon: "⚡",
    description: "Ultra kısa, dikkat çekici tek cümle tweetler",
    maxLength: "Max 100 karakter",
    pattern: "Merak Açığı veya Hızlı Büyüme",
    structure: ["Hook (1 satır)", "Rakam (1 satır)", "Soru (1 satır)"],
    example: "3 günde 1K takipçi. Sırrı: Figma MCP hakkında 5 tweet. Siz?",
    viralLevel: 3,
    bestFor: "Hızlı etkileşim, günlük paylaşım",
    color: "from-yellow-500 to-orange-500",
  },
  {
    id: "standard",
    label: "Standard",
    icon: "💬",
    description: "Klasik tek tweet formatı, karşıtlık ile viral potansiyel",
    maxLength: "240-270 karakter",
    pattern: "Karşıtlık veya Superlativ",
    structure: ["Hook (Karşıtlık)", "Açıklama (2-3 satır)", "Kanıt", "Soru"],
    example: "Diğer tasarımcılar Figma&apos;da saatler geçirirken, ben prompt yazıp 30 saniyede 5 varyasyon çıkarıyorum. Sonuç: Aynı iş, 1/10 zaman. Siz?",
    viralLevel: 4,
    bestFor: "Ana içerik, günlük paylaşım",
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "hook",
    label: "Hook",
    icon: "🎣",
    description: "FOMO veya tartışma başlatma odaklı provokasyon",
    maxLength: "Max 200 karakter",
    pattern: "FOMO veya Tartışma Başlatma",
    structure: ["Provokasyon", "Uyarı", "Soru"],
    example: "Figma MCP bilmeyen tasarımcılar 3 ay içinde işsiz kalacak. Bunu bilen tasarımcılar 10x daha hızlı çalışıyor. Siz?",
    viralLevel: 5,
    bestFor: "Etkileşim patlaması, reply farmı",
    color: "from-red-500 to-pink-500",
  },
  {
    id: "liste",
    label: "Liste",
    icon: "📋",
    description: "Numaralı çekim listesi, araç kombinasyonları",
    maxLength: "Serbest",
    pattern: "Araç Kombinasyonu veya Otorite + Kanıt",
    structure: ["Hook (Superlativ)", "Numaralı Liste (Araçlar/Adımlar)", "Sonuç", "Soru"],
    example: "Freelancer gelirini 10x yapmak için en hızlı yol:\n1. Claude öğren\n2. n8n öğren\n3. Figma API öğren\n3 ay = 10x gelir. Hangisinden başlıyorsunuz?",
    viralLevel: 4,
    bestFor: "Save & RT odaklı pratik içerik",
    color: "from-emerald-500 to-teal-500",
  },
  {
    id: "thread_mini",
    label: "Thread Mini",
    icon: "🧵",
    description: "3 tweetlik kısa thread — problem-çözüm yapısı",
    maxLength: "3 tweet",
    pattern: "Problem-Çözüm",
    structure: ["T1: Hook (Problem) + Teaser", "T2: Çözüm (Araç/Strateji) + Detay", "T3: Sonuç (Rakamlar) + Soru"],
    example: "Problem → Çözüm → Sonuç akışı",
    viralLevel: 4,
    bestFor: "Derin değer + etkileşim",
    color: "from-violet-500 to-purple-500",
  },
  {
    id: "thread_orta",
    label: "Thread Orta",
    icon: "🧵🧵",
    description: "5 tweetlik dönüşüm hikayesi thread",
    maxLength: "5 tweet",
    pattern: "Dönüşüm Hikayesi",
    structure: ["T1: Hook (Önce/Sonra)", "T2: Eski durum (empati)", "T3: Dönüm noktası", "T4: Nasıl uyguladım", "T5: Sonuç + Soru"],
    example: "Önce → Keşif → Uygulama → Sonuç dönüşüm hikayesi",
    viralLevel: 5,
    bestFor: "Sosyal kanıt, takipçi kazanmak",
    color: "from-indigo-500 to-blue-600",
  },
  {
    id: "thread_uzun",
    label: "Thread Uzun",
    icon: "📖",
    description: "10 tweetlik derinlemesine analiz veya tutorial",
    maxLength: "10 tweet",
    pattern: "Algoritma Hack veya Derin Analiz",
    structure: ["T1: Büyük iddia + rakam", "T2-T4: Temel konsept", "T5-T7: Tutorial adımları", "T8-T9: Sık hatalar", "T10: CTA"],
    example: "Mega thread — tam tutorial akışı",
    viralLevel: 5,
    bestFor: "Dwell time + save odaklı mega içerik",
    color: "from-slate-600 to-slate-800",
  },
  {
    id: "thunder",
    label: "Thunder ⚡",
    icon: "🔥",
    description: "Maximum viral potansiyelli premium thread",
    maxLength: "5+ tweet",
    pattern: "En İyisi + Ultimate Guide",
    structure: ["MEGA Hook — şok edici iddia", "Giderek güçlenen hikaye", "Her tweet bağımsız değerli", "Tartışma açan final"],
    example: "Kimsenin geçemeyeceği, bilgi dolu RT makinesi",
    viralLevel: 5,
    bestFor: "Haftalık ana içerik, büyüme odaklı",
    color: "from-amber-500 to-red-600",
  },
];

const VIRAL_PATTERNS = [
  { name: "Karşıtlık", level: 5, desc: "Diğerleri X yaparken, ben Y yapıyorum" },
  { name: "Merak Açığı", level: 5, desc: "Ne biliyor musunuz? Farkı yaratan ne?" },
  { name: "Dönüşüm Hikayesi", level: 4, desc: "Önce: X → Sonra: Y → Değişen: Z" },
  { name: "Hızlı Büyüme + Rakam", level: 5, desc: "X günde Y sonuç" },
  { name: "Superlativ", level: 4, desc: "Gelmiş geçmiş en... En hızlı yol..." },
  { name: "Otorite + Kanıt", level: 4, desc: "6+ yıllık deneyimle + sayısal kanıt" },
  { name: "FOMO", level: 5, desc: "Treni kaçırmak / Artık çok geç" },
  { name: "Problem-Çözüm", level: 3, desc: "Problem: X → Çözüm: Y → Sonuç: Z" },
  { name: "Araç Kombinasyonu", level: 4, desc: "Araç X + Araç Y = Sonuç Z" },
  { name: "Tartışma Başlatma", level: 4, desc: "Popüler görüş: X → Benim görüşüm: Y" },
  { name: "Sosyal Kanıt", level: 4, desc: "X kişi yaptı, hepsi başarılı. Siz?" },
  { name: "Algoritma Hack", level: 5, desc: "Algoritma X&apos;i sever, Y&apos;yi sevmez" },
];

export default function FormatsPage() {
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"formats" | "patterns">("formats");

  const selected = FORMATS.find(f => f.id === selectedFormat);

  function copyExample(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Örnek kopyalandı!");
  }

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--text-primary)">Formatlar</h1>
        <p className="text-(--text-muted) text-sm mt-1">
          8 format + 12 viral pattern — içerik üretim şablonlarını ve stratejilerini incele
        </p>
      </div>

      {/* Toggle */}
      <div className="flex gap-2 bg-(--bg-elevated) border border-border rounded-xl p-1 w-fit">
        <button
          onClick={() => setViewMode("formats")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            viewMode === "formats" ? "bg-accent text-white shadow-md" : "text-(--text-muted) hover:text-(--text-secondary)"
          }`}
        >
          📐 Formatlar (8)
        </button>
        <button
          onClick={() => setViewMode("patterns")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            viewMode === "patterns" ? "bg-accent text-white shadow-md" : "text-(--text-muted) hover:text-(--text-secondary)"
          }`}
        >
          🧬 Viral Patternler (12)
        </button>
      </div>

      {viewMode === "formats" ? (
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Format Grid */}
          <div className="lg:col-span-5 space-y-3">
            {FORMATS.map(f => (
              <button
                key={f.id}
                onClick={() => setSelectedFormat(f.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selectedFormat === f.id
                    ? "border-accent bg-(--accent)/5 shadow-md"
                    : "border-border bg-(--bg-card) hover:border-(--text-muted)/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-linear-to-br ${f.color} flex items-center justify-center text-xl shadow-sm`}>
                    {f.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-(--text-primary)">{f.label}</span>
                      <Badge className="text-[9px] bg-(--bg-elevated) text-(--text-muted)">{f.maxLength}</Badge>
                    </div>
                    <p className="text-xs text-(--text-muted) mt-0.5 truncate">{f.description}</p>
                  </div>
                  <div className="flex gap-0.5 shrink-0">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-1.5 h-4 rounded-full ${
                          i < f.viralLevel ? "bg-accent" : "bg-(--bg-elevated)"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Detail Panel */}
          <div className="lg:col-span-7">
            {selected ? (
              <Card className="bg-(--bg-card) border-border sticky top-4">
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl bg-linear-to-br ${selected.color} flex items-center justify-center text-3xl shadow-lg`}>
                      {selected.icon}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-(--text-primary)">{selected.label}</h2>
                      <p className="text-sm text-(--text-muted)">{selected.description}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-(--bg-elevated) rounded-lg p-3">
                      <p className="text-[10px] text-(--text-muted) uppercase tracking-wider font-medium">Uzunluk</p>
                      <p className="text-sm font-semibold text-(--text-primary) mt-1">{selected.maxLength}</p>
                    </div>
                    <div className="bg-(--bg-elevated) rounded-lg p-3">
                      <p className="text-[10px] text-(--text-muted) uppercase tracking-wider font-medium">Pattern</p>
                      <p className="text-sm font-semibold text-(--text-primary) mt-1">{selected.pattern}</p>
                    </div>
                    <div className="bg-(--bg-elevated) rounded-lg p-3">
                      <p className="text-[10px] text-(--text-muted) uppercase tracking-wider font-medium">Viral Seviye</p>
                      <div className="flex gap-1 mt-1.5">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className={`w-6 h-2 rounded-full ${i < selected.viralLevel ? "bg-accent" : "bg-border"}`} />
                        ))}
                      </div>
                    </div>
                    <div className="bg-(--bg-elevated) rounded-lg p-3">
                      <p className="text-[10px] text-(--text-muted) uppercase tracking-wider font-medium">En İyi Kullanım</p>
                      <p className="text-sm font-semibold text-(--text-primary) mt-1">{selected.bestFor}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wider mb-3">Yapı</p>
                    <div className="space-y-2">
                      {selected.structure.map((s, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-bold shrink-0">
                            {i + 1}
                          </span>
                          <span className="text-sm text-(--text-secondary)">{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wider mb-2">Örnek</p>
                    <div className="bg-(--bg-elevated) rounded-xl p-4 border border-border relative">
                      <p className="text-sm text-(--text-primary) whitespace-pre-wrap leading-relaxed italic">
                        &ldquo;{selected.example}&rdquo;
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyExample(selected.example)}
                        className="absolute top-2 right-2 text-xs text-(--text-muted)"
                      >
                        Kopyala
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="h-full min-h-[400px] border border-dashed border-border rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <p className="text-4xl mb-3">📐</p>
                  <p className="text-(--text-muted) text-sm font-medium">Sol taraftan bir format seçerek detaylarını inceleyin</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Viral Patterns View */
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {VIRAL_PATTERNS.map((p, i) => (
            <Card key={i} className="bg-(--bg-card) border-border hover:border-accent/30 transition-all">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-(--text-muted)">#{i + 1}</span>
                    <h3 className="font-semibold text-sm text-(--text-primary)">{p.name}</h3>
                  </div>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, j) => (
                      <span key={j} className="text-xs">
                        {j < p.level ? "⭐" : "☆"}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-(--text-secondary) leading-relaxed italic">
                  &ldquo;{p.desc}&rdquo;
                </p>
                <div className="mt-3 pt-3 border-t border-border">
                  <Badge className={`text-[10px] ${
                    p.level >= 5 ? "bg-red-100 text-red-700" :
                    p.level >= 4 ? "bg-amber-100 text-amber-700" :
                    "bg-slate-100 text-slate-600"
                  }`}>
                    {p.level >= 5 ? "Çok Yüksek Viral" : p.level >= 4 ? "Yüksek Viral" : "Orta Viral"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
