'use client';

import { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { PublicCategory } from '@/lib/catalog-merge';
import type { SiteCopy } from '@/lib/copy';

/**
 * Jeden kafelek listy - ramy i realizacje różnią się tylko treścią pól,
 * nie układem, więc obie strony podają dane w tym samym kształcie.
 */
export type CollectionItem = {
  key: string;
  href: string;
  image: string;
  title: string;
  /** Nadtytuł kafelka: nazwa kategorii (rama) albo data ukończenia (realizacja). */
  eyebrow: string | null;
  description: string | null;
  /** Wiersz pod opisem: cena albo inna krótka informacja. */
  meta: string | null;
  /** Wyróżnienie, np. "Nasza rekomendacja". */
  badge: string | null;
  /** `null` = pozycja bez kategorii; taka pokazuje się wyłącznie pod "Wszystkie". */
  categorySlug: string | null;
};

/**
 * Lista z filtrem kategorii wspólna dla /ramy i /realizacje.
 *
 * Filtrujemy po stronie klienta na pobranej liście: kolekcje są małe
 * (kilkanaście pozycji), a dzięki temu przełączanie filtra nie kosztuje
 * kolejnego zapytania i działa też w eksporcie statycznym.
 *
 * Przyciski filtra budujemy z kategorii, które faktycznie mają pozycje - lista
 * kategorii pochodzi z panelu, więc nie może być zaszyta w kodzie (nowa
 * kategoria ma się pojawić bez zmiany frontu).
 */
export function FilteredCollection({
  items,
  categories,
  copy,
  detailsCta,
  emptyText,
  loaded,
}: {
  items: CollectionItem[];
  categories: PublicCategory[];
  copy: SiteCopy;
  detailsCta: string;
  emptyText: string;
  loaded: boolean;
}) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  const filters = useMemo(() => {
    const used = new Set(items.map((item) => item.categorySlug).filter((slug): slug is string => Boolean(slug)));
    return categories.filter((category) => used.has(category.slug));
  }, [items, categories]);

  // Filtr, którego kategoria zniknęła (np. ostatnia rama z niej została ukryta),
  // nie może zostawić użytkownika z pustym ekranem bez wyjścia.
  const effectiveSlug = activeSlug && filters.some((category) => category.slug === activeSlug) ? activeSlug : null;
  const visible = effectiveSlug ? items.filter((item) => item.categorySlug === effectiveSlug) : items;

  if (!loaded) {
    return <div className="mt-10 flex items-center gap-2 text-sm text-ink-muted"><Spinner className="size-4" /> {copy.collection.loading}</div>;
  }

  return (
    <div className="mt-8">
      {filters.length > 0 && (
        // Na telefonie filtry przewijają się poziomo zamiast łamać układ.
        <fieldset className="-mx-4 flex min-w-0 gap-2 overflow-x-auto border-0 px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
          <legend className="sr-only">{copy.collection.filtersAria}</legend>
          <FilterChip label={copy.collection.allFilter} active={effectiveSlug === null} onClick={() => setActiveSlug(null)} />
          {filters.map((category) => (
            <FilterChip key={category.slug} label={category.name} active={effectiveSlug === category.slug} onClick={() => setActiveSlug(category.slug)} />
          ))}
        </fieldset>
      )}

      {visible.length === 0
        ? <p className="mt-8 rounded-2xl bg-[var(--muted)] p-6 text-sm text-ink-muted">{emptyText}</p>
        : <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((item) => <CollectionCard key={item.key} item={item} detailsCta={detailsCta} />)}
          </div>}
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <Button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      variant={active ? 'default' : 'outline'}
      size="sm"
      className={`shrink-0 rounded-full px-4 ${active ? 'bg-ink text-white hover:bg-black' : 'border-line text-ink-muted hover:text-ink'}`}
    >
      {label}
    </Button>
  );
}

function CollectionCard({ item, detailsCta }: { item: CollectionItem; detailsCta: string }) {
  return (
    <article className="flex flex-col justify-between overflow-hidden rounded-[28px] border border-line bg-white transition-shadow hover:shadow-[0_10px_34px_rgba(0,0,0,0.09)] focus-within:shadow-[0_10px_34px_rgba(0,0,0,0.09)]">
      <a href={item.href} aria-label={`${item.title} — ${detailsCta}`} className="block text-inherit no-underline">
        <div className="relative aspect-[4/3] bg-[var(--muted)] p-5">
          {item.image
            ? <img src={item.image} alt={item.title} className="size-full object-contain mix-blend-multiply transition-transform duration-500 hover:scale-[1.03]" />
            : <div className="size-full rounded-2xl bg-ink-wash" aria-hidden="true" />}
          {item.badge && <Badge className="absolute left-4 top-4 h-auto bg-ink px-3 py-1 text-white">{item.badge}</Badge>}
        </div>
        <div className="p-6 pb-2">
          {item.eyebrow && <span className="eyebrow">{item.eyebrow}</span>}
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{item.title}</h2>
          {item.description && <p className="mt-3 text-sm leading-relaxed text-ink-muted">{item.description}</p>}
        </div>
      </a>
      <div className="p-6 pt-2">
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-4">
          <strong className="text-sm">{item.meta}</strong>
          <Button render={<a href={item.href} />} size="sm" className="rounded-full bg-ink px-3 text-xs text-white hover:bg-black">
            {detailsCta} <ArrowRight data-icon="inline-end" className="size-3.5" />
          </Button>
        </div>
      </div>
    </article>
  );
}
