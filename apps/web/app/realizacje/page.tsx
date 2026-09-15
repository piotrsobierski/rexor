import { ProjectsPage } from '@/components/projects-pages';
import { fetchCatalog, fetchCopy, fetchProjects } from '@/lib/server-catalog';

export default async function Page() {
  const [catalog, copy, projects] = await Promise.all([fetchCatalog(), fetchCopy(), fetchProjects()]);
  return <ProjectsPage projects={projects ?? undefined} catalog={catalog ?? undefined} copy={copy} />;
}
