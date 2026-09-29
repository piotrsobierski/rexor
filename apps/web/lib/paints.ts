'use client';

import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8081/api';

/** Slug części z grupy „paint”, która oznacza lakierowanie standardowe. */
export const PAINT_GROUP_SLUG = 'paint';

/** Wizualizacja jest jedna (`ultra`); wariant „standard” wycofano migracją 041. */
export type PaintVariant = 'ultra' | 'photo';

/**
 * `fallbackFrom` - nazwa innego produktu, gdy lakier nie ma obrazu na tym
 * (ustawienie „renderFallback”). Klient ma wiedzieć, na czym go ogląda.
 */
export type PaintRender = { variant: PaintVariant; image: string; thumb: string | null; source: string | null; fallbackFrom?: string | null };

export type PaintColor = {
  id: number;
  slug: string;
  code: string | null;
  name: string;
  hex: string;
  finish: 'uni' | 'metallic' | 'pearl';
  groupName: string | null;
  searchAlt: string | null;
  /** Dopłata brutto za ten kolor; zwykle cena palety, czasem nadpisana. */
  priceGross: number;
  /**
   * Obrazy lakieru na TYM produkcie. `ultra` to jedyna wizualizacja
   * komputerowa. `photos` to zdjęcia gotowego roweru, których może być kilka
   * (kilka ujęć tego samego egzemplarza).
   */
  renders: { ultra?: PaintRender; photos?: PaintRender[] };
};

export type PaintPalette = {
  slug: string;
  name: string;
  brand: string | null;
  kind: 'factory' | 'custom';
  description: string | null;
  priceGross: number;
  currency: string;
  /** SKU opcji lakierowania, jakiej wymaga kolor z tej palety. */
  requiresPartSku: string | null;
  colors: PaintColor[];
};

export type PaintSelection = { paletteSlug: string; colorSlug: string };

/**
 * Globalne ustawienie z panelu: które kolory w ogóle jadą do klienta.
 * Rozstrzyga je API (`paintPalettesFor`), tutaj jest tylko po to, żeby picker
 * mógł napisać, dlaczego paleta jest krótsza, niż klient się spodziewa.
 */
export type ColorFilter = 'all' | 'with_image' | 'with_photo';

export const COLOR_FILTER_NOTES: Record<ColorFilter, string | null> = {
  all: null,
  with_image: 'Pokazujemy lakiery, dla których mamy zdjęcie albo wizualizację na tym rowerze. Pozostałe kolory z palety malujemy na zamówienie - napisz do nas, a przygotujemy podgląd.',
  with_photo: 'Pokazujemy wyłącznie lakiery, które mamy sfotografowane na gotowym rowerze. Pozostałe kolory z palety malujemy na zamówienie - napisz do nas, a przygotujemy podgląd.',
};

export const FINISH_LABELS: Record<PaintColor['finish'], string> = {
  uni: 'uni',
  metallic: 'metalik',
  pearl: 'perła',
};

/**
 * Wszystkie obrazy lakieru na produkcie, w kolejności pokazywania.
 *
 * Prawdziwe zdjęcie bije każdą wizualizację: pokazuje lakier w świetle,
 * a nie w renderze, więc idzie pierwsze. Dalej jedna wizualizacja „ultra”.
 * Ta sama kolejność rozstrzyga migawkę konfiguracji po stronie API
 * (`resolvePaintSelection`) - jedno źródło prawdy dla obu stron.
 */
export function paintImages(color: PaintColor): PaintRender[] {
  const photos = color.renders.photos ?? [];
  const renders = [color.renders.ultra].filter((item): item is PaintRender => Boolean(item));
  return [...photos, ...renders];
}

/** Pierwszy obraz z tej kolejności - podgląd, próbka, pierwszy slajd galerii. */
export function bestRender(color: PaintColor): PaintRender | null {
  return paintImages(color)[0] ?? null;
}

/** Czy mamy zdjęcie tego lakieru na produkcie (a nie samą wizualizację). */
export function hasPhoto(color: PaintColor): boolean {
  return (color.renders.photos?.length ?? 0) > 0;
}

export function paintImageUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_BASE}${path}`;
}

export function findColor(palettes: PaintPalette[], selection: PaintSelection | null): { palette: PaintPalette; color: PaintColor } | null {
  if (!selection) return null;
  const palette = palettes.find((item) => item.slug === selection.paletteSlug);
  const color = palette?.colors.find((item) => item.slug === selection.colorSlug);
  return palette && color ? { palette, color } : null;
}

/**
 * Wyszukiwanie po nazwie, kodzie, hexie i synonimach - przy 680 lakierach to
 * główny sposób poruszania się po palecie, a nie dodatek. Synonimy (`searchAlt`)
 * niosą nazwy niemieckie i pozostałe kody, więc „Taubenblau” albo „L37E”
 * prowadzą do właściwego lakieru tak samo jak nazwa angielska.
 *
 * Szukamy PONAD paletami: żeby znaleźć kod, nie trzeba wiedzieć, czyj on jest.
 */
export function searchColors(palettes: PaintPalette[], query: string, paletteSlug: string | null): Array<{ palette: PaintPalette; color: PaintColor }> {
  const needle = query.trim().toLowerCase();
  const scoped = paletteSlug ? palettes.filter((item) => item.slug === paletteSlug) : palettes;
  const source = needle === '' ? scoped : palettes;

  const rows = source.flatMap((palette) => palette.colors.map((color) => ({ palette, color })));
  if (needle === '') return rows;

  const hexNeedle = needle.startsWith('#') ? needle : `#${needle}`;
  return rows.filter(({ palette, color }) =>
    color.name.toLowerCase().includes(needle)
    || (color.code?.toLowerCase().includes(needle) ?? false)
    || color.hex.toLowerCase().includes(hexNeedle)
    || (color.searchAlt?.toLowerCase().includes(needle) ?? false)
    || palette.name.toLowerCase().includes(needle));
}

/**
 * Palety pobieramy osobnym żądaniem i dopiero wtedy, gdy są potrzebne:
 * 680 kolorów nie ma po co jechać razem z katalogiem na stronę główną.
 * `enabled` pozwala odłożyć pobranie do pierwszego otwarcia wyboru koloru.
 *
 * `resource` rozstrzyga, o co pytamy API: modele mają własną listę palet,
 * ramy własną (`model_paint_palettes` vs `frame_paint_palettes`), więc rama
 * sprzedawana osobno pokazuje dokładnie to, co dla niej włączono w panelu.
 */
export function usePaints(resource: 'model' | 'frame', slug: string | null, enabled: boolean) {
  const [palettes, setPalettes] = useState<PaintPalette[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  // Globalny filtr z panelu. Nie filtrujemy nim niczego po tej stronie -
  // serwer już to zrobił - służy wyłącznie do wyjaśnienia klientowi, czemu
  // widzi wycinek palety zamiast kompletu.
  const [colorFilter, setColorFilter] = useState<ColorFilter>('all');

  useEffect(() => {
    if (!enabled || !slug) return;
    let active = true;
    setState('loading');
    fetch(`${API_BASE}/paints/${resource}/${slug}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('paints');
        return response.json() as Promise<{ palettes: PaintPalette[]; colorFilter?: ColorFilter }>;
      })
      .then((data) => {
        if (!active) return;
        setPalettes(data.palettes);
        setColorFilter(data.colorFilter ?? 'all');
        setState('ready');
      })
      .catch(() => {
        if (!active) return;
        setPalettes([]);
        setColorFilter('all');
        setState('error');
      });
    return () => { active = false; };
  }, [resource, slug, enabled]);

  return { palettes, state, colorFilter };
}
