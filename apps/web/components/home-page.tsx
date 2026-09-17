'use client';

import { ArrowRight, Bike, Map, Mountain, Route, SlidersHorizontal, Wrench, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OptimizedImage } from '@/components/optimized-image';
import { CardGridSkeleton } from '@/components/page-loading';
import { Reveal } from '@/components/reveal';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { formatPrice } from '@/lib/catalog';
import { categoryCardDescription } from '@/lib/category-descriptions';
import { publicMediaUrl } from '@/lib/catalog-merge';
import { usePublicCatalog, type PublicCatalogData } from '@/lib/use-public-catalog';
import { usePublicCopy } from '@/lib/use-public-copy';

/**
 * Ikona i zapasowy opis dla kategorii startowych.
 *
 * Sama lista kategorii pochodzi z API, nie stąd: kategoria założona w panelu
 * ma się pokazać bez builda. Wcześniej pasek kategorii brał tylko te pięć
 * slugów, więc nowa kategoria nie pojawiała się na stronie głównej nigdy.
 */
const categoryIcons: Record<string, { icon: typeof Bike; description: string }> = {
  szosa: { icon: Route, description: 'Szybkość na asfalcie' },
  gravel: { icon: Map, description: 'Asfalt, szuter, wyprawa' },
  mtb: { icon: Mountain, description: 'Kontrola poza asfaltem' },
  'miejski-turystyczny': { icon: Bike, description: 'Komfort każdego dnia' },
  elektryczne: { icon: Zap, description: 'Moc i zasięg bez kompromisów' },
};

export function HomePage({ catalog, copy: initialCopy }: { catalog?: PublicCatalogData; copy?: unknown }) {
  const { models, categories: apiCategories, loaded } = usePublicCatalog(catalog);
  const copy = usePublicCopy(initialCopy);
  // „Wkrótce" bierze się z katalogu, a nie z listy w kodzie: kategoria bez
  // modeli dostaje znaczek, a gdy pierwszy model do niej trafi - znika sam.
  const visibleCategories = apiCategories.map((category) => {
    const known = categoryIcons[category.slug];
    return {
      slug: category.slug,
      name: category.name,
      description: categoryCardDescription(category.slug, category.short_description) || known?.description || '',
      icon: known?.icon ?? Bike,
      empty: loaded && !models.some((model) => model.categorySlug === category.slug),
      image: publicMediaUrl(category.default_image_path),
    };
  });
  return <div className="flex min-h-screen flex-col bg-background text-foreground"><SiteHeader /><main className="flex-1">
    <section className="mx-auto max-w-[1480px] px-4 pb-7 pt-10 sm:px-8 sm:pb-10 sm:pt-14 lg:px-12">
      <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
        <Reveal><p className="eyebrow">{copy.home.eyebrow}</p><h1 className="mt-3 max-w-3xl text-[clamp(1.6rem,4.2vw,3.6rem)] font-semibold leading-[0.95] tracking-[-0.045em]">{copy.home.heroTitle}</h1></Reveal>
        <Reveal delayMs={120} className="flex flex-col items-start gap-6 lg:items-end"><p className="max-w-lg text-base leading-relaxed text-ink-muted lg:text-right lg:text-lg">{copy.home.heroSubtitle}</p><Button render={<a href="/konfigurator" />} size="lg" className="h-12 rounded-full bg-ink px-6 text-white transition-transform hover:scale-[1.03] active:scale-[0.98]" data-testid="home-hero-button">{copy.home.heroCta} <SlidersHorizontal data-icon="inline-end" /></Button></Reveal>
      </div>
    </section>

    <section className="mx-auto max-w-[1480px] px-4 sm:px-8 lg:px-12">
      <Reveal delayMs={80} className="overflow-hidden rounded-[30px] border border-line bg-white" data-testid="home-categories-section">
        <div className="no-scrollbar flex snap-x overflow-x-auto" data-testid="categories-carousel">
          {visibleCategories.map(({ slug, name, description, icon: Icon, empty, image }, idx) => <a key={slug} href={`/rowery/${slug}`} className="group flex min-w-[58vw] snap-start flex-col border-r border-line last:border-r-0 sm:min-w-[260px] lg:min-w-0 lg:flex-1" data-testid={`category-link-${slug}`}>
            <div className="relative aspect-[4/3] overflow-hidden bg-ink-wash">
              {image ? <OptimizedImage src={image} alt="" width={900} height={600} priority={idx === 0} loading={idx < 3 ? 'eager' : 'lazy'} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" data-testid={`category-image-${slug}`} /> : null}
              <div className="absolute left-3 top-3 grid size-9 place-items-center rounded-full bg-white/90 shadow-sm backdrop-blur transition-colors duration-300 group-hover:bg-[var(--accent-brand)]"><Icon className="size-4.5 transition-transform duration-300 group-hover:rotate-6" /></div>
            </div>
            <div className="flex flex-1 flex-col p-5 lg:p-6">
              <strong className="text-lg tracking-tight">{name}</strong><span className="mt-1 block min-h-16 text-sm leading-relaxed text-ink-muted">{description}</span>{empty && <span className="mt-auto inline-block w-fit rounded-full bg-ink-wash px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-wider text-ink-subtle">{copy.home.comingSoonBadge}</span>}
            </div>
          </a>)}
        </div>
      </Reveal>
    </section>

    <section className="mx-auto max-w-[1480px] px-4 py-16 sm:px-8 lg:px-12 lg:py-24">
      <Reveal className="mb-8 flex items-end justify-between"><div><p className="eyebrow">{copy.home.modelsEyebrow}</p><h2 className="mt-2 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">{copy.home.modelsTitle}</h2></div><Button render={<a href="/rowery" data-testid="home-models-all-button" />} variant="ghost" className="hidden sm:inline-flex">{copy.home.modelsAllCta} <ArrowRight data-icon="inline-end" /></Button></Reveal>
      {/* Bez bramki na `loaded` sekcja pokazywała modele z listy zapasowej
          (z cenami sprzed wczytania katalogu) i podmieniała je w locie. */}
      {!loaded ? <CardGridSkeleton /> : <div className="grid gap-4 lg:grid-cols-3">{models.map((model, idx) => {
        const productHref = `/rowery/${model.categorySlug}/${model.id}`;
        const configHref = model.available ? `/konfigurator?model=${model.id}` : productHref;
        return (
          <Reveal key={model.id} delayMs={idx * 90}>
          <article className="group relative overflow-hidden rounded-[28px] bg-[var(--muted)] transition-shadow duration-300 hover:shadow-[0_10px_34px_rgba(0,0,0,0.09)] hover:-translate-y-1 focus-within:shadow-[0_10px_34px_rgba(0,0,0,0.09)] flex flex-col justify-between" data-testid={`model-card-${model.id}`}>
            <div>
              <a href={productHref} className="block overflow-hidden p-5 aspect-[4/3]" data-testid={`model-image-link-${model.id}`}>
                <OptimizedImage src={model.image} alt={model.name} className="size-full object-contain mix-blend-multiply" data-testid={`model-image-${model.id}`} />
              </a>
              <div className="bg-white p-5 sm:p-6 pb-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-ink-subtle">{model.category}</span>
                    <h3 className="mt-1 text-2xl font-semibold tracking-tight"><a href={productHref} className="hover:underline" data-testid={`model-name-link-${model.id}`}>{model.name}</a></h3>
                  </div>
                  <span className="text-sm font-semibold" data-testid={`model-price-${model.id}`}>{model.basePrice ? `od ${formatPrice(model.basePrice)}` : copy.home.priceSoon}</span>
                </div>
                <p className="mt-4 min-h-12 text-sm leading-relaxed text-ink-muted">{model.description}</p>
              </div>
            </div>
            <div className="bg-white px-5 pb-5 sm:px-6 sm:pb-6 pt-0">
              <div className="flex items-center gap-2 mt-4 border-t border-line/60 pt-4">
                <Button render={<a href={productHref} />} variant="ghost" size="card" data-testid={`model-learn-more-${model.id}`}>
                  {copy.home.modelLearnMoreCta}
                </Button>
                <Button render={<a href={configHref} />} variant="outline" size="card" className="flex-1 border-line-strong" data-testid={`model-action-${model.id}`}>
                  {model.available ? copy.home.modelConfigureCta : copy.home.modelDetailsCta} {model.available ? <SlidersHorizontal data-icon="inline-end" /> : <ArrowRight data-icon="inline-end" />}
                </Button>
              </div>
            </div>
          </article>
          </Reveal>
        );
      })}</div>}
    </section>

    <section className="bg-[#111] text-white" data-testid="service-section"><Reveal className="mx-auto grid max-w-[1480px] gap-10 px-4 py-16 sm:px-8 md:grid-cols-[0.8fr_1.2fr] lg:px-12 lg:py-24"><div><Wrench className="size-8 text-[var(--accent-brand)]" /><p className="mt-10 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-brand)]">{copy.home.serviceEyebrow}</p><h2 className="mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">{copy.home.serviceTitle}</h2></div><div className="flex flex-col items-start justify-end"><p className="max-w-xl text-lg leading-relaxed text-white/58">{copy.home.serviceText}</p><Button render={<a href="/serwis" />} className="mt-7 h-11 rounded-full bg-white px-5 text-ink transition-transform hover:bg-white/90 hover:scale-[1.03] active:scale-[0.98]" data-testid="home-service-button">{copy.home.serviceCta} <ArrowRight data-icon="inline-end" /></Button></div></Reveal></section>
  </main><SiteFooter /></div>;
}
