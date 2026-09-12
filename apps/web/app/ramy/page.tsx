import { FramesPage } from '@/components/static-pages';
import { fetchCatalog, fetchCopy } from '@/lib/server-catalog';

export default async function Page() {
  const [catalog, copy] = await Promise.all([fetchCatalog(), fetchCopy()]);
  return <FramesPage catalog={catalog ?? undefined} copy={copy} />;
}
