/**
 * Realizacje: rowery i pojazdy elektryczne faktycznie zbudowane przez Rexor.
 *
 * Bliżej `site_pages` niż `bike_models` - nie ma tu cennika ani konfiguracji,
 * jest redagowana strona ze zdjęciami i spisem użytych komponentów. Zdjęcia
 * mają być prawdziwe, nie rendery z generatora.
 */

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
