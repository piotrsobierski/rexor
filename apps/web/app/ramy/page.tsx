import { FramesPage } from '@/components/frames-pages';
import { fetchCatalog, fetchFrames } from '@/lib/server-catalog';

export default async function Page() {
  const [catalog, frames] = await Promise.all([fetchCatalog(), fetchFrames()]);
  return <FramesPage frames={frames ?? undefined} catalog={catalog ?? undefined} />;
}
