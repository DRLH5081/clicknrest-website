import type { Metadata } from "next";
import Link from "next/link";
import { getPage } from "@/lib/content";
import { getSetting } from "@/lib/settings";
import { Markdown } from "@/components/Markdown";
import { Picture } from "@/components/Picture";

export function generateMetadata(): Metadata {
  const page = getPage("about");
  return { title: page?.meta_title || "About us", description: page?.meta_description };
}

export default function AboutPage() {
  const page = getPage("about");
  const home = getSetting("home");
  return (
    <div className="container-x pt-12 md:pt-16">
      <div className="grid items-start gap-12 lg:grid-cols-2">
        <div>
          <p className="eyebrow">About</p>
          <h1 className="mt-2 font-display text-4xl md:text-5xl">{page?.title ?? "About us"}</h1>
          <Markdown source={page?.body ?? ""} className="prose-lite mt-8" />
          <Link href="/stays" className="btn-primary mt-4">
            Explore our homes
          </Link>
        </div>
        <div className="overflow-hidden rounded-4xl lg:sticky lg:top-28">
          <Picture mediaKey={home.introImage} alt="" sizes="(min-width: 1024px) 50vw, 100vw" className="aspect-[4/5] w-full" />
        </div>
      </div>
    </div>
  );
}
