import { ServicePage } from '@/components/service-page';
import { fetchPage } from '@/lib/server-catalog';

export default async function Page() {
  const page = await fetchPage('serwis');
  return <ServicePage content={page?.content_html ?? null} />;
}
