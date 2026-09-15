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
