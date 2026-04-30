"use client";

import { usePathname } from "next/navigation";
import { ChevronRight, Search, Bell, User } from "lucide-react";
import { cn } from "@/lib/utils";

const PAGE_NAMES: Record<string, string> = {
  "/dashboard": "DASHBOARD",
  "/dashboard/news-pool": "HABER HAVUZU",
  "/tweet-generator": "TWEET ÜRETİCİ",
  "/dashboard/carousel-planner": "CAROUSEL PLANLAYICI",
  "/dashboard/content-calendar": "İÇERİK TAKVİMİ",
  "/dashboard/competitors": "RAKİP TAKİP",
  "/dashboard/style-profile": "STİL PROFİLİ",
  "/dashboard/prompt-studio": "PROMPT STUDIO",
  "/dashboard/learning-radar": "KAYNAK RADARI",
  "/settings": "AYARLAR",
};

export function TopBar() {
  const pathname = usePathname();
  const currentPage = PAGE_NAMES[pathname] || "DASHBOARD";

  return (
    <header className="h-[52px] border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/80 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-40">
      
      {/* Left — Breadcrumb */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold font-mono text-[var(--text-muted)] tracking-widest">SYSTEM</span>
        <ChevronRight size={10} className="text-[var(--text-muted)]" />
        <span className="text-[10px] font-bold font-mono text-white tracking-widest">
          {currentPage}
        </span>
      </div>

      {/* Right — Actions */}
      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 h-10 w-64 group focus-within:border-[var(--border-strong)] transition-all">
          <Search size={14} className="text-[var(--text-muted)]" />
          <input 
            type="text" 
            placeholder="Search anywhere..." 
            className="bg-transparent border-none focus:ring-0 text-xs text-white placeholder-[var(--text-muted)] w-full ml-2"
          />
        </div>
        
        <div className="flex items-center gap-1">
          <IconButton icon={<Bell size={18} />} />
          <div className="w-px h-6 bg-white/5 mx-2" />
          <div className="flex items-center gap-3 pl-2 group cursor-pointer">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-bold text-white leading-none">GrafikCem</p>
              <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase mt-1">Admin</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center group-hover:border-white/30 transition-all">
              <User size={20} className="text-white" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function IconButton({ icon }: { icon: React.ReactNode }) {
  return (
    <button className="w-10 h-10 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-muted)] hover:text-white hover:border-[var(--border-strong)] transition-all">
      {icon}
    </button>
  );
}
