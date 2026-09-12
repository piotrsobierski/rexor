'use client';

import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8081/api';

export type PublicPage = { slug: string; title: string; excerpt: string | null; content_html: string; hero_image_path: string | null; updated_at: string };

/**
 * Analogicznie do usePublicCatalog/usePublicCopy: przy eksporcie statycznym
 * (STATIC_EXPORT=1) serwer nigdy nie dociąga treści (patrz fetchJson w
 * lib/server-catalog.ts), więc bez tego klienckiego dobicia strona zostawała
 * na zawsze z pustą treścią zamiast prawdziwej z bazy.
 */
export function usePublicPage(slug: string, initial?: PublicPage | null) {
  const [page, setPage] = useState<PublicPage | null>(initial ?? null);

  useEffect(() => {
    if (initial !== undefined) return;
    fetch(`${API_BASE}/pages/${slug}`)
      .then(async (response) => { if (!response.ok) throw new Error('page'); return response.json() as Promise<{ page: PublicPage }>; })
      .then((data) => setPage(data.page))
      .catch(() => {});
  // Slug jednej strony nie zmienia się po zamontowaniu komponentu.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  return page;
}
