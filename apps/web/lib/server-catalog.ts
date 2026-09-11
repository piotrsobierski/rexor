/**
 * Pobieranie danych po stronie serwera.
 *
 * Treść z panelu musi być w pierwszym renderze. Gdy strona startowała od
 * wartości zapisanej w kodzie i dopiero w useEffect dociągała prawdziwą,
 * użytkownik widział mignięcie starej treści przy każdym wejściu.
 *
 * `no-store` oznacza, że zmiana w panelu jest widoczna od razu po odświeżeniu.
 * Strony są dynamiczne, co dla treści redagowanej w CMS jest właściwym
 * kompromisem.
 */

// Po stronie serwera API może być pod innym adresem niż dla przeglądarki
// (np. adres wewnętrzny kontenera), dlatego osobna zmienna ma pierwszeństwo.
import { mergeCatalog, type ApiModel, type PublicCatalogData, type PublicCategory } from '@/lib/catalog-merge';

const SERVER_API_BASE = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8081/api';

async function fetchJson<T>(path: string): Promise<T | null> {
  // Na hostingu PHP frontend jest eksportowany statycznie. Aktualne dane
  // pobierają wtedy komponenty klienckie bezpośrednio z /api.
  if (process.env.STATIC_EXPORT === '1') return null;

  try {
    const response = await fetch(`${SERVER_API_BASE}${path}`, { cache: 'no-store' });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    // Brak API nie może wywracać strony: wywołujący pokazuje treść zapasową.
    return null;
  }
}

export type ApiPage = { slug: string; title: string; excerpt: string | null; content_html: string; hero_image_path: string | null; updated_at: string };

export async function fetchPage(slug: string): Promise<ApiPage | null> {
  const data = await fetchJson<{ page: ApiPage }>(`/pages/${slug}`);
  return data?.page ?? null;
}

export async function fetchTheme(): Promise<Record<string, string> | null> {
  const data = await fetchJson<{ theme: Record<string, string> | null }>('/settings/theme');
  return data?.theme ?? null;
}

export async function fetchCatalog(): Promise<PublicCatalogData | null> {
  const data = await fetchJson<{ models: ApiModel[]; categories: PublicCategory[] }>('/catalog');
  return data ? mergeCatalog(data) : null;
}
