import Link from "next/link";
import { getSetting } from "@/lib/settings";
import { listPublishedProperties, fromPrice, locations } from "@/lib/properties";
import { todayIn } from "@/lib/dates";
import { Picture } from "@/components/Picture";
import { SearchBar } from "@/components/site/SearchBar";
import { PropertyCard } from "@/components/site/PropertyCard";
import { Icon, type IconName } from "@/components/Icon";

const BENEFIT_ICONS: IconName[] = ["tag", "chat", "calendar", "shield"];

export default function HomePage() {
  const home = getSetting("home");
  const { currency, locale, timeZone } = getSetting("regional");
  const today = todayIn(timeZone);
  const props = listPublishedProperties();
  const featured = props.filter((p) => p.featured).slice(0, 6);

  return (
    <>
      {/* Hero */}
      <section className="relative">
        <div className="relative h-[78vh] min-h-[560px] w-full overflow-hidden md:h-[86vh]">
          <Picture mediaKey={home.heroImage} alt="" priority className="absolute inset-0 h-full w-full scale-105 animate-[fade-in_1.2s_ease_both]" />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/50 via-ink/25 to-ink/60" aria-hidden />
          <div className="container-x relative flex h-full flex-col justify-center pb-24 pt-10 text-white">
            <p className="animate-fade-up text-xs font-semibold uppercase tracking-[0.22em] text-sand-100">{home.heroEyebrow}</p>
            <h1 className="mt-4 max-w-3xl animate-fade-up font-display text-4xl leading-[1.08] [animation-delay:80ms] sm:text-5xl lg:text-6xl">{home.heroHeadline}</h1>
            <p className="mt-5 max-w-xl animate-fade-up text-base leading-relaxed text-sand-50 [animation-delay:160ms] md:text-lg">{home.heroIntro}</p>
            <div className="mt-8 flex animate-fade-up flex-wrap gap-3 [animation-delay:240ms]">
              <Link href="/stays" className="btn-primary px-6 py-3 text-base">
                Explore properties <Icon name="arrowRight" className="h-4 w-4" />
              </Link>
              <Link href="/about" className="btn rounded-full border border-white/50 bg-white/10 px-6 py-3 text-base text-white backdrop-blur hover:bg-white/20">
                Our story
              </Link>
            </div>
          </div>
        </div>
        <div className="container-x relative z-10 -mt-16 animate-fade-up [animation-delay:320ms] md:-mt-12">
          <div className="mx-auto max-w-5xl">
            <SearchBar regions={locations(props)} today={today} />
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="container-x mt-24" aria-labelledby="featured-heading">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">Our apartments</p>
            <h2 id="featured-heading" className="mt-2 font-display text-3xl md:text-4xl">
              Somewhere to rest, wherever you&apos;re headed
            </h2>
          </div>
          <Link href="/stays" className="btn-outline self-start sm:self-auto">
            View all stays <Icon name="arrowRight" className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((p, i) => (
            <PropertyCard
              key={p.id}
              currency={currency}
              locale={locale}
              priority={i < 3}
              p={{ ...p, image: p.images[0], fromPrice: fromPrice(p, today) }}
            />
          ))}
        </div>
        {featured.length === 0 && <p className="mt-10 rounded-3xl bg-sand-100 p-10 text-center text-ink-soft">New homes are coming soon. Check back shortly.</p>}
      </section>

      {/* Brand intro */}
      <section className="container-x mt-28">
        <div className="grid items-center gap-10 rounded-4xl bg-sand-100 p-8 md:grid-cols-2 md:p-14">
          <div>
            <p className="eyebrow">Our story</p>
            <h2 className="mt-3 font-display text-3xl leading-tight md:text-4xl">{home.introTitle}</h2>
            <p className="mt-5 leading-relaxed text-ink-soft">{home.introBody}</p>
            <Link href="/about" className="btn-dark mt-8">
              About us
            </Link>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl">
            <Picture mediaKey={home.introImage} alt="" sizes="(min-width: 768px) 50vw, 100vw" className="h-full w-full" />
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="container-x mt-28" aria-labelledby="benefits-heading">
        <div className="max-w-2xl">
          <p className="eyebrow">Book direct</p>
          <h2 id="benefits-heading" className="mt-2 font-display text-3xl md:text-4xl">
            {home.benefitsTitle}
          </h2>
        </div>
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {home.benefits.map((b, i) => (
            <li key={i} className="card p-6 transition duration-300 hover:-translate-y-1 hover:shadow-lift">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold-50 text-gold-600">
                <Icon name={BENEFIT_ICONS[i % BENEFIT_ICONS.length]} />
              </span>
              <h3 className="mt-5 font-display text-lg">{b.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{b.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Experiences */}
      <section className="container-x mt-28" aria-labelledby="exp-heading">
        <div className="max-w-2xl">
          <p className="eyebrow">Around the homes</p>
          <h2 id="exp-heading" className="mt-2 font-display text-3xl md:text-4xl">
            {home.experiencesTitle}
          </h2>
          <p className="mt-4 text-ink-soft">{home.experiencesIntro}</p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {home.experiences.map((x, i) => (
            <figure key={i} className="group overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-sand-200/70">
              <div className="aspect-[4/3] overflow-hidden">
                <Picture mediaKey={x.image} alt="" sizes="(min-width: 768px) 33vw, 100vw" className="h-full w-full transition duration-700 group-hover:scale-105" />
              </div>
              <figcaption className="p-6">
                <h3 className="font-display text-xl">{x.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{x.body}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container-x mt-28">
        <div className="relative overflow-hidden rounded-4xl bg-ink px-8 py-16 text-center text-white md:px-16">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-gold-600/30 blur-3xl" aria-hidden />
          <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-olive-600/30 blur-3xl" aria-hidden />
          <h2 className="relative font-display text-3xl md:text-5xl">{home.ctaTitle}</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-sand-200">{home.ctaBody}</p>
          <Link href="/stays" className="btn-primary relative mt-8 px-7 py-3 text-base">
            Explore properties <Icon name="arrowRight" className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
