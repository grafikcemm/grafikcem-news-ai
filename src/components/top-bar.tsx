"use client";

import { usePathname } from "next/navigation";
import { Home, Search, Bell } from "lucide-react";

const PAGE_NAMES: Record<string, string> = {
  "/dashboard": "Ana Sayfa",
  "/dashboard/news-pool": "Haber Havuzu",
  "/dashboard/storyboard": "Storyboard",
  "/tweet-generator": "Tweet Üretici",
  "/dashboard/quote-reply": "Quote & Reply",
  "/dashboard/content-calendar": "İçerik Takvimi",
  "/dashboard/content-plan": "Haftalık Plan",
  "/dashboard/leads": "Lead Havuzu",
  "/dashboard/leads/weekly": "Haftalık Ulaşım",
  "/dashboard/leads/outreach": "İletişim Merkezi",
  "/dashboard/competitors": "Rakip Takip",
  "/dashboard/prompt-studio": "Prompt Studio",
  "/dashboard/prompt-library": "Prompt Kütüphanesi",
  "/dashboard/learning-radar": "Kaynak Radarı",
  "/settings": "Ayarlar",
};

export function TopBar() {
  const pathname = usePathname();
  const currentPage = PAGE_NAMES[pathname] || "Sayfa";

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between"
      style={{
        height: 56,
        background: "rgba(8,11,18,0.8)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border-subtle)",
        padding: "0 32px",
      }}
    >
      {/* Left — Breadcrumb */}
      <div className="flex items-center gap-[8px]">
        <Home size={16} style={{ color: "var(--text-tertiary)" }} />
        <span style={{ color: "var(--text-tertiary)", fontSize: 12 }}>/</span>
        <span style={{ color: "var(--text-primary)", fontSize: 14, fontWeight: 500 }}>
          {currentPage}
        </span>
      </div>

      {/* Center — Search */}
      <div
        className="hidden md:flex items-center gap-[8px]"
        style={{
          width: 280,
          background: "var(--surface-elevated)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-md)",
          padding: "8px 14px",
        }}
      >
        <Search size={14} style={{ color: "var(--text-tertiary)" }} />
        <span style={{ color: "var(--text-tertiary)", fontSize: 13, flex: 1 }}>Ara...</span>
        <span
          style={{
            background: "var(--surface-overlay)",
            color: "var(--text-tertiary)",
            fontSize: 10,
            padding: "2px 6px",
            borderRadius: 4,
            fontWeight: 500,
          }}
        >
          /
        </span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-[16px]">
        {/* Bell */}
        <button
          className="transition-colors"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
        >
          <Bell size={18} />
        </button>

        {/* Divider */}
        <div style={{ width: 1, height: 24, background: "var(--border-default)" }} />

        {/* Avatar */}
        <div className="flex items-center gap-[10px]">
          <div
            className="flex items-center justify-center text-white font-bold text-[12px]"
            style={{
              width: 32,
              height: 32,
              borderRadius: "var(--radius-md)",
              background: "var(--gradient-accent)",
            }}
          >
            AC
          </div>
          <div className="hidden sm:block">
            <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.2 }}>Your OS</p>
            <p style={{ fontSize: 10, color: "var(--text-tertiary)", lineHeight: 1.2 }}>v1.0</p>
          </div>
        </div>
      </div>
    </header>
  );
}
