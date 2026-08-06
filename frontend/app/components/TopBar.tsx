// app/components/TopBar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Bell, Settings, LayoutDashboard, Network, Home } from "lucide-react";

interface TopBarProps {
  title?: string;
  searchPlaceholder?: string;
}

export default function TopBar({
  title,
  searchPlaceholder = "Search entity, hash, or IP...",
}: TopBarProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 flex items-center gap-6 glass-card border-x-0 border-t-0 px-6 py-3">
      <Link href="/" className="flex items-center gap-2 text-brand hover:text-brand/80 transition-colors">
        <Home size={18} />
        <span className="font-medium tracking-tight">AlertixAI</span>
      </Link>

      <div className="h-4 w-px bg-border" />

      <nav className="flex items-center gap-1">
        <Link
          href="/dashboard"
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${pathname === '/dashboard' ? 'bg-brand-dim text-brand' : 'text-mist hover:text-ink hover:bg-panel-2'}`}
        >
          <LayoutDashboard size={16} />
          SOC Dashboard
        </Link>
        <Link
          href="/graph"
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${pathname === '/graph' ? 'bg-brand-dim text-brand' : 'text-mist hover:text-ink hover:bg-panel-2'}`}
        >
          <Network size={16} />
          3D Threat Graph
        </Link>
      </nav>

      {title && (
        <>
          <div className="h-4 w-px bg-border" />
          <h1 className="text-sm font-medium text-mist whitespace-nowrap">{title}</h1>
        </>
      )}

      <div className="flex-1 flex items-center justify-end gap-2 max-w-md ml-auto">
        <div className="flex items-center gap-2 rounded-lg glass-card px-3 py-1.5 w-full">
          <Search size={14} className="text-faint" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            className="bg-transparent text-xs text-ink placeholder:text-faint outline-none flex-1 font-mono"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <button className="text-mist hover:text-ink"><Bell size={17} /></button>
        <button className="text-mist hover:text-ink"><Settings size={17} /></button>
        <div className="h-8 w-8 rounded-full bg-panel-2 border border-border" />
      </div>
    </header>
  );
}
