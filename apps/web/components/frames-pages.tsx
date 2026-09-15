'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowRight, ExternalLink, PaintBucket } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ContactForm } from '@/components/contact-form';
import { FilteredCollection, type CollectionItem } from '@/components/filtered-collection';
import { PageFrame } from '@/components/page-frame';
import { formatPrice } from '@/lib/catalog';
import { frameHref, type ApiFrame, type PublicFrame } from '@/lib/frames';
import { usePublicCatalog, type PublicCatalogData } from '@/lib/use-public-catalog';
import { usePublicCopy } from '@/lib/use-public-copy';
import { usePublicFrame, usePublicFrames } from '@/lib/use-public-frames';
import type { SiteCopy } from '@/lib/copy';

const priceLabel = (frame: { price_gross: number | null }, copy: SiteCopy) =>
  frame.price_gross === null ? copy.frames.quotePrice : formatPrice(frame.price_gross);

/** Lista wszystkich opublikowanych ram z filtrem kategorii wspólnym z /rowery. */
export function FramesPage({ frames: initialFrames, catalog, copy: initialCopy }: { frames?: ApiFrame[]; catalog?: PublicCatalogData; copy?: unknown }) {
  const copy = usePublicCopy(initialCopy);
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
    <p className="eyebrow">{copy.frames.eyebrow}</p>
    <h1 className="mt-3 max-w-4xl text-5xl font-semibold tracking-[-0.06em] sm:text-7xl">{copy.frames.title}</h1>
    <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-muted">{copy.frames.subtitle}</p>

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
export function FrameDetailPage({ frame: initialFrame, catalog, copy: initialCopy }: { frame?: ApiFrame | null; catalog?: PublicCatalogData; copy?: unknown }) {
  const copy = usePublicCopy(initialCopy);
  const { categories } = usePublicCatalog(catalog);
  const pathname = usePathname();
  const slug = (pathname.split('/').filter(Boolean).pop() ?? '').toLowerCase();
  const { frame, loaded } = usePublicFrame(slug === '_' ? '' : slug, initialFrame, categories);

  if (!loaded) {
    return <PageFrame><section className="mx-auto max-w-[1480px] px-4 py-20 sm:px-8 lg:px-12">
      <div className="flex items-center gap-2 text-sm text-ink-muted"><Spinner className="size-4" /> {copy.frames.loading}</div>
    </section></PageFrame>;
  }

  if (!frame) {
    return <PageFrame><section className="mx-auto max-w-[1480px] px-4 py-12 sm:px-8 lg:px-12 lg:py-20">
      <p className="eyebrow">{copy.frames.notFoundEyebrow}</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em]">{copy.frames.notFoundTitle}</h1>
      <Button render={<a href="/ramy" />} variant="outline" className="mt-6 rounded-full">{copy.frames.backToAllCta} <ArrowRight data-icon="inline-end" /></Button>
    </section></PageFrame>;
  }

  return <PageFrame><FrameDetail frame={frame} copy={copy} /></PageFrame>;
}

function FrameDetail({ frame, copy }: { frame: PublicFrame; copy: SiteCopy }) {
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const activeImage = frame.gallery[selectedPhoto] ?? frame.image;

  return (
    <section className="mx-auto max-w-[1480px] px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
      <nav className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
        <a href="/" className="transition-colors hover:text-ink">{copy.frames.breadcrumbHome}</a>
        <span>/</span>
        <a href="/ramy" className="transition-colors hover:text-ink">{copy.frames.breadcrumbFrames}</a>
        <span>/</span>
        <span className="text-ink">{frame.name}</span>
      </nav>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-14">
        <div className="space-y-4">
          <div className="aspect-[4/3] overflow-hidden rounded-[32px] bg-[var(--muted)] p-6 sm:p-10">
            {activeImage
              ? <img src={activeImage} alt={frame.name} className="size-full object-contain mix-blend-multiply transition-all duration-300" />
              : <div className="size-full rounded-2xl bg-ink-wash" aria-hidden="true" />}
          </div>
          {frame.gallery.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {frame.gallery.map((img, index) => (
                <button
                  key={img}
                  type="button"
                  onClick={() => setSelectedPhoto(index)}
                  className={`aspect-[4/3] h-20 shrink-0 overflow-hidden rounded-2xl border-2 bg-[var(--muted)] p-2 transition-all ${selectedPhoto === index ? 'border-ink shadow-sm' : 'border-transparent opacity-70 hover:opacity-100'}`}
                >
                  <img src={img} alt="" className="size-full object-contain mix-blend-multiply" />
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
                <img src={img} alt={`Geometria ${frame.name}`} className="w-full object-contain" />
              </a>
            ))}
          </div>
        )}
        {!frame.geometry_html && frame.geometryImages.length === 0 && (
          <p className="mt-6 rounded-2xl bg-[var(--muted)] p-6 text-sm text-ink-muted">{copy.frames.geometryEmpty}</p>
        )}
      </div>

      <div className="mt-16 border-t border-line pt-12">
        <div className="max-w-2xl rounded-[28px] border border-line bg-white p-6 sm:p-8">
          <ContactForm
            type="frame"
            title={copy.frames.formTitle}
            description={copy.frames.formDescription}
            context={{ frameSlug: frame.slug, frameName: frame.name }}
            extraFields={[
              { name: 'size', label: copy.frames.formSizeLabel },
              { name: 'paint', label: copy.frames.formPaintLabel },
            ]}
          />
        </div>
      </div>
    </section>
  );
}
