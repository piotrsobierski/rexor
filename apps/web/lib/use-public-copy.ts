'use client';

import { useEffect, useState } from 'react';
import { defaultCopy, mergeCopy, type SiteCopy } from '@/lib/copy';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8081/api';

/**
 * Analogicznie do usePublicCatalog: nadpisania z panelu pobrane na serwerze
 * trafiają tu jako `initial`, więc pierwszy render ma już właściwe teksty.
 * Pobranie po stronie klienta jest zabezpieczeniem, gdy serwer nie dostał
 * odpowiedzi z API (np. eksport statyczny).
 */
export function usePublicCopy(initial?: unknown) {
  const [copy, setCopy] = useState<SiteCopy>(initial !== undefined ? mergeCopy(initial as never) : defaultCopy);

  useEffect(() => {
    if (initial !== undefined) return;
    fetch(`${API_BASE}/settings/copy`)
      .then(async (response) => { if (!response.ok) throw new Error('copy'); return response.json() as Promise<{ copy: unknown }>; })
      .then((data) => setCopy(mergeCopy(data.copy as never)))
      .catch(() => {});
  // Dane z serwera nie wymagają ponownego pobrania.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return copy;
}
