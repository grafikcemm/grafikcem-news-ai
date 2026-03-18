"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface StyleProfile {
  avg_length: number;
  uses_emoji: boolean;
  emoji_frequency: string;
  tone: string;
  sentence_style: string;
  common_openers: string[];
  common_closers: string[];
  vocabulary_level: string;
  humor_style: string;
  signature_phrases: string[];
  topics_covered: string[];
  style_summary: string;
}

export default function StyleProfilePage() {
  const [profile, setProfile] = useState<StyleProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [tweetsAnalyzed, setTweetsAnalyzed] = useState<number | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    setLoading(true);
    try {
      const res = await fetch("/api/style/analyze");
      const data = await res.json();
      if (data.profile) setProfile(data.profile as StyleProfile);
    } catch {
      // No profile yet
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyze(refresh = false) {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/style/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
      const data = await res.json();
      if (res.ok && data.profile) {
        setProfile(data.profile as StyleProfile);
        setTweetsAnalyzed(data.tweets_analyzed || null);
        toast.success(
          data.cached ? "Mevcut profil yüklendi" : `${data.tweets_analyzed} tweet analiz edildi!`
        );
      } else {
        toast.error(data.error || "Analiz başarısız");
      }
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setAnalyzing(false);
    }
  }

  const statItems = profile
    ? [
        { label: "Ort. Tweet Uzunluğu", value: `${profile.avg_length} karakter` },
        { label: "Emoji Kullanımı", value: profile.emoji_frequency },
        { label: "Ton", value: profile.tone },
        { label: "Cümle Stili", value: profile.sentence_style },
        { label: "Kelime Seviyesi", value: profile.vocabulary_level },
        { label: "Mizah Stili", value: profile.humor_style },
      ]
    : [];

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Stil Profili</h1>
          <p className="text-slate-500 text-sm mt-1">
            @grafikcem yazım stili analizi — tüm tweet üretiminde kullanılır
          </p>
        </div>
        <div className="flex gap-2">
          {profile && (
            <Button
              variant="outline"
              onClick={() => handleAnalyze(true)}
              disabled={analyzing}
              className="text-sm"
            >
              {analyzing ? "Analiz ediliyor..." : "Yenile"}
            </Button>
          )}
          {!profile && (
            <Button
              onClick={() => handleAnalyze(false)}
              disabled={analyzing}
              className="bg-linear-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 text-white"
            >
              {analyzing ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" className="opacity-25" />
                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
                  </svg>
                  Analiz Ediliyor...
                </span>
              ) : (
                "Stili Analiz Et"
              )}
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : !profile ? (
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-blue-100 to-violet-100 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-violet-500"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/></svg>
            </div>
            <h3 className="font-semibold text-slate-800 text-lg mb-2">Henüz stil profili yok</h3>
            <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
              @grafikcem hesabının son 200 tweetini analiz ederek kişisel yazım stili profili oluştur.
              Bu profil tüm tweet üretiminde kullanılacak.
            </p>
            <Button
              onClick={() => handleAnalyze(false)}
              disabled={analyzing}
              className="bg-linear-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 text-white px-8"
            >
              {analyzing ? "Analiz Ediliyor..." : "Stili Analiz Et"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Style summary */}
          <Card className="border-0 shadow-sm bg-linear-to-r from-slate-900 to-slate-800 text-white">
            <CardContent className="p-6">
              <p className="text-xs font-medium text-blue-300 uppercase tracking-wider mb-2">Stil Özeti</p>
              <p className="text-white text-base leading-relaxed">{profile.style_summary}</p>
              {tweetsAnalyzed && (
                <p className="text-slate-400 text-xs mt-3">{tweetsAnalyzed} tweet analiz edildi</p>
              )}
            </CardContent>
          </Card>

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {statItems.map((item) => (
              <Card key={item.label} className="border-0 shadow-sm bg-white">
                <CardContent className="p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{item.label}</p>
                  <p className="text-slate-900 font-semibold capitalize">{item.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Common openers/closers */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-900">Sık Açılışlar</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {(profile.common_openers || []).map((opener, i) => (
                  <Badge key={i} variant="secondary" className="text-xs font-normal">{opener}</Badge>
                ))}
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-900">Sık Kapanışlar</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {(profile.common_closers || []).map((closer, i) => (
                  <Badge key={i} variant="secondary" className="text-xs font-normal">{closer}</Badge>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Signature phrases */}
          {profile.signature_phrases?.length > 0 && (
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-900">İmza İfadeler</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {profile.signature_phrases.map((phrase, i) => (
                  <Badge key={i} className="text-xs font-normal bg-violet-100 text-violet-700 hover:bg-violet-100">{phrase}</Badge>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Topics */}
          {profile.topics_covered?.length > 0 && (
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-900">Kapsanan Konular</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {profile.topics_covered.map((topic, i) => (
                  <Badge key={i} variant="outline" className="text-xs font-normal">{topic}</Badge>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="text-center">
            <Button
              variant="outline"
              onClick={() => handleAnalyze(true)}
              disabled={analyzing}
              className="text-sm text-slate-500"
            >
              {analyzing ? "Yenileniyor..." : "Stili Yeniden Analiz Et"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
