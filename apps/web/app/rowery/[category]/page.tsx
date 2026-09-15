import { BikeModelPage, CategoryOrModelPage, CategoryPage } from '@/components/static-pages';
import { fetchCatalog, fetchCopy } from '@/lib/server-catalog';

const knownModelSlugs = ['e82', 'e55', 'cfr707'];

// "_" to powłoka dla kategorii, których nie było w chwili builda (dochodzą z
// panelu) - .htaccess kieruje do niej /rowery/* bez gotowego pliku .html.
// Pozostałe wpisy zostają, żeby kategorie istniejące przy buildzie miały
// prawdziwy render serwerowy zamiast dociągania danych po stronie klienta.
export function generateStaticParams() {
  return [
    '_',
    'szosa',
    'gravel',
    'mtb',
    'miejski-turystyczny',
    'elektryczne',
    'inne',
    ...knownModelSlugs,
  ].map((category) => ({ category }));
}

export default async function Page({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const [catalog, copy] = await Promise.all([fetchCatalog(), fetchCopy()]);

  if (category === '_') {
    return <CategoryOrModelPage catalog={catalog ?? undefined} copy={copy} />;
  }

  const isModel = knownModelSlugs.includes(category.toLowerCase()) || catalog?.models.some((m) => m.id === category.toLowerCase());

  if (isModel) {
    return <BikeModelPage catalog={catalog ?? undefined} modelSlug={category} copy={copy} />;
  }

  return <CategoryPage catalog={catalog ?? undefined} categorySlug={category} copy={copy} />;
}
