import { ContentPage } from '@/components/content-page';
import { fetchPage } from '@/lib/server-catalog';

export default async function Page() {
  const page = await fetchPage('regulamin');
  return <ContentPage title={page?.title ?? 'Regulamin'} content={page?.content_html ?? null} />;
}
