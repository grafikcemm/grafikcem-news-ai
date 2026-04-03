import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "GrafikCem News AI",
  description: "AI-powered news aggregation and X post generation for @grafikcem",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning={true}>
      <body className={`${GeistSans.className} antialiased`} suppressHydrationWarning={true}>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
