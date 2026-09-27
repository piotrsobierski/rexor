import { BikesPage } from '@/components/static-pages';
import { fetchCatalog } from '@/lib/server-catalog';

export default async function Page() {
  const catalog = await fetchCatalog();
  return <BikesPage catalog={catalog ?? undefined} />;
}
