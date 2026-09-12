import { ContentPage } from '@/components/content-page';
import { fetchPage } from '@/lib/server-catalog';

export default async function Page() {
  const page = await fetchPage('kontakt');
  return <ContentPage slug="kontakt" title={page?.title ?? 'Kontakt'} content={page?.content_html ?? null} />;
}
