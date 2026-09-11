import { FramesPage } from '@/components/static-pages';
import { fetchCatalog } from '@/lib/server-catalog';

export default async function Page() {
  const catalog = await fetchCatalog();
  return <FramesPage catalog={catalog ?? undefined} />;
}
