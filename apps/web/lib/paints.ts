'use client';

import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8081/api';

/** Slug części z grupy „paint”, która oznacza lakierowanie standardowe. */
export const PAINT_GROUP_SLUG = 'paint';

export type PaintRender = { image: string; thumb: string | null; source: string | null };

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
  renders: { standard?: PaintRender; ultra?: PaintRender };
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

export const FINISH_LABELS: Record<PaintColor['finish'], string> = {
  uni: 'uni',
  metallic: 'metalik',
  pearl: 'perła',
};

/** Render „ultra” jest lepszy, więc gdy istnieje, to on idzie na podgląd. */
export function bestRender(color: PaintColor): PaintRender | null {
  return color.renders.ultra ?? color.renders.standard ?? null;
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
 */
export function usePaints(modelSlug: string | null, enabled: boolean) {
  const [palettes, setPalettes] = useState<PaintPalette[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  useEffect(() => {
    if (!enabled || !modelSlug) return;
    let active = true;
    setState('loading');
    fetch(`${API_BASE}/paints/model/${modelSlug}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('paints');
        return response.json() as Promise<{ palettes: PaintPalette[] }>;
      })
      .then((data) => {
        if (!active) return;
        setPalettes(data.palettes);
        setState('ready');
      })
      .catch(() => {
        if (!active) return;
        setPalettes([]);
        setState('error');
      });
    return () => { active = false; };
  }, [modelSlug, enabled]);

  return { palettes, state };
}
