import { ServicePage } from '@/components/service-page';
import { fetchCopy, fetchPage } from '@/lib/server-catalog';

export default async function Page() {
  const [page, copy] = await Promise.all([fetchPage('serwis'), fetchCopy()]);
  return <ServicePage content={page?.content_html ?? null} copy={copy} />;
}
