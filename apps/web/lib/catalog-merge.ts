import { bikeModels, type BikeBattery, type BikeModel, type BikeSize, type OptionGroup } from '@/lib/catalog';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8081/api';
const idsBySlug: Record<string, BikeModel['id']> = { e82: 'e82', e55: 'e55', cfr707: 'cfr707' };

export type PublicCategory = { slug: string; name: string; short_description: string | null; description_html: string | null; default_image_path: string | null };

export type ApiModel = {
  slug: string;
  category_slug: string;
  name: string;
  short_description: string | null;
  description_html: string | null;
  base_price: number | null;
  framePriceGross: number;
  assemblyPriceGross: number;
  marginPercent: number;
  default_image_path: string | null;
  media: Array<{ storage_path: string; role: string }>;
  sizes?: BikeSize[];
  batteries?: BikeBattery[];
  groups?: OptionGroup[];
  specifications?: { facts?: string[]; [key: string]: unknown } | null;
};

export type PublicCatalogData = { models: BikeModel[]; categories: PublicCategory[] };

/** Zdjęcia z preseedu leżą w publicznym katalogu frontendu, wgrane w API. */
export function publicMediaUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('/media/models/')) return path.replace('/media/models/', '/models/');
  if (path.startsWith('/media/categories/')) return path.replace('/media/categories/', '/categories/');
  if (path.startsWith('/uploads/')) return `${API_BASE}${path}`;
  return path;
}

/**
 * Łączy odpowiedź API ze statyczną listą treści marketingowych. Używane i na
 * serwerze (pierwszy render), i na kliencie (gdy serwer nie dostarczył danych),
 * dlatego ten moduł nie jest oznaczony jako klientowy.
 */
export function mergeCatalog(data: { models: ApiModel[]; categories: PublicCategory[] }): PublicCatalogData {
  return {
    categories: data.categories,
    models: bikeModels.map((fallback) => {
      const apiModel = data.models.find((item) => idsBySlug[item.slug] === fallback.id);
      if (!apiModel) return fallback;
      const gallery = apiModel.media.map((item) => publicMediaUrl(item.storage_path)).filter(Boolean);
      const image = publicMediaUrl(apiModel.default_image_path) || gallery[0] || fallback.image;
      return {
        ...fallback,
        name: apiModel.name,
        categorySlug: apiModel.category_slug,
        description: apiModel.short_description || fallback.description,
        descriptionHtml: apiModel.description_html || fallback.descriptionHtml,
        basePrice: apiModel.base_price,
        framePriceGross: apiModel.framePriceGross ?? 0,
        assemblyPriceGross: apiModel.assemblyPriceGross ?? 0,
        marginPercent: apiModel.marginPercent ?? 0,
        image,
        gallery: gallery.length ? gallery : fallback.gallery,
        facts: apiModel.specifications?.facts?.length ? apiModel.specifications.facts : fallback.facts,
        sizes: apiModel.sizes ?? [],
        batteries: apiModel.batteries ?? [],
        groups: apiModel.groups ?? [],
        available: (apiModel.groups?.length ?? 0) > 0 && apiModel.base_price !== null,
      };
    }),
  };
}
