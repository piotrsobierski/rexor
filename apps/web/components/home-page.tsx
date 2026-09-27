'use client';

import { ArrowRight, SlidersHorizontal, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OptimizedImage } from '@/components/optimized-image';
import { CardGridSkeleton } from '@/components/page-loading';
import { Reveal } from '@/components/reveal';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { formatPrice } from '@/lib/catalog';
import { categoryCardDescription } from '@/lib/category-descriptions';
import { resolveCategoryIcon } from '@/lib/category-icons';
import { publicMediaUrl } from '@/lib/catalog-merge';
import { usePublicCatalog, type PublicCatalogData } from '@/lib/use-public-catalog';
import { usePublicCopy, usePublicCopyReady } from '@/lib/use-public-copy';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Zapasowy opis dla kategorii startowych, gdy panel nie ma jeszcze własnego
 * krótkiego opisu. Ikona jest teraz konfigurowalna w panelu (zakładka
 * Kategorie) — patrz `resolveCategoryIcon` w `lib/category-icons.ts`.
 */
const categoryFallbackDescriptions: Record<string, string> = {
  szosa: 'Szybkość na asfalcie',
  gravel: 'Asfalt, szuter, wyprawa',
  mtb: 'Kontrola poza asfaltem',
  'miejski-turystyczny': 'Komfort każdego dnia',
  elektryczne: 'Moc i zasięg bez kompromisów',
};

export function HomePage({ catalog }: { catalog?: PublicCatalogData }) {
  const { models, categories: apiCategories, loaded } = usePublicCatalog(catalog);
  const copy = usePublicCopy();
  // Szkielet zamiast tekstu z builda: przy eksporcie statycznym teksty z panelu
  // docierają z /api chwilę po załadowaniu (patrz copy-provider.tsx).
  const copyReady = usePublicCopyReady();
  const recommendedModels = models.filter((model) => model.recommended === true);
  // „Wkrótce" bierze się z katalogu, a nie z listy w kodzie: kategoria bez
  // modeli dostaje znaczek, a gdy pierwszy model do niej trafi - znika sam.
  const visibleCategories = apiCategories.map((category) => {
    const fallbackDescription = categoryFallbackDescriptions[category.slug] ?? '';
    return {
      slug: category.slug,
      name: category.name,
      description: categoryCardDescription(category.slug, category.short_description) || fallbackDescription,
      icon: resolveCategoryIcon(category.icon_key, category.slug),
      empty: loaded && !models.some((model) => model.categorySlug === category.slug),
      image: publicMediaUrl(category.default_image_path),
    };
  });
  return <div className="flex min-h-screen flex-col bg-background text-foreground"><SiteHeader /><main className="flex-1">
    <section className="mx-auto max-w-[1480px] px-4 pb-7 pt-10 sm:px-8 sm:pb-10 sm:pt-14 lg:px-12">
      <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
        <Reveal><p className="eyebrow">{copyReady ? copy.home.eyebrow : <Skeleton aria-hidden="true" className="h-3 w-16" />}</p><h1 className="mt-3 max-w-3xl text-[clamp(1.6rem,4.2vw,3.6rem)] font-semibold leading-[0.95] tracking-[-0.045em]">{copyReady ? copy.home.heroTitle : <Skeleton aria-hidden="true" className="h-10 w-2/3 sm:h-14" />}</h1></Reveal>
        <Reveal delayMs={120} className="flex flex-col items-start gap-6 lg:items-end"><p className="max-w-lg text-base leading-relaxed text-ink-muted lg:text-right lg:text-lg">{copyReady ? copy.home.heroSubtitle : <Skeleton aria-hidden="true" className="h-5 w-full" />}</p><Button render={<a href="/konfigurator" />} size="lg" className="h-12 rounded-full bg-ink px-6 text-white transition-transform hover:scale-[1.03] active:scale-[0.98]" data-testid="home-hero-button">{copyReady ? copy.home.heroCta : <Skeleton aria-hidden="true" className="h-4 w-36" />} <SlidersHorizontal data-icon="inline-end" /></Button></Reveal>
      </div>
    </section>

    <section className="mx-auto max-w-[1480px] px-4 sm:px-8 lg:px-12">
      <Reveal delayMs={80} className="overflow-hidden rounded-[30px] border border-line bg-white" data-testid="home-categories-section">
        <div className="no-scrollbar flex snap-x overflow-x-auto" data-testid="categories-carousel">
          {visibleCategories.map(({ slug, name, description, icon: Icon, empty, image }, idx) => <a key={slug} href={`/rowery/${slug}`} className="group flex min-w-[58vw] snap-start flex-col border-r border-line last:border-r-0 sm:min-w-[260px] lg:min-w-0 lg:flex-1" data-testid={`category-link-${slug}`}>
            <div className="relative aspect-[4/3] overflow-hidden bg-ink-wash">
              {image ? <OptimizedImage src={image} alt="" width={900} height={600} priority={idx === 0} loading={idx < 3 ? 'eager' : 'lazy'} className="size-full object-contain transition-transform duration-500 group-hover:scale-105" data-testid={`category-image-${slug}`} /> : null}
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
      <Reveal className="mb-8 flex items-end justify-between"><div><p className="eyebrow">{copyReady ? copy.home.modelsEyebrow : <Skeleton aria-hidden="true" className="h-3 w-24" />}</p><h2 className="mt-2 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">{copyReady ? copy.home.modelsTitle : <Skeleton aria-hidden="true" className="h-10 w-64 sm:h-12" />}</h2></div><Button render={<a href="/rowery" data-testid="home-models-all-button" />} variant="ghost" className="hidden sm:inline-flex">{copyReady ? copy.home.modelsAllCta : <Skeleton aria-hidden="true" className="h-4 w-28" />} <ArrowRight data-icon="inline-end" /></Button></Reveal>
      {/* Bez bramki na `loaded` sekcja pokazywała modele z listy zapasowej
          (z cenami sprzed wczytania katalogu) i podmieniała je w locie. */}
      {!loaded ? <CardGridSkeleton /> : recommendedModels.length === 0 ? (
        <div role="status" className="rounded-[28px] border border-line bg-ink-wash p-6 sm:p-8" data-testid="home-models-empty">
          <h3 className="text-xl font-semibold tracking-tight">{copy.home.modelsEmptyTitle}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{copy.home.modelsEmptyText}</p>
          <Button render={<a href="/rowery" />} variant="outline" className="mt-5">{copy.home.modelsAllCta} <ArrowRight data-icon="inline-end" /></Button>
        </div>
      ) : <div className="grid gap-4 lg:grid-cols-3">{recommendedModels.map((model, idx) => {
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

    <section className="bg-[#111] text-white" data-testid="service-section"><Reveal className="mx-auto grid max-w-[1480px] gap-10 px-4 py-16 sm:px-8 md:grid-cols-[0.8fr_1.2fr] lg:px-12 lg:py-24"><div><Wrench className="size-8 text-[var(--accent-brand)]" /><p className="mt-10 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-brand)]">{copyReady ? copy.home.serviceEyebrow : <Skeleton aria-hidden="true" className="h-3 w-24 bg-white/15" />}</p><h2 className="mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">{copyReady ? copy.home.serviceTitle : <Skeleton aria-hidden="true" className="h-10 w-64 bg-white/15 sm:h-12" />}</h2></div><div className="flex flex-col items-start justify-end"><p className="max-w-xl text-lg leading-relaxed text-white/58">{copyReady ? copy.home.serviceText : <Skeleton aria-hidden="true" className="h-5 w-full max-w-xl bg-white/15" />}</p><Button render={<a href="/serwis" />} className="mt-7 h-11 rounded-full bg-white px-5 text-ink transition-transform hover:bg-white/90 hover:scale-[1.03] active:scale-[0.98]" data-testid="home-service-button">{copyReady ? copy.home.serviceCta : <Skeleton aria-hidden="true" className="h-4 w-32 bg-white/25" />} <ArrowRight data-icon="inline-end" /></Button></div></Reveal></section>
  </main><SiteFooter /></div>;
}
