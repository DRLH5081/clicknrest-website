import Link from "next/link";
import { listAllProperties, fromPrice } from "@/lib/properties";
import { getSetting } from "@/lib/settings";
import { todayIn } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { PageHeader, StatusBadge, Flash } from "@/components/admin/ui";
import { Picture } from "@/components/Picture";
import { Icon } from "@/components/Icon";
import { SubmitButton } from "@/components/SubmitButton";
import { moveProperty } from "../../actions";

export const metadata = { title: "Properties" };

export default async function PropertiesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const props = listAllProperties();
  const { currency, locale, timeZone } = getSetting("regional");
  const today = todayIn(timeZone);
  return (
    <>
      <PageHeader title="Properties" description="Add, edit, reorder, publish and archive your homes. The order here is the order on the website." actions={<Link href="/admin/properties/new" className="btn-primary"><Icon name="plus" className="h-4 w-4" /> Add property</Link>} />
      <Flash ok={sp.ok} error={sp.error} />
      <ul className="space-y-3">
        {props.map((p) => (
          <li key={p.id} className={`card flex items-center gap-4 p-3 pr-5 ${p.status === "archived" ? "opacity-60" : ""}`}>
            <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl">
              <Picture mediaKey={p.images[0]?.media_key} alt="" sizes="96px" className="h-full w-full" />
            </div>
            <div className="min-w-0 flex-1">
              <Link href={`/admin/properties/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
              <p className="truncate text-xs text-ink-muted">{p.town}, {p.region} · sleeps {p.max_guests} · from {formatMoney(fromPrice(p, today), currency, locale, { whole: true })} · {p.images.length} photos · /stays/{p.slug}</p>
            </div>
            <StatusBadge status={p.status} />
            {p.is_demo ? <span className="badge hidden bg-sand-100 text-ink-muted sm:inline-flex">Demo content</span> : null}
            <div className="flex gap-1">
              <form action={moveProperty.bind(null, p.id, "up")}><SubmitButton className="btn-ghost h-9 w-9 p-0" pendingLabel=""><span className="sr-only">Move {p.name} up</span><Icon name="up" className="h-4 w-4" /></SubmitButton></form>
              <form action={moveProperty.bind(null, p.id, "down")}><SubmitButton className="btn-ghost h-9 w-9 p-0" pendingLabel=""><span className="sr-only">Move {p.name} down</span><Icon name="down" className="h-4 w-4" /></SubmitButton></form>
            </div>
            <Link href={`/admin/properties/${p.id}`} className="btn-outline btn-sm">Edit</Link>
          </li>
        ))}
      </ul>
    </>
  );
}
