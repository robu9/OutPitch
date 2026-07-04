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
  Terminal,
  Cpu,
} from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { href: "/chat", label: "Workstation", icon: MessageSquare, shortcut: "⌘1" },
  { href: "/companies", label: "Pipeline", icon: Building2, shortcut: "⌘2" },
  { href: "/outreach", label: "Telemetry", icon: Mail, shortcut: "⌘3" },
  { href: "/settings", label: "Matrix", icon: Settings, shortcut: "⌘4" },
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

  return (
    <div className="flex min-h-screen bg-background text-foreground selection:bg-accent selection:text-accent-foreground">
      <aside
        className={`sticky top-0 flex h-screen flex-col border-r border-[#1f1f1f] bg-[#0b0b0b] transition-[width] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          collapsed ? "w-[60px]" : "w-[240px]"
        }`}
      >
        {/* Sidebar Header */}
        <div
          className={`flex h-14 items-center border-b border-[#1f1f1f] ${
            collapsed ? "justify-center px-2" : "justify-between px-4"
          }`}
        >
          {!collapsed ? (
            <div className="flex items-center gap-2">
              <Logo size="sm" href="/chat" />
            </div>
          ) : (
            <Link href="/chat" aria-label="Outpitch workstation">
              <Logo size="sm" showWordmark={false} href={null} />
            </Link>
          )}
          {!collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="flex h-7 w-7 items-center justify-center rounded text-[#888888] transition-colors hover:bg-[#161616] hover:text-white"
              aria-label="Collapse workstation sidebar"
            >
              <PanelLeftClose className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>

        {collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="mx-auto mt-3 flex h-8 w-8 items-center justify-center rounded text-[#888888] transition-colors hover:bg-[#161616] hover:text-white"
            aria-label="Expand workstation sidebar"
          >
            <PanelLeft className="h-4 w-4" aria-hidden />
          </button>
        )}

        {/* System Status Indicator */}
        {!collapsed && (
          <div className="mx-3 mt-3 rounded border border-[#1f1f1f] bg-[#080808] p-2.5 text-[11px] font-mono">
            <div className="flex items-center justify-between text-[#888888] mb-1">
              <span>COGNEE ENGINE</span>
              <span className="text-[#10b981] font-bold">ONLINE</span>
            </div>
            <div className="flex items-center gap-1.5 text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              <span>MEMORY COMPOUNDING</span>
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="p-3" aria-label="Workstation navigation">
          {!collapsed && (
            <div className="mb-2 px-2 text-[10px] font-mono uppercase tracking-widest text-[#888888]">
              NAVIGATION COMMANDS
            </div>
          )}
          <ul className="space-y-1">
            {navItems.map(({ href, label, icon: Icon, shortcut }) => {
              const active = pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    title={collapsed ? label : undefined}
                    className={`flex items-center justify-between rounded px-3 py-2.5 text-xs font-mono transition-all duration-150 ${
                      active
                        ? "bg-surface-hover text-white border border-accent/40 font-bold"
                        : "text-muted-foreground hover:bg-surface hover:text-white border border-transparent"
                    } ${collapsed ? "justify-center px-2" : ""}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-accent" : ""}`} aria-hidden />
                      {!collapsed && <span>{label.toUpperCase()}</span>}
                    </div>
                    {!collapsed && (
                      <span className="text-[10px] text-[#888888] font-mono">{shortcut}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Extra sidebar content (e.g. chat history), rendered below nav */}
        {sidebar && !collapsed ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-[#1f1f1f]">
            {sidebar}
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {/* Sidebar Footer */}
        <div
          className={`flex items-center justify-between border-t border-[#1f1f1f] bg-[#080808] p-3 ${
            collapsed ? "flex-col gap-3" : ""
          }`}
        >
          {!collapsed && (
            <div className="flex items-center gap-2 text-[11px] font-mono text-[#888888]">
              <Cpu className="h-3.5 w-3.5 text-accent" />
              <span>v2.4 // GEMINI 3</span>
            </div>
          )}
          <div className={collapsed ? "" : "ml-auto"}>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col bg-[#050505]">{children}</main>
    </div>
  );
}
