/**
 * Ramy sprzedawane osobno (bez konfiguratora).
 *
 * Celowo osobny byt niż `bike_models`: model jest wpięty w cennik
 * (model_parts, model_sizes, model_batteries, przeliczanie ceny bazowej),
 * a rama to pozycja katalogowa z ceną własną. Trzymanie ramy jako "modelu
 * bez konfiguratora" oznaczałoby NULL-e i warunki w całej wycenie.
 *
 * Kategorie są wspólne z rowerami (`bike_categories`), żeby filtr na /ramy
 * i /rowery pokazywał tę samą listę.
 */

import { publicMediaUrl } from '@/lib/catalog-merge';

/** Kształt wiersza z `GET /frames` i `GET /frames/{slug}` - 1:1 z kolumnami tabeli `frames`. */
export type ApiFrame = {
  slug: string;
  category_slug: string;
  name: string;
  manufacturer: string | null;
  short_description: string | null;
  /** Pełny opis z WYSIWYG; obrazy w treści są zwykłymi <img> na /uploads/. */
  description_html: string | null;
  /** Geometria jako tekst sformatowany przez administratora (WYSIWYG), nie struktura. */
  geometry_html: string | null;
  /** Fakty/tabliczki: { facts?: string[] } - ten sam kształt co `bike_models.specifications`. */
  specifications: { facts?: string[]; [key: string]: unknown } | null;
  /** null = "wymaga wyceny". Cena brutto w PLN. */
  price_gross: number | null;
  /** Czy oferujemy ramę pomalowaną wg projektu klienta. */
  paint_available: boolean;
  /** Gwiazdka w panelu -> "Nasza rekomendacja" na kafelku. */
  is_recommended: boolean;
  /** Rama dodana z oferty producenta (np. carbonda.com) - link źródłowy dla admina. */
  source_url: string | null;
  default_image_path: string | null;
  media: Array<{ storage_path: string; role: FrameMediaRole; alt_text: string | null }>;
  /** Rozmiary zdefiniowane w panelu - bez dopłaty, rama ma jedną cenę niezależnie od rozmiaru. */
  sizes: Array<{ code: string; label: string }>;
};

/**
 * `geometry` to zdjęcie tabeli geometrii od producenta - w praktyce właśnie
 * w takiej formie dostajemy te dane i nie ma sensu przepisywać ich ręcznie.
 */
export type FrameMediaRole = 'default' | 'gallery' | 'description' | 'geometry';

/** Postać gotowa do renderu: ścieżki mediów zamienione na URL-e. */
export type PublicFrame = Omit<ApiFrame, 'media' | 'default_image_path'> & {
  image: string;
  gallery: string[];
  geometryImages: string[];
  facts: string[];
  /** Nazwa kategorii z katalogu; gdy brak dopasowania - sam slug. */
  categoryName: string;
};

export const frameHref = (frame: { slug: string }) => `/ramy/${frame.slug}`;

/**
 * Złączenie odpowiedzi API z katalogiem kategorii. Kategorie przychodzą
 * osobnym zapytaniem (`/catalog`), bo są wspólne dla ram i rowerów - dlatego
 * merge jest tutaj, a nie po stronie API.
 */
export function mergeFrame(frame: ApiFrame, categories: Array<{ slug: string; name: string }>): PublicFrame {
  const { media, default_image_path, ...rest } = frame;
  const gallery = media
    .filter((item) => item.role === 'default' || item.role === 'gallery')
    .map((item) => publicMediaUrl(item.storage_path))
    .filter(Boolean);
  const geometryImages = media
    .filter((item) => item.role === 'geometry')
    .map((item) => publicMediaUrl(item.storage_path))
    .filter(Boolean);

  return {
    ...rest,
    // Tak samo jak modele (catalog-merge.ts): pierwsze zdjęcie galerii (wg
    // sort_order) bije `default_image_path`, żeby przesunięcie zdjęcia na
    // pierwsze miejsce w panelu od razu zmieniało miniaturkę na /ramy i w
    // galerii, zamiast czekać, aż ktoś ręcznie nadpisze default_image_path.
    image: gallery[0] || publicMediaUrl(default_image_path) || '',
    gallery,
    geometryImages,
    facts: frame.specifications?.facts ?? [],
    categoryName: categories.find((item) => item.slug === frame.category_slug)?.name ?? frame.category_slug,
  };
}
