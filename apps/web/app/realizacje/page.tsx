import { ProjectsPage } from '@/components/projects-pages';
import { fetchCatalog, fetchProjects } from '@/lib/server-catalog';

export default async function Page() {
  const [catalog, projects] = await Promise.all([fetchCatalog(), fetchProjects()]);
  return <ProjectsPage projects={projects ?? undefined} catalog={catalog ?? undefined} />;
}
