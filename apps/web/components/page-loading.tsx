'use client';

import { Skeleton } from '@/components/ui/skeleton';

/**
 * Szkielety na czas wczytywania katalogu.
 *
 * Powód istnienia: przy eksporcie statycznym serwer nie odpytuje API, więc
 * pierwszy render dostaje dane zapasowe zaszyte w kodzie (`bikeModels`) albo
 * pustą listę. Strona pokazywała wtedy przez ułamek sekundy CUDZĄ treść -
 * na `/rowery/gravel/cfr707` mignął pierwszy model z listy, bo powłoka
 * `/rowery/_/_.html` jest jedna dla wszystkich modeli - a listy migały
 * komunikatem „nie ma nic".
 *
 * Szkielet zamiast paska „wczytuję": zajmuje mniej więcej tyle samo miejsca
 * co docelowa treść, więc układ nie skacze, gdy dane dojadą.
 */

/** Siatka kafelków - listy modeli, ram i realizacji. */
export function CardGridSkeleton({ count = 3 }: { count?: number }) {
  return <div className="mt-10 grid gap-5 lg:grid-cols-3" aria-hidden="true">
    {Array.from({ length: count }, (_, index) => <div key={index} className="overflow-hidden rounded-[28px] border border-line bg-white">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>
      </div>
    </div>)}
  </div>;
}

/** Nagłówek listy: nadtytuł, tytuł, lead. */
export function PageHeadingSkeleton() {
  return <div className="space-y-4" aria-hidden="true">
    <Skeleton className="h-3 w-16" />
    <Skeleton className="h-12 w-3/4 sm:h-16" />
    <Skeleton className="h-5 w-2/3" />
  </div>;
}

/**
 * Podstrona pojedynczego produktu: galeria po lewej, opis i cena po prawej.
 * Wspólna dla modelu roweru i ramy - obie mają ten sam układ hero.
 */
export function ProductDetailSkeleton() {
  return <section className="mx-auto max-w-[1480px] px-4 py-8 sm:px-8 lg:px-12 lg:py-12" aria-hidden="true">
    <div className="flex gap-2">
      <Skeleton className="h-3 w-12" />
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-3 w-20" />
    </div>

    <div className="mt-8 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-14">
      <div className="space-y-4">
        <Skeleton className="aspect-[4/3] w-full rounded-[32px]" />
        <div className="flex gap-3">
          {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="aspect-[4/3] h-20 rounded-2xl" />)}
        </div>
      </div>

      <div className="space-y-5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-12 w-4/5 sm:h-16" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-3/4" />
        <div className="flex flex-wrap gap-2 pt-2">
          {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-10 w-32 rounded-xl" />)}
        </div>
        <Skeleton className="h-32 w-full rounded-3xl" />
      </div>
    </div>
  </section>;
}

/** Konfigurator: podgląd roweru i kolumna wyborów. */
export function ConfiguratorSkeleton() {
  return <section className="mx-auto max-w-[1480px] px-4 py-8 sm:px-8 lg:px-12 lg:py-12" aria-hidden="true">
    <Skeleton className="h-3 w-24" />
    <Skeleton className="mt-3 h-12 w-2/3 sm:h-16" />
    <div className="mt-10 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
      <Skeleton className="aspect-[4/3] w-full rounded-[32px]" />
      <div className="space-y-4">
        {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-16 w-full rounded-2xl" />)}
      </div>
    </div>
  </section>;
}
