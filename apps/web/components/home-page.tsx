'use client';

import { ArrowRight, Bike, Map, Mountain, Route, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/reveal';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { formatPrice } from '@/lib/catalog';
import { usePublicCatalog, type PublicCatalogData } from '@/lib/use-public-catalog';
import { usePublicCopy } from '@/lib/use-public-copy';

const categoryIcons = [
  { slug: 'szosa', name: 'Szosa', description: 'Szybkość na asfalcie', icon: Route, empty: true },
  { slug: 'gravel', name: 'Gravel', description: 'Asfalt, szuter, wyprawa', icon: Map, empty: false },
  { slug: 'mtb', name: 'MTB', description: 'Kontrola poza asfaltem', icon: Mountain, empty: false },
  { slug: 'miejski-turystyczny', name: 'Miejski i turystyczny', description: 'Komfort każdego dnia', icon: Bike, empty: true },
];

export function HomePage({ catalog, copy: initialCopy }: { catalog?: PublicCatalogData; copy?: unknown }) {
  const { models, categories: apiCategories } = usePublicCatalog(catalog);
  const copy = usePublicCopy(initialCopy);
  const visibleCategories = categoryIcons.map((fallback) => {
    const stored = apiCategories.find((item) => item.slug === fallback.slug);
    return { ...fallback, name: stored?.name ?? fallback.name, description: stored?.short_description ?? fallback.description };
  });
  return <div className="flex min-h-screen flex-col bg-background text-foreground"><SiteHeader /><main className="flex-1">
    <section className="mx-auto max-w-[1480px] px-4 pb-7 pt-10 sm:px-8 sm:pb-10 sm:pt-14 lg:px-12">
      <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
        <Reveal><p className="eyebrow">{copy.home.eyebrow}</p><h1 className="mt-3 max-w-3xl whitespace-nowrap text-[clamp(1.6rem,4.2vw,3.6rem)] font-semibold leading-[0.95] tracking-[-0.045em]">{copy.home.heroTitle}</h1></Reveal>
        <Reveal delayMs={120} className="flex flex-col items-start gap-6 lg:items-end"><p className="max-w-lg text-base leading-relaxed text-ink-muted lg:text-right lg:text-lg">{copy.home.heroSubtitle}</p><Button render={<a href="/konfigurator" />} size="lg" className="h-12 rounded-full bg-ink px-6 text-white transition-transform hover:scale-[1.03] active:scale-[0.98]">{copy.home.heroCta} <ArrowRight data-icon="inline-end" /></Button></Reveal>
      </div>
    </section>

    <section className="mx-auto max-w-[1480px] px-4 sm:px-8 lg:px-12">
      <Reveal delayMs={80} className="overflow-hidden rounded-[30px] border border-line bg-white">
        <div className="no-scrollbar flex snap-x overflow-x-auto">
          {visibleCategories.map(({ slug, name, description, icon: Icon, empty }) => <a key={name} href={`/rowery/${slug}`} className="group flex min-w-[58vw] snap-start flex-col border-r border-line p-5 last:border-r-0 sm:min-w-[260px] lg:min-w-0 lg:flex-1 lg:p-6"><div className="grid size-11 place-items-center rounded-full bg-ink-wash transition-colors duration-300 group-hover:bg-[var(--accent-brand)] group-hover:scale-110"><Icon className="size-5 transition-transform duration-300 group-hover:rotate-6" /></div><strong className="mt-10 text-lg tracking-tight">{name}</strong><span className="mt-1 text-sm text-ink-muted">{description}</span>{empty && <span className="mt-4 w-fit rounded-full bg-ink-wash px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-wider text-ink-subtle">{copy.home.comingSoonBadge}</span>}</a>)}
        </div>
      </Reveal>
    </section>

    <section className="mx-auto max-w-[1480px] px-4 py-16 sm:px-8 lg:px-12 lg:py-24">
      <Reveal className="mb-8 flex items-end justify-between"><div><p className="eyebrow">{copy.home.modelsEyebrow}</p><h2 className="mt-2 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">{copy.home.modelsTitle}</h2></div><Button render={<a href="/rowery" />} variant="ghost" className="hidden sm:inline-flex">{copy.home.modelsAllCta} <ArrowRight data-icon="inline-end" /></Button></Reveal>
      <div className="grid gap-4 lg:grid-cols-3">{models.map((model, idx) => {
        const productHref = `/rowery/${model.categorySlug}/${model.id}`;
        const configHref = model.available ? `/konfigurator?model=${model.id}` : productHref;
        return (
          <Reveal key={model.id} delayMs={idx * 90}>
          <article className="group relative overflow-hidden rounded-[28px] bg-[var(--muted)] transition-shadow duration-300 hover:shadow-[0_10px_34px_rgba(0,0,0,0.09)] hover:-translate-y-1 focus-within:shadow-[0_10px_34px_rgba(0,0,0,0.09)] flex flex-col justify-between">
            <div>
              <a href={productHref} className="block overflow-hidden p-5 aspect-[4/3]">
                <img src={model.image} alt={model.name} className="size-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-[1.035]" />
              </a>
              <div className="bg-white p-5 sm:p-6 pb-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-ink-subtle">{model.category}</span>
                    <h3 className="mt-1 text-2xl font-semibold tracking-tight"><a href={productHref} className="hover:underline">{model.name}</a></h3>
                  </div>
                  <span className="text-sm font-semibold">{model.basePrice ? `od ${formatPrice(model.basePrice)}` : copy.home.priceSoon}</span>
                </div>
                <p className="mt-4 min-h-12 text-sm leading-relaxed text-ink-muted">{model.description}</p>
              </div>
            </div>
            <div className="bg-white px-5 pb-5 sm:px-6 sm:pb-6 pt-0">
              <div className="flex items-center gap-2 mt-4 border-t border-line/60 pt-4">
                <Button render={<a href={productHref} />} variant="ghost" size="sm" className="rounded-full text-xs">
                  {copy.home.modelLearnMoreCta}
                </Button>
                <Button render={<a href={configHref} />} variant="outline" size="sm" className="flex-1 rounded-full border-line-strong text-xs font-medium">
                  {model.available ? copy.home.modelConfigureCta : copy.home.modelDetailsCta} <ArrowRight data-icon="inline-end" className="size-3.5" />
                </Button>
              </div>
            </div>
          </article>
          </Reveal>
        );
      })}</div>
    </section>

    <section className="bg-[#111] text-white"><Reveal className="mx-auto grid max-w-[1480px] gap-10 px-4 py-16 sm:px-8 md:grid-cols-[0.8fr_1.2fr] lg:px-12 lg:py-24"><div><Wrench className="size-8 text-[var(--accent-brand)]" /><p className="mt-10 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-brand)]">{copy.home.serviceEyebrow}</p><h2 className="mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">{copy.home.serviceTitle}</h2></div><div className="flex flex-col items-start justify-end"><p className="max-w-xl text-lg leading-relaxed text-white/58">{copy.home.serviceText}</p><Button render={<a href="/serwis" />} className="mt-7 h-11 rounded-full bg-white px-5 text-ink transition-transform hover:bg-white/90 hover:scale-[1.03] active:scale-[0.98]">{copy.home.serviceCta} <ArrowRight data-icon="inline-end" /></Button></div></Reveal></section>
  </main><SiteFooter /></div>;
}
