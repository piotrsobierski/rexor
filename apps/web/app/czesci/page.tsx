import { PartsPage } from '@/components/static-pages';
import { fetchCopy } from '@/lib/server-catalog';

export default async function Page() {
  const copy = await fetchCopy();
  return <PartsPage copy={copy} />;
}
