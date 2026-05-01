"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
  Home,
  Newspaper,
  LayoutGrid,
  Twitter,
  CalendarDays,
  Users,
  Wand2,
  BookOpen,
  Radar,
  Settings,
  Menu,
  ChevronRight,
  Zap,
  Linkedin,
  Wrench
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "GENEL",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: <Home size={14} /> },
      { label: "Toolbox", href: "/dashboard/toolbox", icon: <Wrench size={14} /> },
    ],
  },
  {
    title: "İÇERİK",
    items: [
      { label: "Haber Havuzu", href: "/news-pool", icon: <Newspaper size={14} /> },
      { label: "Tweet Üretici", href: "/tweet-generator", icon: <Twitter size={14} /> },
      { label: "Carousel Planner", href: "/dashboard/carousel-planner", icon: <LayoutGrid size={14} /> },
      { label: "İçerik Takvimi", href: "/dashboard/content-calendar", icon: <CalendarDays size={14} /> },
    ],
  },
  {
    title: "PROMPT",
    items: [
      { label: "Prompt Studio", href: "/dashboard/prompt-studio", icon: <Wand2 size={14} /> },
      { label: "Prompt Kütüphanesi", href: "/dashboard/prompt-library", icon: <BookOpen size={14} /> },
      { label: "Token Optimizer", href: "/dashboard/token-optimizer", icon: <Zap size={14} /> },
    ],
  },
  {
    title: "ANALİZ",
    items: [
      { label: "LinkedIn", href: "/dashboard/linkedin", icon: <Linkedin size={14} /> },
      { label: "Rakip Takip", href: "/dashboard/competitors", icon: <Users size={14} /> },
      { label: "Style Profile", href: "/style-profile", icon: <BookOpen size={14} /> },
    ],
  },
  {
    title: "SİSTEM",
    items: [
      { label: "Ayarlar", href: "/settings", icon: <Settings size={14} /> },
      { label: "Kaynaklar", href: "/dashboard/learning-radar", icon: <Radar size={14} /> },
    ],
  },
];

function SidebarContent({ pathname }: { pathname: string }) {
  return (
    <div className="flex flex-col h-full w-[220px] bg-[var(--bg-surface)] border-r border-[var(--border-subtle)]">
      {/* Logo Section */}
      <div className="p-8 border-b border-white/5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
            <Zap size={18} className="text-black fill-black" />
          </div>
          <div>
            <p className="font-black text-xs tracking-tighter text-white uppercase leading-none">
              GrafikCem
            </p>
            <p className="text-[10px] font-bold font-mono text-[var(--text-muted)] tracking-widest uppercase">
              NEWS AI
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar py-6 px-4 space-y-8">
        {navGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-2">
            <p className="px-3 pt-4 pb-1 text-[10px] font-medium text-[var(--text-muted)] tracking-[0.08em] uppercase">
              {group.title}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
                  
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 px-[12px] py-[7px] rounded-xl text-[11px] font-bold font-mono transition-all duration-300 border border-transparent",
                      isActive 
                        ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.1)]" 
                        : "text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-elevated)]"
                    )}
                  >
                    <span className={cn(
                      "transition-colors",
                      isActive ? "text-black" : "text-[var(--text-muted)] group-hover:text-white"
                    )}>
                      {item.icon}
                    </span>
                    <span className="flex-1 uppercase tracking-wider">{item.label}</span>
                    {isActive && <ChevronRight size={10} className="text-black/30" />}
                    {item.badge && (
                      <span className="ml-auto bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded-md text-[9px]">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom status bar */}
      <div className="p-6 border-t border-white/5 space-y-4 bg-[var(--bg-base)]/30">
        <div className="flex items-center gap-3 px-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <span className="text-[9px] font-bold font-mono text-[var(--text-muted)] uppercase tracking-widest">
            Gemini 3 Flash <span className="opacity-40">v1.2</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center gap-3 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] p-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className="p-2 rounded-xl bg-[var(--bg-elevated)] text-white">
            <Menu size={18} />
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-[220px] p-0 bg-black border-r border-white/10"
          >
            <SheetTitle className="sr-only">Navigasyon</SheetTitle>
            <SidebarContent pathname={pathname} />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-white" />
          <span className="font-bold text-xs uppercase tracking-widest text-white">
            GC NEWS AI
          </span>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-[220px] lg:flex-col lg:fixed lg:inset-y-0 z-10">
        <SidebarContent pathname={pathname} />
      </aside>
    </>
  );
}
