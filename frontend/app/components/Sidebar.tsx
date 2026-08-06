// app/components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldAlert,
  UserSearch,
  ShieldCheck,
  ActivitySquare,
  HelpCircle,
  FileText,
  Network,
  IdCard
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Threat Monitor", icon: ShieldAlert },
  { href: "/graph", label: "3D Threat Graph", icon: Network },
  { href: "/kyc-fraud", label: "KYC Fraud Graph", icon: IdCard },
  { href: "/insider-misuse", label: "Insider Misuse", icon: UserSearch },
  { href: "/privacy-audit", label: "Privacy & Audit", icon: ShieldCheck },
  { href: "/system-health", label: "System Health", icon: ActivitySquare },
];

export default function Sidebar() {
  const pathname = usePathname();

  if (pathname === "/") return null;

  return (
    <aside className="w-64 shrink-0 border-r border-border bg-sidebar flex flex-col justify-between min-h-screen px-3 py-5">
      <div>
        <div className="flex items-center gap-2.5 px-2 mb-8">
          <div className="h-8 w-8 rounded-md bg-brand-dim border border-brand/40 flex items-center justify-center">
            <ShieldAlert size={17} className="text-brand" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink leading-tight">AlertixAI</p>
            <p className="text-[11px] text-faint leading-tight">Enterprise Security</p>
          </div>
        </div>

        <nav className="space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-brand-dim text-brand border border-brand/30"
                    : "text-mist hover:bg-panel-2 hover:text-ink border border-transparent"
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-1 border-t border-border pt-4">
        <button className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-mist hover:bg-panel-2 hover:text-ink w-full">
          <HelpCircle size={16} />
          Support
        </button>
        <button className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-mist hover:bg-panel-2 hover:text-ink w-full">
          <FileText size={16} />
          Documentation
        </button>
      </div>
    </aside>
  );
}
