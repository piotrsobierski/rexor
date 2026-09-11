import { BikeModelPage } from '@/components/static-pages';
import { fetchCatalog } from '@/lib/server-catalog';

export default async function Page({ params }: { params: Promise<{ category: string; model: string }> }) {
  const { model } = await params;
  const catalog = await fetchCatalog();
  return <BikeModelPage catalog={catalog ?? undefined} modelSlug={model} />;
}
