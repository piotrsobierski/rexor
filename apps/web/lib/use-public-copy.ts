'use client';

import { useContext, useEffect, useState } from 'react';
import { CopyContext } from '@/components/copy-provider';
import { defaultCopy, mergeCopy, type SiteCopy } from '@/lib/copy';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8081/api';

/**
 * Teksty publiczne. Podstawowe źródło to `CopyProvider` z `app/layout.tsx`:
 * raz na stronę, z jednego pobrania, wspólne dla nagłówka, stopki i treści.
 *
 * Zapasowa ścieżka (komponent bez providera) działa jak dawniej: `initial`
 * z renderu serwerowego, a bez niego pobranie po stronie klienta. W odróżnieniu
 * od starej wersji `null` nie jest traktowane jako dane startowe - przy
 * eksporcie statycznym serwer właśnie `null` oznacza "brak danych, dociągnij
 * sam", więc tamto rozróżnienie zamrażało teksty z builda.
 */
export function usePublicCopy(initial?: unknown): SiteCopy {
  const context = useContext(CopyContext);
  const [standalone, setStandalone] = useState<SiteCopy>(() =>
    initial !== undefined && initial !== null ? mergeCopy(initial as never) : defaultCopy,
  );

  useEffect(() => {
    // Provider przejął odpowiedzialność za odświeżanie; initial (nie-nullowe)
    // oznacza dane z serwera, których nie trzeba pobierać drugi raz.
    if (context !== null || (initial !== undefined && initial !== null)) return;
    fetch(`${API_BASE}/settings/copy`)
      .then(async (response) => {
        if (!response.ok) throw new Error('copy');
        return response.json() as Promise<{ copy: unknown }>;
      })
      .then((data) => setStandalone(mergeCopy(data.copy as never)))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return context !== null ? context.copy : standalone;
}

/**
 * Czy efektywne teksty są potwierdzone (z serwera albo z API). False wyłącznie
 * przy eksporcie statycznym, przez moment po załadowaniu strony - wtedy zamiast
 * wartości zapasowych pokazujemy szkielety, żeby nie migała treść z builda.
 */
export function usePublicCopyReady(): boolean {
  const context = useContext(CopyContext);
  return context?.ready ?? true;
}
