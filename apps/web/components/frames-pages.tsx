'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowLeft, ExternalLink, PaintBucket, Palette } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ContactForm } from '@/components/contact-form';
import { FilteredCollection, type CollectionItem } from '@/components/filtered-collection';
import { OptimizedImage } from '@/components/optimized-image';
import { GalleryImageButton } from '@/components/gallery-lightbox';
import { PageFrame } from '@/components/page-frame';
import { ProductDetailSkeleton } from '@/components/page-loading';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { formatPrice } from '@/lib/catalog';
import { frameHref, type ApiFrame, type PublicFrame } from '@/lib/frames';
import { usePublicCatalog, type PublicCatalogData } from '@/lib/use-public-catalog';
import { usePublicCopy, usePublicCopyReady } from '@/lib/use-public-copy';
import { usePublicFrame, usePublicFrames } from '@/lib/use-public-frames';
import { PaintDialog } from '@/components/paint-picker';
import { bestRender, hasPhoto, usePaints } from '@/lib/paints';
import type { SiteCopy } from '@/lib/copy';

const priceLabel = (frame: { price_gross: number | null }, copy: SiteCopy) =>
  frame.price_gross === null ? copy.frames.quotePrice : formatPrice(frame.price_gross);

/** Lista wszystkich opublikowanych ram z filtrem kategorii wspólnym z /rowery. */
export function FramesPage({ frames: initialFrames, catalog }: { frames?: ApiFrame[]; catalog?: PublicCatalogData }) {
  const copy = usePublicCopy();
  const copyReady = usePublicCopyReady();
  // Kategorie biorą się z katalogu (te same co rowerowe), bo nazwa kategorii
  // jest etykietą filtra i nadtytułem kafelka.
  const { categories } = usePublicCatalog(catalog);
  const { frames, loaded } = usePublicFrames(initialFrames, categories);

  const items: CollectionItem[] = frames.map((frame) => ({
    key: frame.slug,
    href: frameHref(frame),
    image: frame.image,
    title: frame.name,
    eyebrow: frame.categoryName,
    description: frame.short_description,
    meta: priceLabel(frame, copy),
    badge: frame.is_recommended ? copy.frames.recommendedBadge : null,
    categorySlug: frame.category_slug,
  }));

  return <PageFrame><section className="mx-auto max-w-[1480px] px-4 py-12 sm:px-8 lg:px-12 lg:py-20">
    <p className="eyebrow">{copyReady ? copy.frames.eyebrow : <Skeleton aria-hidden="true" className="h-3 w-16" />}</p>
    <h1 className="mt-3 max-w-4xl text-5xl font-semibold tracking-[-0.06em] sm:text-7xl">{copyReady ? copy.frames.title : <Skeleton aria-hidden="true" className="h-12 w-2/3 sm:h-16" />}</h1>
    <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-muted">{copyReady ? copy.frames.subtitle : <Skeleton aria-hidden="true" className="h-5 w-full max-w-2xl" />}</p>

    <FilteredCollection items={items} categories={categories} copy={copy} detailsCta={copy.frames.cardDetailsCta} emptyText={copy.frames.empty} loaded={loaded} />

    {/* Właściciel prosił, żeby na liście było wprost napisane, że ramę można
        kupić samą i zamówić w niej lakierowanie wg własnego projektu. */}
    <aside className="mt-12 flex flex-col gap-4 rounded-[28px] bg-ink p-8 text-white sm:flex-row sm:items-center sm:gap-6 sm:p-10">
      <PaintBucket className="size-8 shrink-0 text-[var(--accent-brand)]" aria-hidden="true" />
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{copy.frames.frameOnlyTitle}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/70">{copy.frames.frameOnlyText}</p>
      </div>
    </aside>
  </section></PageFrame>;
}

/**
 * Strona pojedynczej ramy. Eksport statyczny wypuszcza jedną powłokę "_"
 * (patrz generateStaticParams + deploy/public-html.htaccess), więc slug czytamy
 * z realnego adresu po stronie klienta.
 *
 * Celowo `usePathname()`, nie `useParams()` - dokładnie jak w BikeModelPage:
 * przy twardym wejściu na adres useParams() zostaje na wartości "_" z powłoki,
 * bo klientowy stan parametrów wypełnia się tylko przy nawigacji routerem.
 */
export function FrameDetailPage({ frame: initialFrame, catalog }: { frame?: ApiFrame | null; catalog?: PublicCatalogData }) {
  const copy = usePublicCopy();
  const { categories } = usePublicCatalog(catalog);
  const pathname = usePathname();
  const slug = (pathname.split('/').filter(Boolean).pop() ?? '').toLowerCase();
  const { frame, loaded } = usePublicFrame(slug === '_' ? '' : slug, initialFrame, categories);

  if (!loaded || slug === '_' || slug === '') return <PageFrame><ProductDetailSkeleton /></PageFrame>;

  if (!frame) {
    return <PageFrame><section className="mx-auto max-w-[1480px] px-4 py-12 sm:px-8 lg:px-12 lg:py-20">
      <p className="eyebrow">{copy.frames.notFoundEyebrow}</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em]">{copy.frames.notFoundTitle}</h1>
      <Button render={<a href="/ramy" />} variant="outline" className="mt-6 rounded-full">{copy.frames.backToAllCta} <ArrowLeft data-icon="inline-end" /></Button>
    </section></PageFrame>;
  }

  return <PageFrame><FrameDetail frame={frame} copy={copy} /></PageFrame>;
}

function FrameDetail({ frame, copy }: { frame: PublicFrame; copy: SiteCopy }) {
  const copyReady = usePublicCopyReady();
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const activeImage = frame.gallery[selectedPhoto] ?? frame.image;

  return (
    <section className="mx-auto max-w-[1480px] px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
      <nav className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
        <a href="/" className="transition-colors hover:text-ink">{copyReady ? copy.frames.breadcrumbHome : <Skeleton aria-hidden="true" className="inline-block h-3 w-10" />}</a>
        <span>/</span>
        <a href="/ramy" className="transition-colors hover:text-ink">{copyReady ? copy.frames.breadcrumbFrames : <Skeleton aria-hidden="true" className="inline-block h-3 w-12" />}</a>
        <span>/</span>
        <span className="text-ink">{frame.name}</span>
      </nav>

      <div className="mt-8 grid min-w-0 grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start lg:gap-14">
        <div className="min-w-0 space-y-4">
          <GalleryImageButton images={frame.gallery.length ? frame.gallery : [frame.image]} index={selectedPhoto} title={frame.name} labels={copy.gallery} className="aspect-[4/3] overflow-hidden rounded-[32px] bg-[var(--muted)] p-6 sm:p-10">
            {activeImage
              ? <OptimizedImage src={activeImage} alt={frame.name} priority className="size-full object-contain mix-blend-multiply transition-all duration-300" />
              : <div className="size-full rounded-2xl bg-ink-wash" aria-hidden="true" />}
          </GalleryImageButton>
          {frame.gallery.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {frame.gallery.map((img, index) => (
                <button
                  key={img}
                  type="button"
                  onClick={() => setSelectedPhoto(index)}
                  className={`aspect-[4/3] h-20 shrink-0 overflow-hidden rounded-2xl border-2 bg-[var(--muted)] p-2 transition-all ${selectedPhoto === index ? 'border-ink shadow-sm' : 'border-transparent opacity-70 hover:opacity-100'}`}
                >
                  <OptimizedImage src={img} alt="" className="size-full object-contain mix-blend-multiply" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow">{frame.categoryName}</span>
            {frame.is_recommended && <Badge className="h-auto bg-ink px-3 py-1 text-white">{copy.frames.recommendedBadge}</Badge>}
          </div>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] sm:text-6xl">{frame.name}</h1>
          {frame.manufacturer && <p className="mt-2 text-sm font-medium text-ink-subtle">{copy.frames.manufacturerLabel}: {frame.manufacturer}</p>}
          {frame.short_description && <p className="mt-4 text-lg leading-relaxed text-ink-muted">{frame.short_description}</p>}

          {(frame.facts.length > 0 || frame.paint_available) && (
            <div className="mt-6 flex flex-wrap gap-2">
              {frame.facts.map((fact) => <span key={fact} className="inline-flex items-center rounded-xl bg-ink-wash px-3.5 py-2 text-sm font-medium text-ink">{fact}</span>)}
              {frame.paint_available && <span className="inline-flex items-center gap-2 rounded-xl bg-ink-wash px-3.5 py-2 text-sm font-medium text-ink"><PaintBucket className="size-4 text-ink-subtle" aria-hidden="true" /> {copy.frames.paintBadge}</span>}
            </div>
          )}

          <div className="mt-8 rounded-3xl border border-line bg-[var(--muted)]/50 p-6">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-ink-subtle">{copy.frames.priceLabel}</span>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{priceLabel(frame, copy)}</p>
            <p className="mt-2 text-xs text-ink-muted">{copy.frames.priceNote}</p>
            {frame.source_url && (
              <a href={frame.source_url} target="_blank" rel="noreferrer noopener" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted underline-offset-4 hover:text-ink hover:underline">
                {copy.frames.sourceLinkLabel} <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      </div>

      {frame.description_html && (
        <div className="mt-16 border-t border-line pt-12 lg:mt-24 lg:pt-16">
          <div className="max-w-4xl">
            <p className="eyebrow">{copy.frames.descriptionTitle}</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">{frame.name}</h2>
            <div className="rich-content mt-8" dangerouslySetInnerHTML={{ __html: frame.description_html }} />
          </div>
        </div>
      )}

      {/* Geometria bywa wklejoną grafiką od producenta ALBO tabelą napisaną
          ręcznie w edytorze - właściciel dopuścił obie formy naraz. */}
      <div className="mt-16 border-t border-line pt-12">
        <p className="eyebrow">{copy.frames.geometryTitle}</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{copy.frames.geometryTitle}</h2>
        {frame.geometry_html && <div className="rich-content mt-8 max-w-5xl" dangerouslySetInnerHTML={{ __html: frame.geometry_html }} />}
        {frame.geometryImages.length > 0 && (
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {frame.geometryImages.map((img) => (
              <a key={img} href={img} target="_blank" rel="noreferrer noopener" className="block overflow-hidden rounded-[24px] border border-line bg-white p-3">
                <OptimizedImage src={img} alt={`Geometria ${frame.name}`} className="w-full object-contain" />
              </a>
            ))}
          </div>
        )}
        {!frame.geometry_html && frame.geometryImages.length === 0 && (
          <p className="mt-6 rounded-2xl bg-[var(--muted)] p-6 text-sm text-ink-muted">{copy.frames.geometryEmpty}</p>
        )}
      </div>

      {frame.paint_available && <FramePaints frame={frame} copy={copy} />}

      <div className="mt-16 border-t border-line pt-12">
        <div className="max-w-2xl rounded-[28px] border border-line bg-white p-6 sm:p-8">
          <ContactForm
            type="frame"
            title={copy.frames.formTitle}
            description={copy.frames.formDescription}
            context={{ frameSlug: frame.slug, frameName: frame.name }}
            extraFields={[
              {
                name: 'size',
                label: copy.frames.formSizeLabel,
                options: frame.sizes.length > 0
                  ? frame.sizes.map((size) => ({ value: size.label, label: size.label }))
                  : undefined,
              },
              { name: 'paint', label: copy.frames.formPaintLabel },
            ]}
          />
        </div>
      </div>
    </section>
  );
}

/**
 * Przeglądanie kolorów przy ramie.
 *
 * Rama nie jest konfiguratorem - nie ma tu wyboru, który wchodziłby do wyceny,
 * bo zakres lakierowania ustalamy w rozmowie. Klient ma jednak zobaczyć, co
 * w ogóle jest do wzięcia, więc otwieramy tę samą przeglądarkę co
 * w konfiguratorze, w trybie „browse".
 *
 * Palety (ok. 690 kolorów) pobieramy dopiero po kliknięciu: podstrona ramy nie
 * ma po co ich wozić przy każdym wejściu.
 */
function FramePaints({ frame, copy }: { frame: PublicFrame; copy: SiteCopy }) {
  const [requested, setRequested] = useState(false);
  const [open, setOpen] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const { palettes, state, colorFilter } = usePaints('frame', frame.slug, requested);

  // Sekcja siedzi pod geometrią, więc kto do niej doscrollował, ten kolory
  // ogląda - pobieramy je wtedy, żeby próbki były na miejscu przed kliknięciem,
  // ale nie przy każdym wejściu na podstronę.
  useEffect(() => {
    if (requested) return;
    const node = sectionRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') { setRequested(true); return; }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { setRequested(true); observer.disconnect(); }
    }, { rootMargin: '200px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [requested]);

  const colorCount = palettes.reduce((sum, palette) => sum + palette.colors.length, 0);
  const renderCount = palettes.reduce(
    (sum, palette) => sum + palette.colors.filter((color) => bestRender(color) !== null).length,
    0,
  );
  const photoCount = palettes.reduce(
    (sum, palette) => sum + palette.colors.filter((color) => hasPhoto(color)).length,
    0,
  );
  const empty = state === 'ready' && palettes.length === 0;

  return <div ref={sectionRef} className="mt-16 border-t border-line pt-12">
    <p className="eyebrow">{copy.frames.paintSectionTitle}</p>
    <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{copy.frames.paintSectionTitle}</h2>
    <p className="mt-4 max-w-3xl text-base leading-relaxed text-ink-muted">{copy.frames.paintSectionText}</p>

    {empty ? <p className="mt-6 max-w-3xl rounded-2xl bg-[var(--muted)] p-6 text-sm text-ink-muted">{copy.frames.paintBrowseEmpty}</p> : <>
      {palettes.length > 0 && <div className="mt-6 flex flex-wrap gap-3">
        {palettes.map((palette) => <div key={palette.slug} className="rounded-2xl border border-line bg-white p-4">
          <p className="font-semibold">{palette.name}</p>
          <p className="mt-0.5 text-xs text-ink-muted">{palette.colors.length} kolorów</p>
          <div className="mt-3 flex gap-1.5">
            {palette.colors.slice(0, 8).map((color) => <span
              key={color.slug}
              title={color.name}
              className="size-6 rounded-md border border-line"
              style={{ backgroundColor: color.hex }}
            />)}
          </div>
        </div>)}
      </div>}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-full"
          disabled={state === 'loading'}
          onClick={() => { setRequested(true); setOpen(true); }}
        >
          {state === 'loading' ? copy.frames.paintBrowseLoading : copy.frames.paintBrowseCta}
          {state === 'loading' ? <Spinner data-icon="inline-end" className="size-4" /> : <Palette data-icon="inline-end" />}
        </Button>
        {colorCount > 0 && <span className="text-sm text-ink-muted">
          {colorCount} kolorów{renderCount > 0 ? `, ${renderCount} z wizualizacją` : ''}{photoCount > 0 ? `, ${photoCount} ze zdjęciem gotowej ramy` : ''}
        </span>}
        {state === 'error' && <span className="text-sm text-ink-muted">Nie udało się pobrać palet. Odśwież stronę i spróbuj ponownie.</span>}
      </div>
    </>}

    <PaintDialog
      open={open}
      onOpenChange={setOpen}
      palettes={palettes}
      paintState={state}
      colorFilter={colorFilter}
      mode="browse"
      title={copy.frames.paintBrowseDialogTitle}
    />
  </div>;
}
