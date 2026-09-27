'use client';

import { createContext, useEffect, useState } from 'react';
import { defaultCopy, mergeCopy, type SiteCopy } from '@/lib/copy';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8081/api';

/**
 * Teksty publiczne z jednego źródła dla całego drzewa strony.
 *
 * Powód istnienia: przy eksporcie statycznym serwer nie odpytuje API w czasie
 * builda, więc `fetchCopy()` zwraca null i teksty nadpisań z panelu nie trafiały
 * do wyeksportowanego HTML-a. Komponenty z `initial` nie pobierały nic po
 * stronie klienta (teksty zostawały zapieczone z builda), a te bez `initial`
 * pobierały każde z osobna - stąd mignięcie „Rowery" -> „Rowery111" w menu.
 *
 * Provider dostaje `initial` z renderu serwerowego (tryb dynamiczny: świeże
 * dane z API, `ready` od razu). Bez `initial` (eksport statyczny) pobiera
 * `/settings/copy` raz dla całej strony; do tej pory `usePublicCopyReady()`
 * zwraca false i teksty pokazują szkielet zamiast wartości zapasowych.
 */
export const CopyContext = createContext<{ copy: SiteCopy; ready: boolean } | null>(null);

export function CopyProvider({ initial, children }: { initial?: unknown; children: React.ReactNode }) {
  const hasInitial = initial !== undefined && initial !== null;
  const [state, setState] = useState<{ copy: SiteCopy; ready: boolean }>(() => ({
    copy: hasInitial ? mergeCopy(initial as never) : defaultCopy,
    ready: hasInitial,
  }));

  useEffect(() => {
    if (hasInitial) return;
    let active = true;
    fetch(`${API_BASE}/settings/copy`)
      .then(async (response) => {
        if (!response.ok) throw new Error('copy');
        return response.json() as Promise<{ copy: unknown }>;
      })
      .then((data) => {
        if (active) setState({ copy: mergeCopy(data.copy as never), ready: true });
      })
      // Brak odpowiedzi API nie może zablokować strony: zostają teksty
      // domyślne z kodu, ale oznaczamy je jako gotowe, żeby szkielety zniknęły.
      .catch(() => {
        if (active) setState((previous) => ({ ...previous, ready: true }));
      });
    return () => {
      active = false;
    };
  }, [hasInitial]);

  return <CopyContext.Provider value={state}>{children}</CopyContext.Provider>;
}
