/**
 * Realizacje: rowery i pojazdy elektryczne faktycznie zbudowane przez Rexor.
 *
 * Bliżej `site_pages` niż `bike_models` - nie ma tu cennika ani konfiguracji,
 * jest redagowana strona ze zdjęciami i spisem użytych komponentów. Zdjęcia
 * mają być prawdziwe, nie rendery z generatora.
 */

import { publicMediaUrl } from '@/lib/catalog-merge';

export type ApiProject = {
  slug: string;
  title: string;
  short_description: string | null;
  /** Pełna strona realizacji z WYSIWYG (ten sam edytor co opisy modeli). */
  content_html: string | null;
  /**
   * Spis komponentów jako lista par, w kolejności wprowadzonej w panelu -
   * dokładnie forma tabelki, którą Rexor prowadzi dla każdego składu
   * ("silnik: M620 CAN", "rama: rozmiar 19, E55", ...).
   */
  specification: Array<{ label: string; value: string }> | null;
  /** Opcjonalne; gdy ustawione, realizacja wpada pod filtr kategorii. */
  category_slug: string | null;
  /** YYYY-MM-DD; do etykiety "zbudowany 09/2026" i sortowania. */
  completed_at: string | null;
  cover_image_path: string | null;
  media: Array<{ storage_path: string; role: ProjectMediaRole; alt_text: string | null }>;
};

export type ProjectMediaRole = 'cover' | 'gallery' | 'description';

export type PublicProject = Omit<ApiProject, 'media' | 'cover_image_path'> & {
  image: string;
  gallery: string[];
  categoryName: string | null;
};

export const projectHref = (project: { slug: string }) => `/realizacje/${project.slug}`;

/** Jak `mergeFrame`: nazwa kategorii dochodzi z katalogu, media dostają URL-e. */
export function mergeProject(project: ApiProject, categories: Array<{ slug: string; name: string }>): PublicProject {
  const { media, cover_image_path, ...rest } = project;
  const gallery = media
    .filter((item) => item.role === 'cover' || item.role === 'gallery')
    .map((item) => publicMediaUrl(item.storage_path))
    .filter(Boolean);

  return {
    ...rest,
    image: publicMediaUrl(cover_image_path) || gallery[0] || '',
    gallery,
    categoryName: project.category_slug
      ? categories.find((item) => item.slug === project.category_slug)?.name ?? project.category_slug
      : null,
  };
}

/** "2026-09-14" -> "09/2026". Realizacje datujemy z dokładnością do miesiąca. */
export function formatCompletedAt(value: string | null): string | null {
  if (!value) return null;
  const [year, month] = value.split('-');
  return year && month ? `${month}/${year}` : value;
}
