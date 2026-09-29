'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowLeft, ArrowRight, BatteryCharging, Gauge, MessageSquareText, ShieldAlert, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OptimizedImage } from '@/components/optimized-image';
import { GalleryImageButton } from '@/components/gallery-lightbox';
import { PageFrame } from '@/components/page-frame';
import { CardGridSkeleton, ProductDetailSkeleton } from '@/components/page-loading';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPrice, type BikeModel } from '@/lib/catalog';
import { publicMediaUrl } from '@/lib/catalog-merge';
import { usePublicCatalog, type PublicCatalogData } from '@/lib/use-public-catalog';
import { usePublicCopy, usePublicCopyReady } from '@/lib/use-public-copy';
import type { SiteCopy } from '@/lib/copy';


function BikePickCard({ model, copy }: { model: BikeModel; copy: SiteCopy }) {
  const productHref = `/rowery/${model.categorySlug}/${model.id}`;
  const configHref = model.available ? `/konfigurator?model=${model.id}` : '/kontakt';

  return (
    <article className="overflow-hidden rounded-[28px] border border-line bg-white transition-shadow hover:shadow-[0_10px_34px_rgba(0,0,0,0.09)] focus-within:shadow-[0_10px_34px_rgba(0,0,0,0.09)] flex flex-col justify-between">
      <div>
        <a href={productHref} aria-label={`Poznaj ${model.name}`} className="block text-inherit no-underline">
          <div className="aspect-[4/3] overflow-hidden bg-white">
            <OptimizedImage src={model.image} alt={model.name} className="size-full object-contain" />
          </div>
          <div className="p-6 pb-2">
            <span className="eyebrow">{model.category}</span>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">{model.name}</h2>
            <p className="mt-3 min-h-16 leading-relaxed text-ink-muted">{model.description}</p>
          </div>
        </a>
      </div>
      <div className="p-6 pt-2">
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-4">
          <strong>{model.basePrice ? `od ${formatPrice(model.basePrice)}` : copy.bikes.priceSoon}</strong>
          <div className="flex items-center gap-2">
            <Button render={<a href={productHref} />} variant="ghost" size="card">
              {copy.bikes.cardDetailsCta}
            </Button>
            <Button render={<a href={configHref} />} variant="outline" size="card" className="border-line-strong">
              {model.available ? copy.bikes.configureCta : copy.bikes.askCta} {model.available ? <SlidersHorizontal data-icon="inline-end" /> : <MessageSquareText data-icon="inline-end" />}
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

export function BikesPage({ catalog }: { catalog?: PublicCatalogData }) {
  // Ceny i zdjęcia pochodzą z katalogu API, bo cena "od" jest wyliczana z
  // cennika części, a nie wpisana w kodzie. Katalog przychodzi z serwera,
  // żeby pierwszy render nie pokazywał danych zapasowych.
  const { models, categories, loaded } = usePublicCatalog(catalog);
  const copy = usePublicCopy();
  const copyReady = usePublicCopyReady();
  const [activeCategorySlug, setActiveCategorySlug] = useState<string | null>(null);
  const filters = useMemo(
    () => categories.filter((category) => models.some((model) => model.categorySlug === category.slug)),
    [categories, models],
  );
  // Jeśli z panelu zniknie ostatni model kategorii, nie zostawiamy klienta
  // na pustej liście bez możliwości powrotu do wszystkich rowerów.
  const effectiveCategorySlug = activeCategorySlug && filters.some((category) => category.slug === activeCategorySlug)
    ? activeCategorySlug
    : null;
  const visibleModels = effectiveCategorySlug
    ? models.filter((model) => model.categorySlug === effectiveCategorySlug)
    : models;

  return (
    <PageFrame>
      <section className="mx-auto max-w-[1480px] px-4 py-12 sm:px-8 lg:px-12 lg:py-20">
        <p className="eyebrow">{copyReady ? copy.bikes.eyebrow : <Skeleton aria-hidden="true" className="h-3 w-24" />}</p>
        <h1 className="mt-3 text-5xl font-semibold tracking-[-0.06em] sm:text-7xl">{copyReady ? copy.bikes.title : <Skeleton aria-hidden="true" className="h-12 w-2/3 sm:h-16" />}</h1>
        {loaded ? (
          <>
            <fieldset className="-mx-4 mt-8 flex min-w-0 gap-2 overflow-x-auto border-0 px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
              <legend className="sr-only">{copy.collection.filtersAria}</legend>
              <BikeFilterButton label={copy.collection.allFilter} active={effectiveCategorySlug === null} onClick={() => setActiveCategorySlug(null)} />
              {filters.map((category) => (
                <BikeFilterButton key={category.slug} label={category.name} active={effectiveCategorySlug === category.slug} onClick={() => setActiveCategorySlug(category.slug)} />
              ))}
            </fieldset>
            <div className="mt-6 grid gap-5 lg:grid-cols-3">
              {visibleModels.map((model) => <BikePickCard key={model.id} model={model} copy={copy} />)}
            </div>
          </>
        ) : <CardGridSkeleton />}
      </section>
    </PageFrame>
  );
}

function BikeFilterButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return <Button type="button" onClick={onClick} aria-pressed={active} variant={active ? 'default' : 'outline'} size="sm" className={`shrink-0 rounded-full px-4 ${active ? 'bg-ink text-white hover:bg-black' : 'border-line text-ink-muted hover:text-ink'}`}>{label}</Button>;
}

/** Kategorie, które przekraczają moc/prędkość roweru elektrycznego - klient musi potwierdzić ostrzeżenie raz na przeglądarkę zanim zobaczy ofertę. */
const restrictedCategorySlugs = ['elektryczne'];

export function CategoryPage({ catalog, categorySlug }: { catalog?: PublicCatalogData; categorySlug: string }) {
  const { models, categories, loaded } = usePublicCatalog(catalog);
  const copy = usePublicCopy();
  const copyReady = usePublicCopyReady();
  const category = categories.find((item) => item.slug === categorySlug);
  const categoryModels = models.filter((model) => model.categorySlug === categorySlug);
  const isRestricted = restrictedCategorySlugs.includes(categorySlug);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

  useEffect(() => {
    if (!isRestricted) return;
    setDisclaimerAccepted(window.localStorage.getItem(`rexor_disclaimer_${categorySlug}`) === '1');
  }, [categorySlug, isRestricted]);

  // Kategorie startują pustą listą, więc bez tej bramki „nie znaleziono
  // kategorii" mignęłoby przy każdym wejściu, zanim dojedzie katalog.
  if (!loaded) return <PageFrame><section className="mx-auto max-w-[1480px] px-4 py-12 sm:px-8 lg:px-12 lg:py-20"><CardGridSkeleton /></section></PageFrame>;

  if (!category) return <PageFrame><section className="mx-auto max-w-[1480px] px-4 py-12 sm:px-8 lg:px-12 lg:py-20"><p className="eyebrow">{copy.category.eyebrow}</p><h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em]">{copy.category.notFoundTitle}</h1><Button render={<a href="/rowery" />} variant="outline" className="mt-6 rounded-full">{copy.category.backToAllCta} <ArrowLeft data-icon="inline-end" /></Button></section></PageFrame>;

  if (isRestricted && !disclaimerAccepted) {
    return <PageFrame><section className="mx-auto max-w-[720px] px-4 py-16 text-center sm:px-8 lg:py-24">
      <ShieldAlert className="mx-auto size-10 text-amber-600" />
      <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{copy.category.electricDisclaimerTitle}</h1>
      <p className="mt-4 text-base leading-relaxed text-ink-muted">{copy.category.electricDisclaimerText}</p>
      <Button onClick={() => { window.localStorage.setItem(`rexor_disclaimer_${categorySlug}`, '1'); setDisclaimerAccepted(true); }} className="mt-8 h-12 rounded-full bg-ink px-8 text-white">{copy.category.electricDisclaimerAccept}</Button>
    </section></PageFrame>;
  }

  // Baner jest opcjonalny (migracja 041) - domyślnie klient od razu widzi
  // listę rowerów, a admin włącza zdjęcie per kategoria.
  const categoryImage = category.show_hero_image ? publicMediaUrl(category.hero_image_path || category.default_image_path) : null;
  return <PageFrame><section className="mx-auto max-w-[1480px] px-4 py-12 sm:px-8 lg:px-12 lg:py-20">
    {categoryImage && <div className="mb-8 aspect-[21/9] w-full overflow-hidden rounded-[28px] bg-[var(--muted)]"><OptimizedImage src={categoryImage} alt="" priority className="size-full object-cover" /></div>}
    <p className="eyebrow">{copyReady ? copy.category.eyebrow : <Skeleton aria-hidden="true" className="h-3 w-20" />}</p>
    <h1 className="mt-3 text-5xl font-semibold tracking-[-0.06em] sm:text-7xl">{category.name}</h1>
    {category.short_description && <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-muted">{category.short_description}</p>}
    {category.description_html && <div className="rich-content mt-4 max-w-2xl text-sm leading-relaxed text-ink-muted" dangerouslySetInnerHTML={{ __html: category.description_html }} />}

    {categoryModels.length === 0
      ? <p className="mt-10 rounded-2xl bg-[var(--muted)] p-6 text-sm text-ink-muted">{copy.category.emptyModels}</p>
      : <div className="mt-10 grid gap-5 lg:grid-cols-3">{categoryModels.map((model) => <BikePickCard key={model.id} model={model} copy={copy} />)}</div>}
  </section></PageFrame>;
}

export function BikeModelPage({ catalog, modelSlug: modelSlugProp }: { catalog?: PublicCatalogData; modelSlug?: string }) {
  const { models, categories, loaded } = usePublicCatalog(catalog);
  const copy = usePublicCopy();
  const copyReady = usePublicCopyReady();
  // Statyczny eksport nie może z góry wypisać wszystkich par kategoria/model
  // (nowe modele/ramy dochodzą wyłącznie z bazy, przez panel) - trasa
  // /rowery/[category]/[model] renderuje więc jedną powłokę dla dowolnego
  // sluga (patrz generateStaticParams + .htaccess), a właściwy model czytamy
  // tu, po stronie klienta, z faktycznego URL-a.
  //
  // Celowo `usePathname()`, nie `useParams()`: w tym frameworku useParams()
  // przy twardym wejściu na stronę (wpisany adres, link spoza <Link>, np.
  // nasze zwykłe <a href>) zostaje na wartości placeholderowej z powłoki
  // ("_"), bo klientowy stan parametrów startuje pusty i wypełnia się tylko
  // przy nawigacji przez router. usePathname() czyta realny
  // window.location.pathname od razu po stronie klienta, więc faktycznie
  // pokazuje żądany model zamiast zawsze pierwszego z listy.
  const pathname = usePathname();
  const modelSlug = modelSlugProp ?? pathname.split('/').filter(Boolean).pop() ?? '';
  const normalizedSlug = modelSlug.toLowerCase();
  // ŻADNEGO `?? models[0]`: powłoka jest jedna dla wszystkich modeli, więc
  // przy braku dopasowania podstawiała pierwszy model z listy zapasowej -
  // i to on mignął na ułamek sekundy pod cudzym adresem, zanim dojechał
  // katalog z API. Brak dopasowania to teraz albo „jeszcze nie wiem"
  // (szkielet), albo „nie ma takiego modelu".
  const model = models.find((m) => m.id === normalizedSlug || m.name.toLowerCase().includes(normalizedSlug) || (normalizedSlug.includes('e82') && m.id === 'e82') || (normalizedSlug.includes('e55') && m.id === 'e55') || (normalizedSlug.includes('cfr707') && m.id === 'cfr707')) ?? null;
  const [selectedPhoto, setSelectedPhoto] = useState(0);

  if (!loaded || normalizedSlug === '_' || normalizedSlug === '') {
    return <PageFrame><ProductDetailSkeleton /></PageFrame>;
  }

  if (!model) {
    return <PageFrame><section className="mx-auto max-w-[1480px] px-4 py-12 sm:px-8 lg:px-12 lg:py-20"><p className="eyebrow">{copy.model.notFoundEyebrow}</p><h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em]">{copy.model.notFoundTitle}</h1><Button render={<a href="/rowery" />} variant="outline" className="mt-6 rounded-full">{copy.model.backToAllCta} <ArrowLeft data-icon="inline-end" /></Button></section></PageFrame>;
  }

  const category = categories.find((c) => c.slug === model.categorySlug);
  const activeImage = model.gallery[selectedPhoto] ?? model.image;
  const configHref = model.available ? `/konfigurator?model=${model.id}` : '/kontakt';
  const ctaLabel = model.available ? copy.model.configureCta : copy.model.askCta;

  return (
    <PageFrame>
      <section className="mx-auto max-w-[1480px] px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
          <a href="/" className="hover:text-ink transition-colors">{copyReady ? copy.model.breadcrumbHome : <Skeleton aria-hidden="true" className="inline-block h-3 w-10" />}</a>
          <span>/</span>
          <a href="/rowery" className="hover:text-ink transition-colors">{copyReady ? copy.model.breadcrumbBikes : <Skeleton aria-hidden="true" className="inline-block h-3 w-14" />}</a>
          <span>/</span>
          <a href={`/rowery/${model.categorySlug}`} className="hover:text-ink transition-colors">{category?.name ?? model.category}</a>
          <span>/</span>
          <span className="text-ink">{model.name}</span>
        </nav>

        {/* Hero Section */}
        <div className="mt-8 grid min-w-0 grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start lg:gap-14">
          {/* Gallery showcase */}
          <div className="min-w-0 space-y-4">
            <GalleryImageButton images={model.gallery.length ? model.gallery : [model.image]} index={selectedPhoto} title={model.name} labels={copy.gallery} className="aspect-[4/3] overflow-hidden rounded-[32px] bg-[var(--muted)] p-6 sm:p-10">
              <OptimizedImage
                src={activeImage}
                alt={model.name}
                priority
                className="size-full object-contain mix-blend-multiply transition-all duration-300"
              />
            </GalleryImageButton>
            {model.gallery.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {model.gallery.map((img, idx) => (
                  <button
                    key={img}
                    type="button"
                    onClick={() => setSelectedPhoto(idx)}
                    className={`aspect-[4/3] h-20 shrink-0 overflow-hidden rounded-2xl border-2 bg-[var(--muted)] p-2 transition-all ${
                      selectedPhoto === idx ? 'border-ink shadow-sm' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <OptimizedImage src={img} alt="" className="size-full object-contain mix-blend-multiply" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details & CTA */}
          <div className="flex flex-col justify-between">
            <div>
              <span className="eyebrow">{model.eyebrow}</span>
              <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] sm:text-6xl">{model.name}</h1>
              <p className="mt-4 text-lg leading-relaxed text-ink-muted">{model.description}</p>

              <div className="mt-6 flex flex-wrap gap-2">
                {model.motor && (
                  <span className="inline-flex items-center gap-2 rounded-xl bg-ink-wash px-3.5 py-2 text-sm font-medium text-ink">
                    <Gauge className="size-4 text-ink-subtle" /> {model.motor}
                  </span>
                )}
                {model.battery && model.batteries.length > 0 && (
                  <span className="inline-flex items-center gap-2 rounded-xl bg-ink-wash px-3.5 py-2 text-sm font-medium text-ink">
                    <BatteryCharging className="size-4 text-ink-subtle" /> {model.battery}
                  </span>
                )}
                <span className="inline-flex items-center gap-2 rounded-xl bg-ink-wash px-3.5 py-2 text-sm font-medium text-ink">
                  {copy.model.categoryLabelPrefix} {model.category}
                </span>
              </div>

              <div className="mt-8 rounded-3xl border border-line bg-[var(--muted)]/50 p-6">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-ink-subtle">{copy.model.startPriceLabel}</span>
                <p className="mt-1 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                  {model.basePrice ? `od ${formatPrice(model.basePrice)}` : copy.model.priceSoon}
                </p>
                <p className="mt-2 text-xs text-ink-muted">
                  {copy.model.priceNote}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button
                    render={<a href={configHref} />}
                    className="h-12 flex-1 rounded-full bg-ink px-6 text-white hover:bg-black font-medium"
                  >
                    {ctaLabel} <ArrowRight data-icon="inline-end" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rich Description Section */}
        <div className="mt-16 border-t border-line pt-12 lg:mt-24 lg:pt-16">
          <div className="max-w-4xl">
            <p className="eyebrow">{copy.model.descriptionEyebrow}</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">{copy.model.descriptionTitlePrefix} {model.name}</h2>
            {model.descriptionHtml ? (
              <div
                className="rich-content mt-8"
                dangerouslySetInnerHTML={{ __html: model.descriptionHtml }}
              />
            ) : (
              <p className="mt-6 text-base leading-relaxed text-ink-muted">{model.description}</p>
            )}
          </div>
        </div>

        {/* Bottom Banner */}
        <div className="mt-16 rounded-[32px] bg-ink p-8 text-white sm:p-12 lg:mt-24">
          <div className="mx-auto flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-brand)]">{copy.model.bannerEyebrow}</p>
              <h3 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{copy.model.bannerTitlePrefix} {model.name}</h3>
              <p className="mt-2 max-w-xl text-white/60">
                {copy.model.bannerText}
              </p>
            </div>
            <Button
              render={<a href={configHref} />}
              variant="brand"
              className="h-12 rounded-full px-8 font-semibold transition-all hover:brightness-95"
            >
              {ctaLabel} <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        </div>
      </section>
    </PageFrame>
  );
}

export function PartsPage() {
  const copy = usePublicCopy();
  const copyReady = usePublicCopyReady();
  const groups = Object.values(copy.parts.groups);
  return <PageFrame><section className="mx-auto max-w-[1480px] px-4 py-12 sm:px-8 lg:px-12 lg:py-20"><p className="eyebrow">{copyReady ? copy.parts.eyebrow : <Skeleton aria-hidden="true" className="h-3 w-16" />}</p><h1 className="mt-3 max-w-4xl text-5xl font-semibold tracking-[-0.06em] sm:text-7xl">{copyReady ? copy.parts.title : <Skeleton aria-hidden="true" className="h-12 w-2/3 sm:h-16" />}</h1><div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{groups.map(({ name, text }, index) => <article key={name} className="flex min-h-56 flex-col rounded-[24px] border border-line bg-white p-6"><span className="font-mono text-xs text-ink-subtle">{String(index + 1).padStart(2, '0')}</span><h2 className="mt-auto text-2xl font-semibold tracking-tight">{name}</h2><p className="mt-3 text-sm leading-relaxed text-ink-muted">{text}</p></article>)}</div><Button render={<a href="/konfigurator" />} className="mt-8 h-12 rounded-full bg-ink px-6 text-white">{copyReady ? copy.parts.cta : <Skeleton aria-hidden="true" className="h-4 w-52" />} <ArrowRight data-icon="inline-end" /></Button></section></PageFrame>;
}

/**
 * Powłoka "_" trasy /rowery/[category].
 *
 * Kategorie dodane w panelu nie mają własnej, wyeksportowanej strony, bo
 * generateStaticParams() zna tylko kategorie istniejące w chwili builda.
 * .htaccess kieruje więc każdy jednosegmentowy /rowery/* bez gotowego pliku do
 * tej powłoki, a ona rozstrzyga po stronie klienta, czy slug jest modelem
 * (historyczne adresy /rowery/e82), czy kategorią.
 *
 * Katalog pobieramy raz i przekazujemy niżej jako `catalog`, żeby CategoryPage
 * ani BikeModelPage nie odpytywały API po raz drugi.
 */
export function CategoryOrModelPage({ catalog }: { catalog?: PublicCatalogData }) {
  const { models, categories, loaded } = usePublicCatalog(catalog);
  const pathname = usePathname();
  const slug = (pathname.split('/').filter(Boolean).pop() ?? '').toLowerCase();

  // Bez tego, zanim dojedzie katalog, mignęłoby "nie znaleziono kategorii".
  if (!loaded) return <PageFrame><section className="mx-auto max-w-[1480px] px-4 py-12 sm:px-8 lg:px-12 lg:py-20"><CardGridSkeleton /></section></PageFrame>;

  const resolved: PublicCatalogData = { models, categories };
  return models.some((model) => model.id === slug)
    ? <BikeModelPage catalog={resolved} modelSlug={slug} />
    : <CategoryPage catalog={resolved} categorySlug={slug} />;
}
