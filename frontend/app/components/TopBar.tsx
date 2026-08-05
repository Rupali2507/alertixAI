// app/components/TopBar.tsx
"use client";

import { Search, Bell, Settings } from "lucide-react";

interface TopBarProps {
  title?: string;
  searchPlaceholder?: string;
}

export default function TopBar({
  title,
  searchPlaceholder = "Search entity, hash, or IP...",
}: TopBarProps) {
  return (
    <header className="flex items-center gap-4 border-b border-border bg-void px-6 py-3">
      {title && (
        <h1 className="text-base font-semibold text-ink whitespace-nowrap">{title}</h1>
      )}

      <div className="flex-1 flex items-center gap-2 rounded-md border border-border bg-panel px-3 py-2 max-w-md">
        <Search size={15} className="text-faint" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          className="bg-transparent text-sm text-ink placeholder:text-faint outline-none flex-1 font-mono"
        />
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <span className="flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs text-success font-mono">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          Kafka Active
        </span>
        <button className="text-mist hover:text-ink">
          <Bell size={17} />
        </button>
        <button className="text-mist hover:text-ink">
          <Settings size={17} />
        </button>
        <div className="h-8 w-8 rounded-full bg-panel-2 border border-border" />
      </div>
    </header>
  );
}
