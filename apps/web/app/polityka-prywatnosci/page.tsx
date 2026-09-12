import { ContentPage } from '@/components/content-page';
import { fetchPage } from '@/lib/server-catalog';

export default async function Page() {
  const page = await fetchPage('polityka-prywatnosci');
  return <ContentPage slug="polityka-prywatnosci" title={page?.title ?? 'Polityka prywatności'} content={page?.content_html ?? null} />;
}
