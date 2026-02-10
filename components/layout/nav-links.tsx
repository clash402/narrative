"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartSpline, FolderKanban, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";

function isDashboardPath(pathname: string): boolean {
  return pathname === "/" || pathname.startsWith("/campaigns");
}

function isBrandPath(pathname: string): boolean {
  return pathname === "/brand" || pathname.startsWith("/brand/");
}

export function HeaderNavLinks() {
  const pathname = usePathname();

  const dashboardActive = isDashboardPath(pathname);
  const brandActive = isBrandPath(pathname);

  return (
    <div className="flex items-center gap-3 text-sm">
      <Link
        href="/"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors",
          dashboardActive
            ? "bg-white/12 text-white ring-1 ring-[var(--accent-2)]/65"
            : "text-white/80 hover:bg-white/10 hover:text-white",
        )}
      >
        <ChartSpline className="h-4 w-4" />
        Campaigns
      </Link>
      <Link
        href="/brand"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors",
          brandActive
            ? "bg-white/12 text-white ring-1 ring-[var(--accent-2)]/65"
            : "text-white/80 hover:bg-white/10 hover:text-white",
        )}
      >
        <UserRound className="h-4 w-4" />
        Brand
      </Link>
    </div>
  );
}

export function SidebarNavLinks() {
  const pathname = usePathname();

  const dashboardActive = isDashboardPath(pathname);
  const brandActive = isBrandPath(pathname);

  return (
    <nav className="space-y-2">
      <Link
        href="/"
        className={cn(
          "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
          dashboardActive
            ? "border-[var(--accent-2)] bg-white/12 text-white"
            : "border-transparent text-white/90 hover:border-[var(--accent-2)] hover:bg-white/10 hover:text-white",
        )}
      >
        <FolderKanban className="h-4 w-4 text-[var(--accent-2)]" />
        Campaign Dashboard
      </Link>
      <Link
        href="/brand"
        className={cn(
          "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
          brandActive
            ? "border-[var(--accent-2)] bg-white/12 text-white"
            : "border-transparent text-white/90 hover:border-[var(--accent-2)] hover:bg-white/10 hover:text-white",
        )}
      >
        <UserRound className="h-4 w-4 text-[var(--accent-2)]" />
        Brand Profile
      </Link>
    </nav>
  );
}
