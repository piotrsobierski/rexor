'use client';

import { useEffect } from 'react';
import { publicMediaUrl } from '@/lib/catalog-merge';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8081/api';

function applyFavicon(url: string) {
  for (const rel of ['icon', 'apple-touch-icon']) {
    document.querySelectorAll<HTMLLinkElement>(`link[rel="${rel}"]`).forEach((link) => link.remove());
    const link = document.createElement('link');
    link.rel = rel;
    link.href = url;
    document.head.appendChild(link);
  }
}

/**
 * Analogicznie do usePublicCopy: gdy metadane wygenerował serwer (`applied`),
 * nie robimy nic. Przy eksporcie statycznym ikona z panelu nie zdąży trafić
 * do <head> w czasie builda, więc podmieniamy ją tu, po stronie klienta.
 */
export function FaviconRuntime({ applied }: { applied: boolean }) {
  useEffect(() => {
    if (applied) return;
    fetch(`${API_BASE}/settings/branding`)
      .then(async (response) => { if (!response.ok) throw new Error('branding'); return response.json() as Promise<{ branding: { faviconPath: string | null } }>; })
      .then((data) => { const url = publicMediaUrl(data.branding?.faviconPath); if (url) applyFavicon(url); })
      .catch(() => {});
  }, [applied]);

  return null;
}
