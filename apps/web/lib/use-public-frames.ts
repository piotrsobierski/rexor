'use client';

import { useEffect, useMemo, useState } from 'react';
import { mergeFrame, type ApiFrame, type PublicFrame } from '@/lib/frames';
import type { PublicCategory } from '@/lib/catalog-merge';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8081/api';

/**
 * Ten sam wzorzec co `usePublicCatalog`: render serwerowy podaje wiersze z API
 * jako `initial`, więc pierwszy render ma już prawdziwe ramy. Pobranie po
 * stronie klienta zostaje jako zabezpieczenie dla eksportu statycznego, gdzie
 * serwer nie odpytuje API w ogóle.
 *
 * Scalenie z kategoriami robimy tu, a nie w `initial`, bo nazwy kategorii
 * przychodzą osobnym zapytaniem i mogą dojechać później niż same ramy.
 */
export function usePublicFrames(initial: ApiFrame[] | undefined, categories: PublicCategory[]) {
  const [rows, setRows] = useState<ApiFrame[]>(initial ?? []);
  const [loaded, setLoaded] = useState(initial !== undefined);

  useEffect(() => {
    if (initial !== undefined) return;
    fetch(`${API_BASE}/frames`)
      .then(async (response) => { if (!response.ok) throw new Error('frames'); return response.json() as Promise<{ frames: ApiFrame[] }>; })
      .then((data) => { setRows(data.frames ?? []); setLoaded(true); })
      .catch(() => setLoaded(true));
  // Dane z serwera nie wymagają ponownego pobrania.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const frames = useMemo(() => rows.map((row) => mergeFrame(row, categories)), [rows, categories]);
  return { frames, loaded };
}

/** Stan pojedynczej ramy dla `/ramy/[slug]` - rozróżnia "wczytuję" od "nie ma takiej ramy". */
export function usePublicFrame(slug: string, initial: ApiFrame | null | undefined, categories: PublicCategory[]) {
  const [row, setRow] = useState<ApiFrame | null>(initial ?? null);
  const [loaded, setLoaded] = useState(initial !== undefined);

  useEffect(() => {
    if (initial !== undefined) return;
    if (!slug) return;
    let cancelled = false;
    setLoaded(false);
    fetch(`${API_BASE}/frames/${encodeURIComponent(slug)}`)
      .then(async (response) => { if (!response.ok) throw new Error('frame'); return response.json() as Promise<{ frame: ApiFrame }>; })
      .then((data) => { if (!cancelled) { setRow(data.frame ?? null); setLoaded(true); } })
      .catch(() => { if (!cancelled) { setRow(null); setLoaded(true); } });
    return () => { cancelled = true; };
  // Dane z serwera nie wymagają ponownego pobrania.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const frame: PublicFrame | null = useMemo(() => (row ? mergeFrame(row, categories) : null), [row, categories]);
  return { frame, loaded };
}
