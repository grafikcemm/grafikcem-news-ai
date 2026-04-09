"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

function IconWrapper({ d, circle }: { d?: string; circle?: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70 group-data-[active=true]:opacity-100">
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
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "HOME",
    items: [
      { label: "Ana Sayfa", href: "/dashboard", icon: <IconWrapper d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /> },
    ]
  },
  {
    title: "CONTENT",
    items: [
      { label: "Haber Havuzu", href: "/dashboard/news-pool", icon: <IconWrapper d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2 M18 14h-8 M15 18h-5 M10 6h8v4h-8V6Z" /> },
      { label: "Storyboard", href: "/dashboard/storyboard", icon: <IconWrapper d="M3 3h18v18H3z M3 9h18 M3 15h18" /> },
      { label: "Tweet Üretici", href: "/tweet-generator", icon: <IconWrapper d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" /> },
      { label: "Quote & Reply", href: "/dashboard/quote-reply", icon: <IconWrapper d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /> },
    ]
  },
  {
    title: "PLANNING",
    items: [
      { label: "İçerik Takvimi", href: "/dashboard/content-calendar", icon: <IconWrapper d="M3 4v16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z M3 10h18 M8 2v4 M16 2v4" /> },
      { label: "Haftalık Plan", href: "/dashboard/content-plan", icon: <IconWrapper d="M21 12H3 M21 6H3 M21 18H3" /> },
    ]
  },
  {
    title: "LEADS",
    items: [
      { label: "Lead Havuzu", href: "/dashboard/leads", icon: <IconWrapper d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75" /> },
      { label: "Haftalık Ulaşım", href: "/dashboard/leads/weekly", icon: <IconWrapper d="M3 4v16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z M3 10h18 M8 2v4 M16 2v4 M12 14h.01 M16 14h.01 M8 18h.01 M12 18h.01 M16 18h.01" /> },
    ]
  },
  {
    title: "OUTREACH",
    items: [
      { label: "İletişim Merkezi", href: "/dashboard/leads/outreach", icon: <IconWrapper d="M22 2L11 13 M22 2l-7 20-4-9-9-4 20-7z" /> },
      { label: "Rakip Takip", href: "/dashboard/competitors", icon: <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-70 group-data-[active=true]:opacity-100"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
    ]
  },
  {
    title: "LIBRARY",
    items: [
      { label: "Prompt Studio", href: "/dashboard/prompt-studio", icon: <IconWrapper d="M12 2v20 M2 12h20" /> },
      { label: "Prompt Kütüphanesi", href: "/dashboard/prompt-library", icon: <IconWrapper d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /> },
      { label: "Kaynak Radarı", href: "/dashboard/learning-radar", icon: <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-70 group-data-[active=true]:opacity-100"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> },
    ]
  }
];

function SidebarContent({ pathname }: { pathname: string }) {
  return (
    <div className="flex flex-col h-full bg-[var(--surface-sunken)] w-full w-[240px]">
      {/* Üst Profil */}
      <div className="p-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3">
          <div className="w-[28px] h-[28px] rounded-md bg-[var(--accent)] flex items-center justify-center text-white font-bold text-[14px]">
            G
          </div>
          <div>
            <h1 className="text-[var(--text-primary)] font-semibold text-[13px] tracking-tight">GrafikCem OS</h1>
            <p className="text-[var(--text-tertiary)] text-[11px]">Ali Cem Bozma</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto pb-6 scrollbar-thin">
        <div className="py-2">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="mt-4 first:mt-2">
              {group.title && (
                <p className="text-label px-[12px] pt-[16px] pb-[6px]">
                  {group.title}
                </p>
              )}
              <div className="space-y-1 px-[12px]">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      data-active={isActive}
                      className={`group flex items-center gap-[10px] px-[12px] py-[7px] rounded-[var(--radius-md)] text-[13px] transition-all duration-120 hover:bg-[var(--surface-overlay)] hover:text-[var(--text-primary)] ${
                        isActive
                          ? "bg-[var(--accent-subtle)] text-[var(--accent)] font-medium border-l-2 border-[var(--accent)]"
                          : "text-[var(--text-secondary)] font-[450] border-l-2 border-transparent"
                      }`}
                    >
                      <span className="flex justify-center items-center">
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
          
          <div className="mt-6 px-[12px]">
             <Link
                href="/settings"
                data-active={pathname === "/settings"}
                className={`group flex items-center gap-[10px] px-[12px] py-[7px] rounded-[var(--radius-md)] text-[13px] transition-all duration-120 hover:bg-[var(--surface-overlay)] hover:text-[var(--text-primary)] ${
                  pathname === "/settings"
                    ? "bg-[var(--accent-subtle)] text-[var(--accent)] font-medium border-l-2 border-[var(--accent)]"
                    : "text-[var(--text-secondary)] font-[450] border-l-2 border-transparent"
                }`}
              >
                <span className="flex justify-center items-center"><IconWrapper circle /></span>
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
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[var(--surface-sunken)] border-b border-[var(--border-subtle)] px-4 py-3 flex items-center gap-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger>
             <div className="cursor-pointer p-2 rounded-md text-[var(--text-primary)] hover:bg-[var(--surface-overlay)] transition-colors">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
             </div>
          </SheetTrigger>
          <SheetContent side="left" className="w-[240px] p-0 bg-[var(--surface-sunken)] border-[var(--border-subtle)] border-r">
            <SheetTitle className="sr-only">Navigasyon</SheetTitle>
            <SidebarContent pathname={pathname} />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-[var(--accent)] flex items-center justify-center text-white font-bold text-xs">
            G
          </div>
          <span className="text-[var(--text-primary)] font-semibold text-sm">GrafikCem OS</span>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-[240px] lg:flex-col lg:fixed lg:inset-y-0 bg-[var(--surface-sunken)] border-r border-[var(--border-subtle)] z-10">
        <SidebarContent pathname={pathname} />
      </aside>
    </>
  );
}
