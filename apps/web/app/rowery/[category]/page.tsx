import { BikeModelPage, CategoryPage } from '@/components/static-pages';
import { fetchCatalog, fetchCopy } from '@/lib/server-catalog';

const knownModelSlugs = ['e82', 'e55', 'cfr707'];

export function generateStaticParams() {
  return [
    'szosa',
    'gravel',
    'mtb',
    'miejski-turystyczny',
    'elektryczne',
    ...knownModelSlugs,
  ].map((category) => ({ category }));
}

export default async function Page({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const [catalog, copy] = await Promise.all([fetchCatalog(), fetchCopy()]);
  const isModel = knownModelSlugs.includes(category.toLowerCase()) || catalog?.models.some((m) => m.id === category.toLowerCase());

  if (isModel) {
    return <BikeModelPage catalog={catalog ?? undefined} modelSlug={category} copy={copy} />;
  }

  return <CategoryPage catalog={catalog ?? undefined} categorySlug={category} copy={copy} />;
}
