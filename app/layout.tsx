import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";
import Link from "next/link";
import { ChartSpline, Sparkles, UserRound } from "lucide-react";
import { Toaster } from "sonner";

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
        <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col px-4 pt-4 pb-8 sm:px-6 lg:px-8">
          <header className="border-border/80 bg-panel/90 sticky top-4 z-30 rounded-xl border backdrop-blur">
            <nav className="flex items-center justify-between px-4 py-3">
              <Link
                href="/"
                className="flex items-center gap-2 font-semibold tracking-tight"
              >
                <Sparkles className="h-4 w-4" />
                Narrative Campaign Builder
              </Link>
              <div className="flex items-center gap-4 text-sm">
                <Link
                  href="/"
                  className="text-muted hover:text-foreground inline-flex items-center gap-1.5"
                >
                  <ChartSpline className="h-4 w-4" />
                  Campaigns
                </Link>
                <Link
                  href="/brand"
                  className="text-muted hover:text-foreground inline-flex items-center gap-1.5"
                >
                  <UserRound className="h-4 w-4" />
                  Brand
                </Link>
              </div>
            </nav>
          </header>
          <main className="mt-4 flex-1">{children}</main>
        </div>
        <Toaster richColors closeButton position="top-right" />
      </body>
    </html>
  );
}
