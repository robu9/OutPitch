"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  Building2,
  Mail,
  MessageSquare,
  PanelLeft,
  PanelLeftClose,
  Settings,
} from "lucide-react";
import { useRef, useState } from "react";
import { Logo } from "@/components/logo";
import { ensureGsap, gsap, useGSAP } from "@/lib/gsap-config";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/outreach", label: "Outreach", icon: Mail },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({
  children,
  sidebar,
}: {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      ensureGsap();
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) return;

      gsap.from(shellRef.current?.querySelectorAll("aside nav a, aside > div:first-child") ?? [], {
        x: -12,
        opacity: 0,
        duration: 0.5,
        stagger: 0.05,
        ease: "power3.out",
        delay: 0.15,
      });
    },
    { scope: shellRef }
  );

  return (
    <div ref={shellRef} className="relative flex min-h-screen bg-bg-base text-foreground">
      <aside
        className={cn(
          "relative z-[1] sticky top-0 flex h-screen flex-col border-r border-border bg-bg-elevated transition-[width] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
          collapsed ? "w-[60px]" : "w-[240px]"
        )}
      >
        <div
          className={cn(
            "flex h-14 items-center border-b border-border",
            collapsed ? "justify-center px-2" : "justify-between px-4"
          )}
        >
          {!collapsed ? (
            <Logo size="sm" href="/chat" />
          ) : (
            <Link href="/chat" aria-label="Outpitch">
              <Logo size="sm" href={null} compact />
            </Link>
          )}
          {!collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-hover hover:text-foreground"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>

        {collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="mx-auto mt-3 flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-hover hover:text-foreground"
            aria-label="Expand sidebar"
          >
            <PanelLeft className="h-4 w-4" aria-hidden />
          </button>
        )}

        <nav className="p-3" aria-label="App navigation">
          <ul className="space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    title={collapsed ? label : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors",
                      active
                        ? "bg-bg-surface text-foreground"
                        : "text-text-secondary hover:bg-bg-hover hover:text-foreground",
                      collapsed && "justify-center px-2"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    {!collapsed && <span>{label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {sidebar && !collapsed ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-border">
            {sidebar}
          </div>
        ) : (
          <div className="flex-1" />
        )}

        <div
          className={cn(
            "flex items-center border-t border-border p-3",
            collapsed ? "justify-center" : "justify-end"
          )}
        >
          <UserButton afterSignOutUrl="/" />
        </div>
      </aside>

      <main className="relative z-[1] flex min-w-0 flex-1 flex-col bg-bg-base">{children}</main>
    </div>
  );
}
