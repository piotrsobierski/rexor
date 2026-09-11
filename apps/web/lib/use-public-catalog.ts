'use client';

import { useEffect, useState } from 'react';
import { bikeModels, type BikeBattery, type BikeModel, type BikeSize, type OptionGroup } from '@/lib/catalog';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8081/api';
const idsBySlug: Record<string, BikeModel['id']> = { 'e82-wielichowo': 'e82', 'e55-reference': 'e55', cfr707: 'cfr707' };

export type PublicCategory = { slug: string; name: string; short_description: string | null; description_html: string | null; default_image_path: string | null };

type ApiModel = {
  slug: string;
  name: string;
  short_description: string | null;
  base_price: number | null;
  framePriceGross: number;
  assemblyPriceGross: number;
  marginPercent: number;
  default_image_path: string | null;
  media: Array<{ storage_path: string; role: string }>;
  sizes?: BikeSize[];
  batteries?: BikeBattery[];
  groups?: OptionGroup[];
};

export function publicMediaUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('/media/models/')) return path.replace('/media/models/', '/models/');
  if (path.startsWith('/uploads/')) return `${API_BASE}${path}`;
  return path;
}

export function usePublicCatalog() {
  const [models, setModels] = useState<BikeModel[]>(bikeModels);
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/catalog`)
      .then(async (response) => { if (!response.ok) throw new Error('catalog'); return response.json() as Promise<{ models: ApiModel[]; categories: PublicCategory[] }>; })
      .then((data) => {
        setCategories(data.categories);
        // Ceny, rozmiary, baterie i grupy opcji przychodzą z API. Statyczna
        // lista dokłada wyłącznie treści marketingowe, których nie ma w bazie.
        setModels(bikeModels.map((fallback) => {
          const apiModel = data.models.find((item) => idsBySlug[item.slug] === fallback.id);
          if (!apiModel) return fallback;
          const gallery = apiModel.media.map((item) => publicMediaUrl(item.storage_path)).filter(Boolean);
          const image = publicMediaUrl(apiModel.default_image_path) || gallery[0] || fallback.image;
          return {
            ...fallback,
            name: apiModel.name,
            description: apiModel.short_description || fallback.description,
            basePrice: apiModel.base_price,
            framePriceGross: apiModel.framePriceGross ?? 0,
            assemblyPriceGross: apiModel.assemblyPriceGross ?? 0,
            marginPercent: apiModel.marginPercent ?? 0,
            image,
            gallery: gallery.length ? gallery : fallback.gallery,
            sizes: apiModel.sizes ?? [],
            batteries: apiModel.batteries ?? [],
            groups: apiModel.groups ?? [],
            available: (apiModel.groups?.length ?? 0) > 0 && apiModel.base_price !== null,
          };
        }));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  return { models, categories, loaded };
}
