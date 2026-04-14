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
  MessageSquare,
  CalendarDays,
  ListChecks,
  Users,
  CalendarClock,
  Send,
  DollarSign,
  Wand2,
  BookOpen,
  Radar,
  Settings,
  ChevronLeft,
  LogOut,
  Menu,
} from "lucide-react";

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
    title: "OVERVIEW",
    items: [
      { label: "Ana Sayfa", href: "/dashboard", icon: <Home size={15} /> },
    ],
  },
  {
    title: "CREATE",
    items: [
      { label: "@grafikcem", href: "/channels/grafikcem", icon: <div style={{width: 8, height: 8, borderRadius: "50%", background: "var(--channel-grafikcem)"}} /> },
      { label: "@maskulenkod", href: "/channels/maskulenkod", icon: <div style={{width: 8, height: 8, borderRadius: "50%", background: "var(--channel-maskulenkod)"}} /> },
      { label: "LinkedIn", href: "/channels/linkedin", icon: <div style={{width: 8, height: 8, borderRadius: "50%", background: "var(--channel-linkedin)"}} /> },
    ],
  },
  {
    title: "CONTENT",
    items: [
      { label: "Haber Havuzu", href: "/dashboard/news-pool", icon: <Newspaper size={15} /> },
      { label: "Tweet Üretici", href: "/tweet-generator", icon: <Twitter size={15} /> },
      { label: "Quote & Reply", href: "/dashboard/quote-reply", icon: <MessageSquare size={15} /> },
    ],
  },
  {
    title: "PLANNING",
    items: [
      { label: "İçerik Takvimi", href: "/dashboard/content-calendar", icon: <CalendarDays size={15} /> },
      { label: "Haftalık Plan", href: "/dashboard/content-plan", icon: <ListChecks size={15} /> },
    ],
  },
  {
    title: "LEADS",
    items: [
      { label: "Lead Havuzu", href: "/dashboard/leads", icon: <Users size={15} /> },
    ],
  },
  {
    title: "OUTREACH",
    items: [
      { label: "Rakip Takip", href: "/dashboard/competitors", icon: <DollarSign size={15} /> },
    ],
  },
  {
    title: "LIBRARY",
    items: [
      { label: "Prompt Studio", href: "/dashboard/prompt-studio", icon: <Wand2 size={15} /> },
      { label: "Prompt Kütüphanesi", href: "/dashboard/prompt-library", icon: <BookOpen size={15} /> },
      { label: "Kaynak Radarı", href: "/dashboard/learning-radar", icon: <Radar size={15} /> },
    ],
  },
];

function SidebarContent({ pathname }: { pathname: string }) {
  return (
    <div className="flex flex-col h-full w-[240px]" style={{ background: "var(--gradient-sidebar)" }}>
      {/* Logo */}
      <div style={{ padding: "20px 16px" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-[10px]">
            <div
              className="w-[32px] h-[32px] rounded-[var(--radius-md)] flex items-center justify-center text-white font-bold text-[14px]"
              style={{ background: "var(--gradient-accent)" }}
            >
              G
            </div>
            <div>
              <p className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
                GrafikCem OS
              </p>
              <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                AI-Powered Creator
              </p>
            </div>
          </div>
          <ChevronLeft size={14} style={{ color: "var(--text-tertiary)" }} />
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "var(--border-subtle)", margin: "0 16px 8px" }} />

      {/* Profile */}
      <div
        style={{
          padding: "12px 16px",
          background: "var(--surface-elevated)",
          borderRadius: "var(--radius-md)",
          margin: "0 8px 8px",
        }}
      >
        <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Welcome Back,</p>
        <p className="text-[16px] font-bold" style={{ color: "var(--text-primary)" }}>Ali Cem</p>
        <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Son giriş: bugün</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto" style={{ padding: "8px" }}>
        {navGroups.map((group, gIdx) => (
          <div key={gIdx}>
            <p className="text-label" style={{ padding: "16px 8px 6px" }}>
              {group.title}
            </p>
            <div className="flex flex-col gap-[2px]">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-[10px] transition-all duration-150"
                    style={{
                      padding: "8px 10px",
                      borderRadius: "var(--radius-md)",
                      fontSize: "13px",
                      fontWeight: isActive ? 500 : 450,
                      color: isActive ? "var(--accent)" : "var(--text-secondary)",
                      background: isActive ? "var(--accent-subtle)" : "transparent",
                      borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = "var(--surface-elevated)";
                        e.currentTarget.style.color = "var(--text-primary)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "var(--text-secondary)";
                      }
                    }}
                  >
                    <span style={{ color: isActive ? "var(--accent)" : "var(--text-tertiary)" }}>
                      {item.icon}
                    </span>
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span
                        className="text-[10px] font-semibold"
                        style={{
                          background: "var(--accent-subtle)",
                          color: "var(--accent)",
                          borderRadius: 999,
                          padding: "1px 6px",
                        }}
                      >
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

      {/* Bottom */}
      <div style={{ borderTop: "1px solid var(--border-subtle)", padding: "12px 8px" }}>
        <Link
          href="/settings"
          className="flex items-center gap-[10px] transition-all duration-150"
          style={{
            padding: "8px 10px",
            borderRadius: "var(--radius-md)",
            fontSize: "13px",
            fontWeight: pathname === "/settings" ? 500 : 450,
            color: pathname === "/settings" ? "var(--accent)" : "var(--text-secondary)",
            background: pathname === "/settings" ? "var(--accent-subtle)" : "transparent",
          }}
        >
          <Settings size={15} style={{ color: pathname === "/settings" ? "var(--accent)" : "var(--text-tertiary)" }} />
          Ayarlar
        </Link>
        <div
          className="flex items-center gap-[10px] cursor-pointer"
          style={{
            padding: "8px 10px",
            fontSize: "12px",
            color: "var(--text-tertiary)",
          }}
        >
          <LogOut size={14} />
          Log Out
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
      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center gap-3"
        style={{
          background: "var(--surface-base)",
          borderBottom: "1px solid var(--border-subtle)",
          padding: "12px 16px",
        }}
      >
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger>
            <div
              className="cursor-pointer p-2 rounded-[var(--radius-md)] transition-colors"
              style={{ color: "var(--text-primary)" }}
            >
              <Menu size={20} />
            </div>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-[240px] p-0"
            style={{
              background: "var(--surface-base)",
              borderRight: "1px solid var(--border-subtle)",
            }}
          >
            <SheetTitle className="sr-only">Navigasyon</SheetTitle>
            <SidebarContent pathname={pathname} />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-[var(--radius-md)] flex items-center justify-center text-white font-bold text-xs"
            style={{ background: "var(--gradient-accent)" }}
          >
            G
          </div>
          <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
            GrafikCem OS
          </span>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex lg:w-[240px] lg:flex-col lg:fixed lg:inset-y-0 z-10"
        style={{
          borderRight: "1px solid var(--border-subtle)",
        }}
      >
        <SidebarContent pathname={pathname} />
      </aside>
    </>
  );
}
