import { BikeModelPage, CategoryPage } from '@/components/static-pages';
import { fetchCatalog } from '@/lib/server-catalog';

const knownModelSlugs = ['e82', 'e55', 'cfr707'];

export function generateStaticParams() {
  return [
    'szosa',
    'gravel',
    'mtb',
    'miejski-turystyczny',
    ...knownModelSlugs,
  ].map((category) => ({ category }));
}

export default async function Page({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const catalog = await fetchCatalog();
  const isModel = knownModelSlugs.includes(category.toLowerCase()) || catalog?.models.some((m) => m.id === category.toLowerCase());

  if (isModel) {
    return <BikeModelPage catalog={catalog ?? undefined} modelSlug={category} />;
  }

  return <CategoryPage catalog={catalog ?? undefined} categorySlug={category} />;
}
