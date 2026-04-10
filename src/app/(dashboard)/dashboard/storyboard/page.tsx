"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function StoryboardPage() {
  // Hook State
  const [hookTopic, setHookTopic] = useState("");
  const [hookPlatform, setHookPlatform] = useState("@grafikcem");
  const [hookFormat, setHookFormat] = useState("Reel");
  const [hookTone, setHookTone] = useState("Eğitici");
  const [hooks, setHooks] = useState<any[]>([]);
  const [loadingHook, setLoadingHook] = useState(false);

  // Storyboard State
  const [storyIdea, setStoryIdea] = useState("");
  const [storyFormat, setStoryFormat] = useState("Reel 15sn");
  const [storyLocation, setStoryLocation] = useState("İç mekan");
  const [storyboard, setStoryboard] = useState<any>(null);
  const [loadingStory, setLoadingStory] = useState(false);

  const generateHooks = async () => {
    if (!hookTopic) return;
    setLoadingHook(true);
    try {
      const res = await fetch("/api/storyboard/hook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: hookTopic, platform: hookPlatform, format: hookFormat, tone: hookTone })
      });
      const data = await res.json();
      if (data.hooks) setHooks(data.hooks);
    } catch (e) {
      console.error(e);
      alert("Hata oluştu.");
    } finally {
      setLoadingHook(false);
    }
  };

  const generateStoryboard = async () => {
    if (!storyIdea) return;
    setLoadingStory(true);
    try {
      const res = await fetch("/api/storyboard/scenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: storyIdea, format: storyFormat, location: storyLocation })
      });
      const data = await res.json();
      if (data) setStoryboard(data);
    } catch (e) {
      console.error(e);
      alert("Hata oluştu.");
    } finally {
      setLoadingStory(false);
    }
  };

  const saveHook = async (hookTxt: string) => {
    await supabase.from("content_items").insert([{
      title: "Yeni Fikir",
      platform: hookPlatform,
      format: hookFormat,
      hook: hookTxt,
      status: "draft"
    }]);
    alert("Takvime eklendi!");
  };

  const saveStoryboard = async () => {
    if (!storyboard) return;
    await supabase.from("storyboards").insert([{
      title: storyboard.title || "Yeni Storyboard",
      platform: "TBD",
      format: storyFormat,
      scenes: storyboard.scenes,
      shooting_tips: storyboard.general_tips
    }]);
    alert("Storyboard kaydedildi!");
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto min-h-screen bg-[var(--surface-base)]">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Storyboard Studio</h1>
        <p className="text-[var(--text-secondary)] text-sm mt-1">İçerikleriniz için viral hooklar ve detaylı çekim planları oluşturun.</p>
      </div>

      <Tabs defaultValue="hook" className="mt-8">
        <TabsList className="bg-[var(--surface-base)] border border-[var(--border-subtle)] h-11 p-1">
          <TabsTrigger value="hook" className="data-[state=active]:bg-[var(--surface-raised)] data-[state=active]:text-[var(--accent)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--accent)] text-[var(--text-tertiary)]">Hook Oluşturucu</TabsTrigger>
          <TabsTrigger value="storyboard" className="data-[state=active]:bg-[var(--surface-raised)] data-[state=active]:text-[var(--accent)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--accent)] text-[var(--text-tertiary)]">Storyboard Oluşturucu</TabsTrigger>
        </TabsList>

        <TabsContent value="hook" className="mt-6 flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-[350px] space-y-4 shrink-0 bg-[var(--surface-raised)] border border-[var(--border-subtle)] p-5 rounded-[var(--radius-lg)]">
            <h3 className="font-semibold text-[var(--text-primary)] mb-4">Hook Parametreleri</h3>
            <Textarea placeholder="İçerik konusu..." value={hookTopic} onChange={e => setHookTopic(e.target.value)} className="bg-[var(--surface-overlay)] border-[var(--border-default)] min-h-[100px] text-[var(--text-primary)] rounded-[var(--radius-md)] focus:border-[var(--accent)]" />
            <Select value={hookPlatform} onValueChange={(v) => setHookPlatform(v ?? '')}>
              <SelectTrigger className="bg-[var(--surface-overlay)] border-[var(--border-default)] text-[var(--text-primary)] rounded-[var(--radius-md)]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['@grafikcem', '@maskulenkod', 'LinkedIn'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={hookFormat} onValueChange={(v) => setHookFormat(v ?? '')}>
              <SelectTrigger className="bg-[var(--surface-overlay)] border-[var(--border-default)] text-[var(--text-primary)] rounded-[var(--radius-md)]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Reel', 'Carousel', 'Story', 'Post'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={hookTone} onValueChange={(v) => setHookTone(v ?? '')}>
              <SelectTrigger className="bg-[var(--surface-overlay)] border-[var(--border-default)] text-[var(--text-primary)] rounded-[var(--radius-md)]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Eğitici', 'Provokasyon', 'Hikaye', 'İstatistik', 'Soru'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={generateHooks} disabled={loadingHook} className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white mt-2">
              {loadingHook ? "Üretiliyor..." : "Hook Üret"}
            </Button>
          </div>

          <div className="flex-1 space-y-4">
             {hooks.length === 0 && !loadingHook && (
               <div className="h-full min-h-[300px] bg-[var(--surface-base)] border border-dashed border-[var(--border-subtle)] rounded-[var(--radius-lg)] flex items-center justify-center text-[var(--text-tertiary)] text-sm">Üretilen hooklar burada görünecek.</div>
             )}
             {hooks.map((h, i) => (
               <Card key={i} className="bg-[var(--surface-raised)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)]">
                 <CardContent className="p-5 flex flex-col items-start gap-3">
                   <Badge className="bg-[var(--surface-overlay)] text-[var(--text-tertiary)] border-[var(--border-subtle)] hover:bg-[var(--surface-overlay)]">{h.type}</Badge>
                   <p className="text-xl font-bold text-[var(--text-primary)] italic">"{h.text}"</p>
                   <p className="text-sm text-[var(--text-secondary)]">💡 Neden işe yarar: {h.why}</p>
                   <div className="flex gap-2 mt-2 w-full justify-end">
                     <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(h.text)} className="bg-[var(--surface-overlay)] border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]">Kopyala</Button>
                     <Button size="sm" onClick={() => saveHook(h.text)} className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white">Takvime Ekle</Button>
                   </div>
                 </CardContent>
               </Card>
             ))}
          </div>
        </TabsContent>

        <TabsContent value="storyboard" className="mt-6 flex flex-col gap-8">
           <div className="bg-[var(--surface-raised)] border border-[var(--border-subtle)] p-5 rounded-[var(--radius-lg)] flex flex-col md:flex-row gap-4">
            <Textarea placeholder="İçerik fikri..." value={storyIdea} onChange={e => setStoryIdea(e.target.value)} className="bg-[var(--surface-overlay)] border-[var(--border-default)] text-[var(--text-primary)] md:w-1/2 min-h-[100px] rounded-[var(--radius-md)] focus:border-[var(--accent)]" />
            <div className="flex flex-col gap-4 flex-1">
              <Select value={storyFormat} onValueChange={(v) => setStoryFormat(v ?? '')}>
                <SelectTrigger className="bg-[var(--surface-overlay)] border-[var(--border-default)] text-[var(--text-primary)] rounded-[var(--radius-md)]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Reel 15sn', 'Reel 30sn', 'Reel 60sn', 'Carousel'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={storyLocation} onValueChange={(v) => setStoryLocation(v ?? '')}>
                <SelectTrigger className="bg-[var(--surface-overlay)] border-[var(--border-default)] text-[var(--text-primary)] rounded-[var(--radius-md)]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['İç mekan', 'Dış mekan', 'Masa başı', 'Stüdyo'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={generateStoryboard} disabled={loadingStory} className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white h-full max-h-10 mt-auto">
                {loadingStory ? "Oluşturuluyor..." : "Storyboard Oluştur"}
              </Button>
            </div>
           </div>

           {storyboard && (
             <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)]">{storyboard.title}</h3>
                    <p className="text-[var(--text-tertiary)] text-xs mt-1">Toplam Süre: {storyboard.total_duration}</p>
                  </div>
                  <Button onClick={saveStoryboard} className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold">Storyboard'u Kaydet</Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {storyboard.scenes?.map((scene: any, i: number) => (
                    <Card key={i} className="bg-[var(--surface-raised)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)]">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-bold text-[var(--text-primary)]">Sahne {scene.scene_number}</span>
                          <span className="text-xs bg-[var(--surface-overlay)] border border-[var(--border-default)] px-2 py-0.5 rounded text-[var(--text-secondary)]">{scene.duration}</span>
                        </div>
                        <p className="text-sm font-semibold text-[var(--text-primary)] mb-4 line-clamp-3 leading-snug">{scene.description}</p>
                        <div className="space-y-1.5 text-xs text-[var(--text-secondary)]">
                          <p><strong className="text-[var(--text-primary)]">Açı:</strong> {scene.angle}</p>
                          <p><strong className="text-[var(--text-primary)]">Hareket:</strong> {scene.movement}</p>
                          <p><strong className="text-[var(--text-primary)]">Işık:</strong> {scene.lighting}</p>
                        </div>
                        <div className="mt-4 p-2 bg-[var(--accent-subtle)] text-[var(--accent)] rounded-[var(--radius-sm)] text-xs">
                          📱 {scene.iphone_tip}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {storyboard.general_tips && (
                  <Card className="bg-[var(--surface-raised)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] mt-4">
                     <CardContent className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div>
                          <strong className="text-[var(--accent)] block mb-1">🎤 Ses ve Mikrofon</strong>
                          <p className="text-[var(--text-secondary)]">{storyboard.general_tips.microphone_note}</p>
                        </div>
                        <div>
                          <strong className="text-[var(--accent)] block mb-1">📷 Stabilizasyon</strong>
                          <p className="text-[var(--text-secondary)]">{storyboard.general_tips.stabilization}</p>
                        </div>
                        <div>
                          <strong className="text-[var(--accent)] block mb-1">⚙️ Ayarlar</strong>
                          <p className="text-[var(--text-secondary)]">{storyboard.general_tips.settings}</p>
                        </div>
                        <div>
                          <strong className="text-[var(--accent)] block mb-1">✂️ Kurgu (Editing)</strong>
                          <p className="text-[var(--text-secondary)]">{storyboard.general_tips.editing_note}</p>
                        </div>
                     </CardContent>
                  </Card>
                )}
             </div>
           )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
