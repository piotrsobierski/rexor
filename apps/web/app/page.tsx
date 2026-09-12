import { HomePage as RexorHomePage } from '@/components/home-page';
import { fetchCatalog, fetchCopy } from '@/lib/server-catalog';

export default async function HomePage() {
  const [catalog, copy] = await Promise.all([fetchCatalog(), fetchCopy()]);
  return <RexorHomePage catalog={catalog ?? undefined} copy={copy} />;
}
