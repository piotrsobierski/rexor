import { KontaktPage } from '@/components/kontakt-page';
import { fetchPage } from '@/lib/server-catalog';

export default async function Page() {
  const page = await fetchPage('kontakt');
  return <KontaktPage title={page?.title ?? 'Kontakt'} content={page?.content_html ?? null} />;
}
