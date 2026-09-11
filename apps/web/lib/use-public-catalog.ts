'use client';

import { useEffect, useState } from 'react';
import { bikeModels, type BikeBattery, type BikeModel } from '@/lib/catalog';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8081/api';
const idsBySlug: Record<string, BikeModel['id']> = { 'e82-wielichowo': 'e82', 'e55-reference': 'e55', cfr707: 'cfr707' };

export type PublicCategory = { slug: string; name: string; short_description: string | null; description_html: string | null; default_image_path: string | null };
type ApiModel = { slug: string; name: string; short_description: string | null; base_price: number | null; default_image_path: string | null; media: Array<{ storage_path: string; role: string }>; batteries?: BikeBattery[] };

export function publicMediaUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('/media/models/')) return path.replace('/media/models/', '/models/');
  if (path.startsWith('/uploads/')) return `${API_BASE}${path}`;
  return path;
}

export function usePublicCatalog() {
  const [models, setModels] = useState<BikeModel[]>(bikeModels);
  const [categories, setCategories] = useState<PublicCategory[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/catalog`)
      .then(async (response) => { if (!response.ok) throw new Error('catalog'); return response.json(); })
      .then((data: { models: ApiModel[]; categories: PublicCategory[] }) => {
        setCategories(data.categories);
        setModels(bikeModels.map((fallback) => {
          const apiModel = data.models.find((item) => idsBySlug[item.slug] === fallback.id);
          if (!apiModel) return fallback;
          const gallery = apiModel.media.map((item) => publicMediaUrl(item.storage_path)).filter(Boolean);
          const image = publicMediaUrl(apiModel.default_image_path) || gallery[0] || fallback.image;
          const batteries = apiModel.batteries?.length ? apiModel.batteries : fallback.batteries;
          return { ...fallback, name: apiModel.name, description: apiModel.short_description || fallback.description, basePrice: apiModel.base_price, image, gallery: gallery.length ? gallery : fallback.gallery, batteries };
        }));
      })
      .catch(() => undefined);
  }, []);

  return { models, categories };
}
