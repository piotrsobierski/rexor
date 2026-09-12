import { BikeModelPage } from '@/components/static-pages';
import { fetchCatalog, fetchCopy } from '@/lib/server-catalog';

export function generateStaticParams() {
  return [
    { category: 'mtb', model: 'e82' },
    { category: 'mtb', model: 'e55' },
    { category: 'gravel', model: 'cfr707' },
  ];
}

export default async function Page({ params }: { params: Promise<{ category: string; model: string }> }) {
  const { model } = await params;
  const [catalog, copy] = await Promise.all([fetchCatalog(), fetchCopy()]);
  return <BikeModelPage catalog={catalog ?? undefined} modelSlug={model} copy={copy} />;
}
