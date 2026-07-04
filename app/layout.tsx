import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "TOEIC Quiz — Luyện Part 3 & 4",
  description:
    "Web app luyện quiz TOEIC Listening (Part 3 & Part 4) với Study/Test mode, review câu sai, bookmark và thống kê tiến độ.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f5f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1020" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="min-h-screen app-gradient">
        <Providers>
          <SiteHeader />
          <main className="container py-6 sm:py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
