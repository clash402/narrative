import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Toaster } from "sonner";

import { HeaderNavLinks, SidebarNavLinks } from "@/components/layout/nav-links";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const ibmMono = IBM_Plex_Mono({
  variable: "--font-ibm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "30-Day LinkedIn Campaign Builder",
  description:
    "Production-focused MVP for creating and generating 30-day LinkedIn campaigns.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${ibmMono.variable} antialiased`}>
        <div className="min-h-screen">
          <header className="sticky top-0 z-40 w-full border-b border-black bg-[var(--accent)] backdrop-blur">
            <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
              <Link
                href="/"
                className="flex items-center gap-2 font-semibold tracking-tight text-white"
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[var(--accent-2)] text-[var(--accent)]">
                  <Sparkles className="h-4 w-4" />
                </span>
                Narrative Campaign Builder
              </Link>
              <HeaderNavLinks />
            </div>
          </header>

          <div className="flex min-h-[calc(100vh-4rem)]">
            <aside className="hidden w-72 shrink-0 border-r border-black bg-[linear-gradient(180deg,rgba(20,33,61,0.98),rgba(0,0,0,0.94))] p-4 md:block">
              <div className="sticky top-20 space-y-6">
                <div className="rounded-xl border border-[var(--accent-2)] bg-white/5 p-4">
                  <p className="text-xs font-semibold tracking-[0.14em] text-white/75 uppercase">
                    Workspace
                  </p>
                  <p className="mt-2 text-sm text-white/70">
                    Build and manage a 30-day campaign with lock-first
                    generation controls.
                  </p>
                </div>

                <SidebarNavLinks />
              </div>
            </aside>

            <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
          </div>
        </div>
        <Toaster richColors closeButton position="top-right" />
      </body>
    </html>
  );
}
