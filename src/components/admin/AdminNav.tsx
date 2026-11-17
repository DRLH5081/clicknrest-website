"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "../Icon";

const ITEMS = [
  { href: "/admin", label: "Overview", icon: "chart", exact: true },
  { href: "/admin/bookings", label: "Bookings", icon: "list" },
  { href: "/admin/calendar", label: "Calendar", icon: "calendar" },
  { href: "/admin/properties", label: "Properties", icon: "home" },
  { href: "/admin/enquiries", label: "Enquiries", icon: "chat" },
  { href: "/admin/content", label: "Site content", icon: "edit" },
  { href: "/admin/emails", label: "Email log", icon: "mail" },
  { href: "/admin/settings", label: "Settings", icon: "settings" },
];

export function AdminNav({ badges }: { badges: Record<string, number> }) {
  const path = usePathname();
  return (
    <nav aria-label="Dashboard" className="flex gap-1 overflow-x-auto lg:flex-col">
      {ITEMS.map((i) => {
        const active = i.exact ? path === i.href : path.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "bg-white text-ink shadow-soft" : "text-ink-soft hover:bg-white/60 hover:text-ink"}`}
          >
            <Icon name={i.icon} className="h-4 w-4" />
            {i.label}
            {badges[i.href] ? <span className="ml-auto rounded-full bg-gold-600 px-2 py-0.5 text-[11px] font-semibold text-white">{badges[i.href]}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
