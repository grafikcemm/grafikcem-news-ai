import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/top-bar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen" style={{ background: "var(--surface-base)" }} suppressHydrationWarning>
      <Sidebar />
      <main className="lg:ml-[240px] flex flex-col min-h-screen">
        <TopBar />
        <div className="pt-16 lg:pt-0 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
