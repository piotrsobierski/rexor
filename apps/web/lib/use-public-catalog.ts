'use client';

import { useEffect, useState } from 'react';
import { bikeModels, type BikeModel } from '@/lib/catalog';
import { mergeCatalog, type ApiModel, type PublicCatalogData, type PublicCategory } from '@/lib/catalog-merge';

export { publicMediaUrl } from '@/lib/catalog-merge';
export type { PublicCategory, PublicCatalogData } from '@/lib/catalog-merge';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8081/api';

/**
 * Katalog pobrany na serwerze trafia tu jako `initial`, więc pierwszy render
 * ma już prawdziwe ceny i opcje. Bez tego strona pokazywała najpierw dane
 * zapasowe, a po chwili podmieniała je na dane z API — widoczne mignięcie.
 * Pobranie po stronie klienta zostaje jako zabezpieczenie, gdy serwer nie
 * dostał odpowiedzi z API.
 */
export function usePublicCatalog(initial?: PublicCatalogData) {
  const [models, setModels] = useState<BikeModel[]>(initial?.models ?? bikeModels);
  const [categories, setCategories] = useState<PublicCategory[]>(initial?.categories ?? []);
  const [loaded, setLoaded] = useState(initial !== undefined);

  useEffect(() => {
    if (initial !== undefined) return;
    fetch(`${API_BASE}/catalog`)
      .then(async (response) => { if (!response.ok) throw new Error('catalog'); return response.json() as Promise<{ models: ApiModel[]; categories: PublicCategory[] }>; })
      .then((data) => {
        const merged = mergeCatalog(data);
        setCategories(merged.categories);
        setModels(merged.models);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  // Dane z serwera nie wymagają ponownego pobrania.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { models, categories, loaded };
}
