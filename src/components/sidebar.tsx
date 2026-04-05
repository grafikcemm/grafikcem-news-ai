"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/lib/supabase";

// --- ICONS ---

// Just use simple robust SVG vectors
function IconWrapper({ d, circle }: { d?: string; circle?: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {d && <path d={d} />}
      {circle && <circle cx="12" cy="12" r="10" />}
      {!d && !circle && <rect width="18" height="18" x="3" y="3" rx="2" />}
    </svg>
  );
}

interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  dot?: string;
}

interface NavGroup {
  title?: string;
  heading?: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "RESEARCH",
    items: [
      { label: "Haber Havuzu", href: "/dashboard/news-pool", icon: <IconWrapper d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2 M18 14h-8 M15 18h-5 M10 6h8v4h-8V6Z" /> },
      { label: "Konular", href: "/dashboard/topics", icon: <IconWrapper d="M4 6h16 M4 12h16 M4 18h7" /> },
      { label: "Formatlar", href: "/dashboard/formats", icon: <IconWrapper d="M3 3h18v18H3z M8 3v18 M16 3v18" /> },
    ]
  },
  {
    title: "CREATE",
    items: [
      { label: "@grafikcem", href: "/channels/grafikcem", dot: "#E879A0" },
      { label: "@maskulenkod", href: "/channels/maskulenkod", dot: "#60A5FA" },
      { label: "LinkedIn", href: "/channels/linkedin", dot: "#34D399" },
    ]
  },
  {
    title: "CONTENT",
    items: [
      { label: "Storyboard Studio", href: "/dashboard/storyboard", icon: <IconWrapper d="M3 3h18v18H3z M3 9h18 M3 15h18" /> },
      { label: "İçerik Takvimi", href: "/dashboard/content-calendar", icon: <IconWrapper d="M3 4v16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z M3 10h18 M8 2v4 M16 2v4" /> },
      { label: "Haftalık Plan", href: "/dashboard/content-plan", icon: <IconWrapper d="M21 12H3 M21 6H3 M21 18H3" /> },
    ]
  },
  {
    heading: "INSIGHTS",
    items: [
      { label: "Yapay Zeka Analitik", href: "/dashboard/analytics", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg> },
      { label: "Rakip Intel", href: "/dashboard/competitors", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
      { label: "Kaynak Radarı", href: "/dashboard/learning-radar", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> },
    ]
  },
  {
    title: "MÜŞTERİ",
    items: [
      { label: "Lead Havuzu", href: "/dashboard/leads", icon: <IconWrapper d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75" /> },
      { label: "Haftalık Plan", href: "/dashboard/leads/weekly", icon: <IconWrapper d="M3 4v16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z M3 10h18 M8 2v4 M16 2v4 M12 14h.01 M16 14h.01 M8 18h.01 M12 18h.01 M16 18h.01" /> },
      { label: "İletişim", href: "/dashboard/leads/outreach", icon: <IconWrapper d="M22 2L11 13 M22 2l-7 20-4-9-9-4 20-7z" /> },
    ]
  },
  {
    title: "ARAÇLAR",
    items: [
      { label: "Prompt Studio", href: "/dashboard/prompt-studio", icon: <IconWrapper d="M12 2v20 M2 12h20" /> },
      { label: "Prompt Kütüphanesi", href: "/dashboard/prompt-library", icon: <IconWrapper d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /> },
      { label: "Tweet Üretici", href: "/tweet-generator", icon: <IconWrapper d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" /> },
      { label: "Quote & Reply", href: "/dashboard/quote-reply", icon: <IconWrapper d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /> },
    ]
  }
];

function SidebarContent({ pathname }: { pathname: string }) {
  const [draftCounts, setDraftCounts] = useState<number[]>([0,0,0,0,0,0,0]);

  useEffect(() => {
    async function fetchStats() {
      // Son 7 günün draft sayısı
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data } = await supabase
        .from('tweet_drafts')
        .select('created_at')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true });
        
      if (data) {
        const counts = [0,0,0,0,0,0,0];
        const now = new Date();
        data.forEach(item => {
          const d = new Date(item.created_at);
          const diffTime = Math.abs(now.getTime() - d.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const idx = 7 - diffDays;
          if (idx >= 0 && idx < 7) {
             counts[idx]++;
          }
        });
        setDraftCounts(counts);
      }
    }
    fetchStats();
  }, []);

  const maxStat = Math.max(...draftCounts, 1);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-[var(--text-primary)] font-sans border-r border-[var(--border)] w-full w-[220px]">
      {/* Üst Profil */}
      <div className="p-5 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white font-bold text-sm">
            T
          </div>
          <div>
            <h1 className="text-white font-semibold text-sm tracking-tight">GrafikCem News AI</h1>
            <p className="text-[var(--text-muted)] text-xs">Ali Cem Bozma</p>
          </div>
        </div>
        
        {/* Mini Spark Line */}
        <div className="mt-4">
          <p className="text-[10px] text-[var(--text-muted)] mb-1">Son 7 gün aktivite</p>
          <div className="flex items-end gap-1 h-6">
            {draftCounts.map((val, i) => {
              const heightPct = Math.max((val / maxStat) * 100, 10);
              return (
                <div 
                  key={i} 
                  className="w-full bg-[var(--accent)] rounded-t-[2px] opacity-70 hover:opacity-100 transition-opacity" 
                  style={{ height: `${heightPct}%` }} 
                  title={`Gün ${i+1}: ${val} taslak`}
                />
              )
            })}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto pb-6">
        <div className="px-3 py-4">
          <Link
            href="/dashboard"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all mb-2 ${
              pathname === "/dashboard"
                ? "bg-[rgba(232,119,74,0.15)] border-l-2 border-[var(--accent)] text-[var(--accent)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-white"
            }`}
          >
            <span className="w-4 flex justify-center"><IconWrapper d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></span>
            Ana Sayfa
          </Link>

          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="mt-6">
              <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.1em] px-3 mb-2">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? "bg-[rgba(232,119,74,0.15)] border-l-2 border-[var(--accent)] text-[var(--accent)]"
                          : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-white"
                      }`}
                    >
                      <span className="w-4 flex justify-center items-center mr-1">
                        {item.icon ? (
                          <>{item.icon}</>
                        ) : item.dot ? (
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.dot }} />
                        ) : null}
                      </span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
          
          <div className="mt-6">
             <Link
                href="/settings"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  pathname === "/settings"
                    ? "bg-[rgba(232,119,74,0.15)] border-l-2 border-[var(--accent)] text-[var(--accent)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-white"
                }`}
              >
                <span className="w-4 flex justify-center"><IconWrapper circle /></span>
                Ayarlar
              </Link>
          </div>
        </div>
      </nav>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[var(--bg-primary)] border-b border-[var(--border)] px-4 py-3 flex items-center gap-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger>
             <div className="cursor-pointer p-2 rounded-md text-white hover:bg-[var(--bg-elevated)] transition-colors">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
             </div>
          </SheetTrigger>
          <SheetContent side="left" className="w-[220px] p-0 bg-[#0a0a0a] border-[var(--border)] border-r">
            <SheetTitle className="sr-only">Navigasyon</SheetTitle>
            <SidebarContent pathname={pathname} />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-[var(--accent)] flex items-center justify-center text-white font-bold text-xs">
            G
          </div>
          <span className="text-white font-semibold text-sm">GrafikCem News AI</span>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-[220px] lg:flex-col lg:fixed lg:inset-y-0 bg-[#0a0a0a] border-r border-[var(--border)] z-10">
        <SidebarContent pathname={pathname} />
      </aside>
    </>
  );
}
