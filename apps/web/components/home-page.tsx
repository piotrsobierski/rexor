import { ArrowRight, Bike, Map, Mountain, Route, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { formatPrice } from '@/lib/catalog';
import { usePublicCatalog, type PublicCatalogData } from '@/lib/use-public-catalog';

const categories = [
  { slug: 'szosa', name: 'Szosa', description: 'Szybkość na asfalcie', icon: Route, empty: true },
  { slug: 'gravel', name: 'Gravel', description: 'Asfalt, szuter, wyprawa', icon: Map, empty: false },
  { slug: 'mtb', name: 'MTB', description: 'Kontrola poza asfaltem', icon: Mountain, empty: false },
  { slug: 'miejski-turystyczny', name: 'Miejski i turystyczny', description: 'Komfort każdego dnia', icon: Bike, empty: true },
];

export function HomePage({ catalog }: { catalog?: PublicCatalogData }) {
  const { models, categories: apiCategories } = usePublicCatalog(catalog);
  const visibleCategories = categories.map((fallback) => {
    const stored = apiCategories.find((item) => item.slug === fallback.slug);
    return { ...fallback, name: stored?.name ?? fallback.name, description: stored?.short_description ?? fallback.description };
  });
  return <div className="flex min-h-screen flex-col bg-background text-foreground"><SiteHeader /><main className="flex-1">
    <section className="mx-auto max-w-[1480px] px-4 pb-7 pt-10 sm:px-8 sm:pb-10 sm:pt-14 lg:px-12">
      <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
        <div><p className="eyebrow">Rexor bikes</p><h1 className="mt-3 max-w-3xl text-[clamp(2.8rem,7vw,6.8rem)] font-semibold leading-[0.88] tracking-[-0.065em]">Zbudowany dla Twojej trasy.</h1></div>
        <div className="flex flex-col items-start gap-6 lg:items-end"><p className="max-w-lg text-base leading-relaxed text-ink-muted lg:text-right lg:text-lg">Wybierz konstrukcję, dobierz komponenty i zobacz cenę projektu jeszcze przed rozmową z Rexor.</p><Button render={<a href="/konfigurator" />} size="lg" className="h-12 rounded-full bg-ink px-6 text-white">Rozpocznij konfigurację <ArrowRight data-icon="inline-end" /></Button></div>
      </div>
    </section>

    <section className="mx-auto max-w-[1480px] px-4 sm:px-8 lg:px-12">
      <div className="overflow-hidden rounded-[30px] border border-line bg-white">
        <div className="no-scrollbar flex snap-x overflow-x-auto">
          {visibleCategories.map(({ name, description, icon: Icon, empty }) => <a key={name} href={empty ? '/rowery' : name === 'MTB' ? '/konfigurator' : '/rowery'} className="group flex min-w-[58vw] snap-start flex-col border-r border-line p-5 last:border-r-0 sm:min-w-[260px] lg:min-w-0 lg:flex-1 lg:p-6"><div className="grid size-11 place-items-center rounded-full bg-ink-wash transition-colors group-hover:bg-[var(--accent-brand)]"><Icon className="size-5" /></div><strong className="mt-10 text-lg tracking-tight">{name}</strong><span className="mt-1 text-sm text-ink-muted">{description}</span>{empty && <span className="mt-4 w-fit rounded-full bg-ink-wash px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-wider text-ink-subtle">W przygotowaniu</span>}</a>)}
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-[1480px] px-4 py-16 sm:px-8 lg:px-12 lg:py-24">
      <div className="mb-8 flex items-end justify-between"><div><p className="eyebrow">Modele startowe</p><h2 className="mt-2 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Wybierz swoją bazę.</h2></div><Button render={<a href="/rowery" />} variant="ghost" className="hidden sm:inline-flex">Wszystkie rowery <ArrowRight data-icon="inline-end" /></Button></div>
      <div className="grid gap-4 lg:grid-cols-3">{models.map((model) => <article key={model.id} className="group relative overflow-hidden rounded-[28px] bg-[var(--muted)] transition-shadow hover:shadow-[0_10px_34px_rgba(0,0,0,0.09)] focus-within:shadow-[0_10px_34px_rgba(0,0,0,0.09)]"><div className="aspect-[4/3] overflow-hidden p-5"><img src={model.image} alt={model.name} className="size-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-[1.035]" /></div><div className="bg-white p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><span className="text-xs font-bold uppercase tracking-[0.14em] text-ink-subtle">{model.category}</span><h3 className="mt-1 text-2xl font-semibold tracking-tight">{model.name}</h3></div><span className="text-sm font-semibold">{model.basePrice ? `od ${formatPrice(model.basePrice)}` : 'Wkrótce'}</span></div><p className="mt-4 min-h-12 text-sm leading-relaxed text-ink-muted">{model.description}</p><Button render={<a href={model.available ? `/konfigurator?model=${model.id}` : '/rowery'} />} variant="outline" className="pick-card-hit mt-5 h-11 w-full rounded-full border-line-strong">{model.available ? 'Konfiguruj model' : 'Poznaj model'} <ArrowRight data-icon="inline-end" /></Button></div></article>)}</div>
    </section>

    <section className="bg-[#111] text-white"><div className="mx-auto grid max-w-[1480px] gap-10 px-4 py-16 sm:px-8 md:grid-cols-[0.8fr_1.2fr] lg:px-12 lg:py-24"><div><Wrench className="size-8 text-[var(--accent-brand)]" /><p className="mt-10 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-brand)]">Serwis Rexor</p><h2 className="mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Opieka po pierwszym kilometrze.</h2></div><div className="flex flex-col items-start justify-end"><p className="max-w-xl text-lg leading-relaxed text-white/58">Diagnostyka napędu, regulacja zawieszenia, hamulców i przeglądy okresowe. Zakres zawsze potwierdzamy przed rozpoczęciem prac.</p><Button render={<a href="/serwis" />} className="mt-7 h-11 rounded-full bg-white px-5 text-ink hover:bg-white/90">Sprawdź serwis <ArrowRight data-icon="inline-end" /></Button></div></div></section>
  </main><SiteFooter /></div>;
}
'use client';
