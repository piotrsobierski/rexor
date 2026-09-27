import { ProjectDetailPage } from '@/components/projects-pages';
import { fetchCatalog, fetchProject } from '@/lib/server-catalog';

// Powłoka "_" jak przy /ramy/[slug] - realizacje dochodzą tylko z bazy, więc
// przy eksporcie statycznym nie ma z góry znanej listy slugów.
export function generateStaticParams() {
  return [{ slug: '_' }];
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [catalog, project] = await Promise.all([
    fetchCatalog(),
    slug === '_' ? Promise.resolve(null) : fetchProject(slug),
  ]);
  return <ProjectDetailPage project={project ?? undefined} catalog={catalog ?? undefined} />;
}
