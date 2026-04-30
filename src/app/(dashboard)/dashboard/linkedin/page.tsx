"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  Sparkles, 
  Copy, 
  BarChart, 
  Calendar, 
  Settings2,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = ['Post Üretici', 'Viral Analiz', 'Haftalık Plan', 'Brand DNA'];
const FORMATS = ['HOOK', 'STORY', 'LIST', 'INSIGHT', 'CAROUSEL_STORY'];

export default function LinkedinPage() {
  const [activeTab, setActiveTab] = useState(TABS[0]);
  
  // Brand DNA State
  const [dna, setDna] = useState({
    targetAudience: '',
    toneDescription: '',
    expertiseAreas: '',
    postingGoal: '',
    avoidTopics: '',
    referencePosts: ''
  });
  const [dnaSaving, setDnaSaving] = useState(false);
  const [dnaSaved, setDnaSaved] = useState(false);

  // Post Generator State
  const [sourceMode, setSourceMode] = useState<'news' | 'manual'>('news');
  const [newsPool, setNewsPool] = useState<any[]>([]);
  const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [selectedFormat, setSelectedFormat] = useState(FORMATS[0]);
  const [generating, setGenerating] = useState(false);
  const [generatedPost, setGeneratedPost] = useState<any>(null);

  // Viral Analysis State
  const [analysisInput, setAnalysisInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // Weekly Plan State
  const [planStartDate, setPlanStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [planning, setPlanning] = useState(false);
  const [weeklyPlan, setWeeklyPlan] = useState<any>(null);

  useEffect(() => {
    fetchDna();
    fetchNews();
  }, []);

  async function fetchDna() {
    try {
      const res = await fetch('/api/linkedin/brand-dna');
      if (res.ok) {
        const data = await res.json();
        if (data.id) {
          setDna({
            targetAudience: data.target_audience || '',
            toneDescription: data.tone_description || '',
            expertiseAreas: data.expertise_areas || '',
            postingGoal: data.posting_goal || '',
            avoidTopics: data.avoid_topics || '',
            referencePosts: data.reference_posts || ''
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchNews() {
    const { data } = await supabase
      .from('news_items')
      .select('*')
      .gte('viral_score', 50)
      .order('viral_score', { ascending: false })
      .limit(20);
    if (data) setNewsPool(data);
  }

  async function saveDna() {
    setDnaSaving(true);
    try {
      const res = await fetch('/api/linkedin/brand-dna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dna)
      });
      if (res.ok) {
        setDnaSaved(true);
        setTimeout(() => setDnaSaved(false), 2000);
      } else {
        toast.error('Kaydedilemedi');
      }
    } catch (err) {
      toast.error('Bir hata oluştu');
    } finally {
      setDnaSaving(false);
    }
  }

  async function handleGeneratePost() {
    let input = manualInput;
    if (sourceMode === 'news' && selectedNewsId) {
      const selectedNews = newsPool.find(n => n.id === selectedNewsId);
      input = selectedNews ? (selectedNews.title_tr || selectedNews.title) + "\\n" + (selectedNews.summary_tr || selectedNews.summary) : '';
    }

    if (!input.trim()) {
      toast.error('Lütfen bir kaynak veya metin girin');
      return;
    }

    setGenerating(true);
    setGeneratedPost(null);
    try {
      const res = await fetch('/api/linkedin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: selectedFormat,
          input,
          sourceNewsId: sourceMode === 'news' ? selectedNewsId : null
        })
      });
      const data = await res.json();
      if (res.ok) {
        setGeneratedPost(data);
      } else {
        toast.error(data.error || 'Üretim başarısız');
      }
    } catch (err) {
      toast.error('Bir hata oluştu');
    } finally {
      setGenerating(false);
    }
  }

  async function handleAnalyze() {
    if (!analysisInput.trim()) return;
    setAnalyzing(true);
    setAnalysisResult(null);
    try {
      const res = await fetch('/api/linkedin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: 'ANALYSIS_ONLY', // We'll hijack the generate endpoint or use a dedicated one. Wait, the prompt says "Viral Analiz sekmesi: Mevcut bir LinkedIn postunu yapıştır ve analiz et." I will need to add a dedicated route or logic. I'll add logic to handle it via a new API if needed, or just call Gemini here. Wait, I should create a dedicated API route or update `generate` to handle it. Actually, I'll just use the `generate` endpoint but skip generation and only run VIRAL_ANALYSIS_PROMPT. Oh wait, there isn't a specific route for analysis only in the plan. I'll create `api/linkedin/analyze/route.ts` quickly.
          input: analysisInput
        })
      });
      // I'll implement `api/linkedin/analyze/route.ts` separately
      const data = await res.json();
      if (res.ok) {
        setAnalysisResult(data);
      } else {
        toast.error(data.error);
      }
    } catch (err) {
      toast.error('Analiz hatası');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleGeneratePlan() {
    setPlanning(true);
    setWeeklyPlan(null);
    try {
      const res = await fetch('/api/linkedin/weekly-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: planStartDate })
      });
      const data = await res.json();
      if (res.ok) {
        setWeeklyPlan(data);
      } else {
        toast.error(data.error);
      }
    } catch (err) {
      toast.error('Plan oluşturulamadı');
    } finally {
      setPlanning(false);
    }
  }

  async function handleAddToCalendar() {
    if (!weeklyPlan || !weeklyPlan.plan) return;
    try {
      const inserts = weeklyPlan.plan.map((p: any) => ({
        title: p.topic,
        content_type: 'linkedin',
        format: p.format,
        scheduled_date: p.date,
        source_id: p.source_news_id !== 'null' ? p.source_news_id : null,
        notes: p.rationale
      }));
      const { error } = await supabase.from('content_calendar').insert(inserts);
      if (error) throw error;
      toast.success('Takvime eklendi');
    } catch (err) {
      toast.error('Takvime eklenirken hata oluştu');
    }
  }

  function getScoreColor(score: number) {
    if (score >= 70) return 'text-[var(--success)]';
    if (score >= 40) return 'text-[var(--warning)]';
    return 'text-[var(--danger)]';
  }
  
  function getScoreBg(score: number) {
    if (score >= 70) return 'bg-[var(--success)]';
    if (score >= 40) return 'bg-[var(--warning)]';
    return 'bg-[var(--danger)]';
  }

  return (
    <div className="flex flex-col h-[calc(100vh-52px)] bg-[var(--bg-base)]">
      {/* Tabs Header */}
      <div className="flex items-center px-6 h-14 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
        <h1 className="text-sm font-bold font-mono tracking-wider mr-8">LINKEDIN</h1>
        <div className="flex items-center gap-2">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 text-xs font-bold rounded-lg transition-all",
                activeTab === tab 
                  ? "bg-white text-[var(--bg-base)]" 
                  : "text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-elevated)]"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'Post Üretici' && (
          <div className="flex h-full">
            {/* Left Panel: Source */}
            <div className="w-[400px] flex flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <h2 className="text-xs font-bold font-mono text-[var(--text-muted)]">KAYNAK SEÇ</h2>
              </div>
              <div className="p-4 border-b border-[var(--border-subtle)] flex gap-2">
                <Button 
                  variant={sourceMode === 'news' ? 'default' : 'outline'} 
                  onClick={() => setSourceMode('news')}
                  className="flex-1 text-xs h-8"
                >
                  Haber Havuzu
                </Button>
                <Button 
                  variant={sourceMode === 'manual' ? 'default' : 'outline'} 
                  onClick={() => setSourceMode('manual')}
                  className="flex-1 text-xs h-8"
                >
                  Serbest Giriş
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {sourceMode === 'news' ? (
                  <div className="flex flex-col">
                    {newsPool.length === 0 ? (
                      <div className="p-8 text-center text-[var(--text-muted)] text-sm">Yüksek skorlu haber bulunamadı.</div>
                    ) : (
                      newsPool.map(news => (
                        <div 
                          key={news.id} 
                          onClick={() => { setSelectedNewsId(news.id); setManualInput(news.title_tr || news.title); }}
                          className={cn(
                            "p-[12px] px-[16px] border-b border-[var(--border-subtle)] cursor-pointer hover:bg-[var(--bg-elevated)] transition-colors group",
                            selectedNewsId === news.id ? "bg-[var(--bg-elevated)] border-r-2 border-r-white" : ""
                          )}
                        >
                          <div className="flex gap-3">
                            <div className={cn("w-8 h-8 rounded shrink-0 flex items-center justify-center text-[10px] font-bold font-mono bg-[var(--bg-base)] border border-[var(--border-default)]", getScoreColor(news.viral_score))}>
                              {news.viral_score}
                            </div>
                            <div className="flex-1 text-xs line-clamp-2 mt-1">
                              {news.title_tr || news.title}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="p-4">
                    <textarea 
                      className="w-full min-h-[120px] bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[var(--border-strong)] resize-y"
                      placeholder="Fikir, not veya link yapıştır..."
                      value={manualInput}
                      onChange={e => setManualInput(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel: Generator */}
            <div className="flex-1 flex flex-col bg-[var(--bg-base)] overflow-y-auto custom-scrollbar p-6 space-y-6">
              <div>
                <h3 className="text-xs font-bold font-mono text-[var(--text-muted)] mb-3">FORMAT SEÇİMİ</h3>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
                  {FORMATS.map(f => (
                    <button
                      key={f}
                      onClick={() => setSelectedFormat(f)}
                      className={cn(
                        "py-3 px-2 rounded-xl text-xs font-bold transition-all border",
                        selectedFormat === f 
                          ? "bg-white text-[var(--bg-base)] border-white shadow-sm"
                          : "bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-default)] hover:bg-[var(--bg-elevated)]"
                      )}
                    >
                      {f.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <Button 
                onClick={handleGeneratePost} 
                disabled={generating || (!manualInput.trim() && sourceMode === 'manual') || (!selectedNewsId && sourceMode === 'news')}
                className="w-full h-12 text-sm font-bold bg-white text-black hover:bg-neutral-200"
              >
                {generating ? (
                  <span className="flex items-center gap-2 animate-pulse"><Sparkles size={16}/> Gemini düşünüyor...</span>
                ) : (
                  <span className="flex items-center gap-2"><Sparkles size={16}/> LinkedIn Postu Üret</span>
                )}
              </Button>

              {generatedPost ? (
                <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[var(--radius-lg)] p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2">
                  <div className="whitespace-pre-wrap text-[14px] leading-[1.7] text-white/90 font-light">
                    {generatedPost.post}
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)]">
                    <div className={cn(
                      "text-xs font-mono font-bold",
                      generatedPost.charCount < 1300 ? "text-[var(--success)]" : generatedPost.charCount <= 2000 ? "text-[var(--warning)]" : "text-[var(--danger)]"
                    )}>
                      {generatedPost.charCount} Karakter
                    </div>
                    <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(generatedPost.post); toast.success('Kopyalandı'); }}>
                      <Copy size={14} className="mr-2"/> Kopyala
                    </Button>
                  </div>

                  <div className="bg-[var(--bg-base)] rounded-xl p-4 border border-[var(--border-subtle)]">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-mono text-[var(--text-muted)]">VİRAL SKOR</span>
                      <div className={cn("text-2xl font-bold font-mono", getScoreColor(generatedPost.viralScore))}>
                        {generatedPost.viralScore}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {generatedPost.viralSignals?.map((s: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20 rounded text-[10px] font-mono">{s}</span>
                      ))}
                    </div>
                    {generatedPost.improvementTip && (
                      <p className="text-xs text-[var(--text-muted)] italic">💡 {generatedPost.improvementTip}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 border-2 border-dashed border-[var(--border-default)] rounded-2xl flex items-center justify-center text-[var(--text-muted)]">
                  İçerik üretmek için format seç ve kaynak gir
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'Viral Analiz' && (
          <div className="p-6 max-w-4xl mx-auto space-y-6">
            <h2 className="text-lg font-bold">Viral Analiz</h2>
            <textarea 
              className="w-full min-h-[200px] bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl p-4 text-sm text-white focus:outline-none focus:border-[var(--border-strong)]"
              placeholder="LinkedIn postunu buraya yapıştır..."
              value={analysisInput}
              onChange={e => setAnalysisInput(e.target.value)}
            />
            <Button onClick={handleAnalyze} disabled={analyzing || !analysisInput.trim()} className="w-full h-12 text-sm bg-white text-black hover:bg-neutral-200">
              {analyzing ? <span className="animate-pulse">Analiz ediliyor...</span> : "Analiz Et"}
            </Button>

            {analysisResult && analysisResult.breakdown && (
              <div className="space-y-6 mt-8 animate-in fade-in">
                <div className="flex items-center gap-4">
                  <div className={cn("text-4xl font-black font-mono", getScoreColor(analysisResult.total_score))}>
                    {analysisResult.total_score}
                  </div>
                  <div className="text-sm text-[var(--text-muted)]">Genel Viral<br/>Skor</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(analysisResult.breakdown).map(([key, val]: any) => (
                    <div key={key} className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border-subtle)]">
                      <div className="flex justify-between text-xs font-mono mb-2">
                        <span className="text-[var(--text-muted)] uppercase">{key.replace('_', ' ')}</span>
                        <span className="text-white">{val}/20</span>
                      </div>
                      <div className="h-1.5 bg-[var(--bg-base)] rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all duration-1000", getScoreBg(val * 5))} style={{ width: `${(val/20)*100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  {analysisResult.signals?.map((s: string, i: number) => (
                    <span key={`sig-${i}`} className="px-2 py-1 bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20 rounded text-xs font-medium">{s}</span>
                  ))}
                  {analysisResult.weak_points?.map((s: string, i: number) => (
                    <span key={`weak-${i}`} className="px-2 py-1 bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/20 rounded text-xs font-medium">{s}</span>
                  ))}
                </div>

                {analysisResult.improvement_tip && (
                  <div className="p-4 border border-blue-500/20 bg-blue-500/5 rounded-xl">
                    <p className="text-sm text-blue-200">💡 {analysisResult.improvement_tip}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'Haftalık Plan' && (
          <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
              <input 
                type="date" 
                className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg h-10 px-3 text-sm text-white focus:outline-none"
                value={planStartDate}
                onChange={e => setPlanStartDate(e.target.value)}
              />
              <Button onClick={handleGeneratePlan} disabled={planning} className="h-10 px-6 bg-white text-black hover:bg-neutral-200">
                {planning ? <span className="animate-pulse">Oluşturuluyor...</span> : "Haftalık Plan Oluştur"}
              </Button>
            </div>

            {weeklyPlan?.plan && (
              <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-2xl overflow-hidden animate-in fade-in">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[var(--bg-surface)] text-[var(--text-muted)] text-xs font-mono">
                    <tr>
                      <th className="px-6 py-4 font-normal">Gün</th>
                      <th className="px-6 py-4 font-normal">Tarih</th>
                      <th className="px-6 py-4 font-normal">Format</th>
                      <th className="px-6 py-4 font-normal">Konu</th>
                      <th className="px-6 py-4 font-normal">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {weeklyPlan.plan.map((item: any, i: number) => (
                      <tr key={i} className="hover:bg-[var(--bg-surface)]/50 transition-colors">
                        <td className="px-6 py-4 font-medium">{item.day}</td>
                        <td className="px-6 py-4 text-[var(--text-muted)]">{item.date}</td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2 py-1 border rounded text-[10px] font-mono",
                            item.format.toLowerCase() === 'hook' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                            item.format.toLowerCase() === 'story' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                            item.format.toLowerCase() === 'list' ? "bg-teal-500/10 text-teal-400 border-teal-500/20" :
                            item.format.toLowerCase() === 'insight' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                            "bg-pink-500/10 text-pink-400 border-pink-500/20"
                          )}>{item.format}</span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="line-clamp-2">{item.topic}</p>
                          <p className="text-[10px] text-[var(--text-muted)] mt-1">{item.rationale}</p>
                        </td>
                        <td className="px-6 py-4">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedFormat(item.format.toUpperCase().replace(' ', '_'));
                              if (item.source_news_id && item.source_news_id !== 'null') {
                                setSourceMode('news');
                                setSelectedNewsId(item.source_news_id);
                              } else {
                                setSourceMode('manual');
                                setManualInput(item.topic);
                              }
                              setActiveTab('Post Üretici');
                            }}
                          >
                            Üret
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-4 border-t border-[var(--border-subtle)] flex justify-end bg-[var(--bg-surface)]">
                  <Button variant="secondary" onClick={handleAddToCalendar}>
                    <Calendar className="w-4 h-4 mr-2" />
                    Takvime Ekle
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'Brand DNA' && (
          <div className="p-6 max-w-3xl mx-auto space-y-6">
            <h2 className="text-lg font-bold">Brand DNA Ayarları</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold font-mono text-[var(--text-muted)] mb-2">HEDEF KİTLE</label>
                <textarea 
                  className="w-full min-h-[80px] bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl p-3 text-sm focus:border-[var(--border-strong)] outline-none"
                  placeholder="Freelancerlar, KOBİ sahipleri, 25-45 yaş arası tasarım meraklıları..."
                  value={dna.targetAudience}
                  onChange={e => setDna({ ...dna, targetAudience: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold font-mono text-[var(--text-muted)] mb-2">YAZIM TONU</label>
                <textarea 
                  className="w-full min-h-[80px] bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl p-3 text-sm focus:border-[var(--border-strong)] outline-none"
                  placeholder="Uzman abi. Samimi ama profesyonel. Vaaz vermez, tecrübe paylaşır..."
                  value={dna.toneDescription}
                  onChange={e => setDna({ ...dna, toneDescription: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold font-mono text-[var(--text-muted)] mb-2">UZMANLIK ALANLARI</label>
                <textarea 
                  className="w-full min-h-[60px] bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl p-3 text-sm focus:border-[var(--border-strong)] outline-none"
                  placeholder="Logo tasarımı, marka kimliği, AI görsel üretimi..."
                  value={dna.expertiseAreas}
                  onChange={e => setDna({ ...dna, expertiseAreas: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold font-mono text-[var(--text-muted)] mb-2">PAYLAŞIM AMACI</label>
                <textarea 
                  className="w-full min-h-[60px] bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl p-3 text-sm focus:border-[var(--border-strong)] outline-none"
                  placeholder="Tasarım sektöründe otorite kurmak, potansiyel müşteri çekmek..."
                  value={dna.postingGoal}
                  onChange={e => setDna({ ...dna, postingGoal: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold font-mono text-[var(--text-muted)] mb-2">YAZILMAYACAK KONULAR</label>
                <textarea 
                  className="w-full min-h-[60px] bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl p-3 text-sm focus:border-[var(--border-strong)] outline-none"
                  placeholder="Siyaset, gündelik tartışmalar..."
                  value={dna.avoidTopics}
                  onChange={e => setDna({ ...dna, avoidTopics: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold font-mono text-[var(--text-muted)] mb-2">REFERANS POSTLAR</label>
                <textarea 
                  className="w-full min-h-[100px] bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl p-3 text-sm focus:border-[var(--border-strong)] outline-none"
                  placeholder="Beğendiğin LinkedIn postlarından 1-2 örnek yapıştır..."
                  value={dna.referencePosts}
                  onChange={e => setDna({ ...dna, referencePosts: e.target.value })}
                />
              </div>
            </div>

            <Button onClick={saveDna} disabled={dnaSaving} className="w-full h-12 bg-white text-black hover:bg-neutral-200">
              {dnaSaving ? "Kaydediliyor..." : dnaSaved ? "Kaydedildi ✓" : "Brand DNA'yı Kaydet"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
