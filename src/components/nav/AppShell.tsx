"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, Hammer, Briefcase, TrendingUp, Settings, CloudUpload, Cloud, CloudOff } from "lucide-react";
import { cx } from "@/lib/utils";
import { useStore } from "@/lib/store/StoreContext";

const NAV_ITEMS = [
  { href: "/", label: "Today", icon: CalendarCheck },
  { href: "/build", label: "Build & Learn", icon: Hammer },
  { href: "/opportunities", label: "Opportunities", icon: Briefcase },
  { href: "/progress", label: "Progress", icon: TrendingUp },
];

function SaveIndicator() {
  const { saveStatus } = useStore();
  if (saveStatus === "saving") {
    return (
      <span className="flex items-center gap-1 text-xs text-muted">
        <CloudUpload size={14} /> Saving…
      </span>
    );
  }
  if (saveStatus === "error") {
    return (
      <span className="flex items-center gap-1 text-xs text-danger">
        <CloudOff size={14} /> Not saved
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs text-muted">
      <Cloud size={14} /> Saved on this device
    </span>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col sm:flex-row">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded focus:bg-white focus:p-2">
        Skip to content
      </a>

      <aside className="hidden w-56 shrink-0 border-r border-line bg-white sm:flex sm:flex-col">
        <div className="px-4 py-5">
          <p className="text-sm font-semibold text-ink">Career Transition OS</p>
          <p className="text-xs text-muted">Career &amp; Growth Notes</p>
        </div>
        <nav className="flex-1 space-y-1 px-2">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium",
                  active ? "bg-accentSoft text-accent" : "text-ink hover:bg-black/5"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-2 border-t border-line px-4 py-3">
          <SaveIndicator />
          <Link href="/settings" className="flex items-center gap-2 text-sm text-muted hover:text-ink">
            <Settings size={16} /> Settings
          </Link>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line bg-white px-4 py-3 sm:hidden">
          <p className="text-sm font-semibold text-ink">Career &amp; Growth Notes</p>
          <Link href="/settings" aria-label="Settings" className="rounded-lg p-1.5 text-muted hover:bg-black/5">
            <Settings size={18} />
          </Link>
        </header>

        <main id="main-content" className="flex-1 overflow-y-auto pb-20 sm:pb-6">
          <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-6">{children}</div>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-20 flex border-t border-line bg-white sm:hidden" aria-label="Primary">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
                  active ? "text-accent" : "text-muted"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
