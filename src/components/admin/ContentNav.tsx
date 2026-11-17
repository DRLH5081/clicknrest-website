import Link from "next/link";
import { listPages } from "@/lib/content";

export function ContentNav({ current }: { current: string }) {
  const items = [{ href: "/admin/content", label: "Homepage", key: "home" }, { href: "/admin/content/faqs", label: "FAQs", key: "faqs" }, ...listPages().map((p) => ({ href: `/admin/content/pages/${p.slug}`, label: p.title, key: p.slug }))];
  return (
    <nav className="mb-6 flex flex-wrap gap-1.5" aria-label="Content sections">
      {items.map((i) => (
        <Link key={i.key} href={i.href} aria-current={current === i.key ? "page" : undefined} className={`rounded-full px-3.5 py-1.5 text-sm ${current === i.key ? "bg-ink text-white" : "bg-white text-ink-soft ring-1 ring-sand-200 hover:ring-ink"}`}>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
