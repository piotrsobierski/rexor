import { HomePage as RexorHomePage } from '@/components/home-page';
import { fetchCatalog } from '@/lib/server-catalog';

export default async function HomePage() {
  const catalog = await fetchCatalog();
  return <RexorHomePage catalog={catalog ?? undefined} />;
}
