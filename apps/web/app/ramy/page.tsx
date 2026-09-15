import { FramesPage } from '@/components/frames-pages';
import { fetchCatalog, fetchCopy, fetchFrames } from '@/lib/server-catalog';

export default async function Page() {
  const [catalog, copy, frames] = await Promise.all([fetchCatalog(), fetchCopy(), fetchFrames()]);
  return <FramesPage frames={frames ?? undefined} catalog={catalog ?? undefined} copy={copy} />;
}
