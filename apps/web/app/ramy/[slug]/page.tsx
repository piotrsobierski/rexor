import { FrameDetailPage } from '@/components/frames-pages';
import { fetchCatalog, fetchFrame } from '@/lib/server-catalog';

// Ramy dochodzą wyłącznie z bazy przez panel admina, więc przy eksporcie
// statycznym nie da się wypisać ich slugów. Eksportujemy jedną powłokę
// ("_"), .htaccess kieruje do niej każdy /ramy/*, a właściwy slug
// FrameDetailPage czyta z URL-a po stronie klienta. Ten sam wzorzec działa już
// dla /rowery/[category]/[model] i /konfiguracja/[token].
export function generateStaticParams() {
  return [{ slug: '_' }];
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Dla powłoki nie ma czego pobierać; `undefined` znaczy "dociągnij po stronie
  // klienta", w odróżnieniu od `null`, które znaczyłoby "nie ma takiej ramy".
  const [catalog, frame] = await Promise.all([
    fetchCatalog(),
    slug === '_' ? Promise.resolve(null) : fetchFrame(slug),
  ]);
  return <FrameDetailPage frame={frame ?? undefined} catalog={catalog ?? undefined} />;
}
