import { bikeModels, type BikeBattery, type BikeModel, type BikeSize, type OptionGroup } from '@/lib/catalog';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8081/api';

export type PublicCategory = { slug: string; name: string; short_description: string | null; description_html: string | null; default_image_path: string | null; hero_image_path: string | null; icon_key: string | null };

export type ApiModel = {
  status?: string;
  is_recommended?: boolean;
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
  if (path.startsWith('/media/frames/')) return path.replace('/media/frames/', '/frames/');
  if (path.startsWith('/uploads/')) return `${API_BASE}${path}`;
  // Wiersze zapisane dawniej z doklejonym prefiksem API. Na produkcji
  // (`/api`) trafiały przypadkiem w cel, lokalnie - w serwer Next.js, gdzie
  // pliku nie ma. Sprowadzamy je do tej samej postaci co świeże ścieżki.
  if (path.startsWith('/api/uploads/')) return `${API_BASE}${path.slice('/api'.length)}`;
  return path;
}

/**
 * Katalog buduje się z odpowiedzi API (dowolna liczba modeli, tylko z bazy -
 * nowe ramy dochodzą przez panel admina, bez zmian w kodzie), nie z listy
 * modeli zaszytej w kodzie. `bikeModels` (lib/catalog.ts) dostarcza tylko
 * dodatkową treść marketingową (długi opis, hasła, etykiety silnika/baterii)
 * dla trzech modeli startowych, gdy istnieje dopasowanie po slugu - reszta
 * (cena, zdjęcia, opcje, specyfikacja) zawsze pochodzi z API. Model bez
 * dopasowania w bikeModels wciąż się w pełni renderuje, tylko bez tych
 * dodatkowych, ręcznie napisanych treści.
 *
 * Używane i na serwerze (pierwszy render), i na kliencie (gdy serwer nie
 * dostarczył danych), dlatego ten moduł nie jest oznaczony jako klientowy.
 */
export function mergeCatalog(data: { models: ApiModel[]; categories: PublicCategory[] }): PublicCatalogData {
  return {
    categories: data.categories,
    models: data.models.map((apiModel): BikeModel => {
      const fallback = bikeModels.find((item) => item.id === apiModel.slug);
      const categoryName = data.categories.find((item) => item.slug === apiModel.category_slug)?.name ?? fallback?.category ?? apiModel.category_slug;
      const gallery = apiModel.media.map((item) => publicMediaUrl(item.storage_path)).filter(Boolean);
      // Pierwsze zdjęcie galerii jest zdjęciem głównym na stronie modelu.
      // Ta sama reguła musi obowiązywać na liście /rowery, inaczej po
      // wgraniu nowego zdjęcia karta i strona szczegółów pokazują co innego.
      const image = gallery[0] || publicMediaUrl(apiModel.default_image_path) || fallback?.image || '';
      return {
        id: apiModel.slug,
        name: apiModel.name,
        category: categoryName,
        categorySlug: apiModel.category_slug,
        recommended: apiModel.is_recommended === true && apiModel.status === 'published',
        eyebrow: fallback?.eyebrow ?? categoryName,
        description: apiModel.short_description || fallback?.description || '',
        descriptionHtml: apiModel.description_html || fallback?.descriptionHtml,
        image,
        gallery: gallery.length ? gallery : fallback?.gallery ?? [],
        frameImage: fallback?.frameImage,
        basePrice: apiModel.base_price,
        framePriceGross: apiModel.framePriceGross ?? 0,
        assemblyPriceGross: apiModel.assemblyPriceGross ?? 0,
        marginPercent: apiModel.marginPercent ?? 0,
        motor: fallback?.motor ?? '',
        battery: fallback?.battery ?? '',
        facts: apiModel.specifications?.facts?.length ? apiModel.specifications.facts : fallback?.facts,
        sizes: apiModel.sizes ?? [],
        batteries: apiModel.batteries ?? [],
        available: (apiModel.groups?.length ?? 0) > 0 && apiModel.base_price !== null,
        groups: apiModel.groups ?? [],
      };
    }),
  };
}
