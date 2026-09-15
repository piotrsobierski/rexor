'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowRight, CalendarCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FilteredCollection, type CollectionItem } from '@/components/filtered-collection';
import { PageFrame } from '@/components/page-frame';
import { formatCompletedAt, projectHref, type ApiProject, type PublicProject } from '@/lib/projects';
import { usePublicCatalog, type PublicCatalogData } from '@/lib/use-public-catalog';
import { usePublicCopy } from '@/lib/use-public-copy';
import { usePublicProject, usePublicProjects } from '@/lib/use-public-projects';
import type { SiteCopy } from '@/lib/copy';

/** Lista realizacji z tym samym filtrem kategorii co /ramy. */
export function ProjectsPage({ projects: initialProjects, catalog, copy: initialCopy }: { projects?: ApiProject[]; catalog?: PublicCatalogData; copy?: unknown }) {
  const copy = usePublicCopy(initialCopy);
  const { categories } = usePublicCatalog(catalog);
  const { projects, loaded } = usePublicProjects(initialProjects, categories);

  const items: CollectionItem[] = projects.map((project) => {
    const completed = formatCompletedAt(project.completed_at);
    return {
      key: project.slug,
      href: projectHref(project),
      image: project.image,
      title: project.title,
      eyebrow: project.categoryName,
      description: project.short_description,
      meta: completed ? `${copy.projects.completedPrefix} ${completed}` : null,
      badge: null,
      // Realizacja bez kategorii pokazuje się wyłącznie pod "Wszystkie".
      categorySlug: project.category_slug,
    };
  });

  return <PageFrame><section className="mx-auto max-w-[1480px] px-4 py-12 sm:px-8 lg:px-12 lg:py-20">
    <p className="eyebrow">{copy.projects.eyebrow}</p>
    <h1 className="mt-3 max-w-4xl text-5xl font-semibold tracking-[-0.06em] sm:text-7xl">{copy.projects.title}</h1>
    <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-muted">{copy.projects.subtitle}</p>

    <FilteredCollection items={items} categories={categories} copy={copy} detailsCta={copy.projects.cardDetailsCta} emptyText={copy.projects.empty} loaded={loaded} />
  </section></PageFrame>;
}

/** Powłoka "_" jak przy ramach - slug czytamy z realnego adresu po stronie klienta. */
export function ProjectDetailPage({ project: initialProject, catalog, copy: initialCopy }: { project?: ApiProject | null; catalog?: PublicCatalogData; copy?: unknown }) {
  const copy = usePublicCopy(initialCopy);
  const { categories } = usePublicCatalog(catalog);
  const pathname = usePathname();
  const slug = (pathname.split('/').filter(Boolean).pop() ?? '').toLowerCase();
  const { project, loaded } = usePublicProject(slug === '_' ? '' : slug, initialProject, categories);

  if (!loaded) {
    return <PageFrame><section className="mx-auto max-w-[1480px] px-4 py-20 sm:px-8 lg:px-12">
      <div className="flex items-center gap-2 text-sm text-ink-muted"><Spinner className="size-4" /> {copy.projects.loading}</div>
    </section></PageFrame>;
  }

  if (!project) {
    return <PageFrame><section className="mx-auto max-w-[1480px] px-4 py-12 sm:px-8 lg:px-12 lg:py-20">
      <p className="eyebrow">{copy.projects.notFoundEyebrow}</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em]">{copy.projects.notFoundTitle}</h1>
      <Button render={<a href="/realizacje" />} variant="outline" className="mt-6 rounded-full">{copy.projects.backToAllCta} <ArrowRight data-icon="inline-end" /></Button>
    </section></PageFrame>;
  }

  return <PageFrame><ProjectDetail project={project} copy={copy} /></PageFrame>;
}

function ProjectDetail({ project, copy }: { project: PublicProject; copy: SiteCopy }) {
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const activeImage = project.gallery[selectedPhoto] ?? project.image;
  const completed = formatCompletedAt(project.completed_at);
  const specification = project.specification ?? [];

  return (
    <section className="mx-auto max-w-[1480px] px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
      <nav className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
        <a href="/" className="transition-colors hover:text-ink">{copy.projects.breadcrumbHome}</a>
        <span>/</span>
        <a href="/realizacje" className="transition-colors hover:text-ink">{copy.projects.breadcrumbProjects}</a>
        <span>/</span>
        <span className="text-ink">{project.title}</span>
      </nav>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-14">
        <div className="space-y-4">
          {/* Zdjęcia realizacji są prawdziwymi fotografiami, nie renderami na
              jednolitym tle - dlatego object-cover, bez mix-blend-multiply. */}
          <div className="aspect-[4/3] overflow-hidden rounded-[32px] bg-[var(--muted)]">
            {activeImage
              ? <img src={activeImage} alt={project.title} className="size-full object-cover transition-all duration-300" />
              : <div className="size-full bg-ink-wash" aria-hidden="true" />}
          </div>
          {project.gallery.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {project.gallery.map((img, index) => (
                <button
                  key={img}
                  type="button"
                  onClick={() => setSelectedPhoto(index)}
                  className={`aspect-[4/3] h-20 shrink-0 overflow-hidden rounded-2xl border-2 transition-all ${selectedPhoto === index ? 'border-ink shadow-sm' : 'border-transparent opacity-70 hover:opacity-100'}`}
                >
                  <img src={img} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <span className="eyebrow">{project.categoryName ?? copy.projects.eyebrow}</span>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] sm:text-6xl">{project.title}</h1>
          {completed && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-xl bg-ink-wash px-3.5 py-2 text-sm font-medium text-ink">
              <CalendarCheck className="size-4 text-ink-subtle" aria-hidden="true" /> {copy.projects.completedPrefix} {completed}
            </p>
          )}
          {project.short_description && <p className="mt-4 text-lg leading-relaxed text-ink-muted">{project.short_description}</p>}

          {specification.length > 0 && (
            <div className="mt-8 overflow-hidden rounded-3xl border border-line">
              <h2 className="border-b border-line bg-[var(--muted)]/60 px-5 py-4 text-sm font-bold uppercase tracking-[0.14em] text-ink-subtle">{copy.projects.specificationTitle}</h2>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{copy.projects.specificationLabelHeader}</TableHead>
                      <TableHead>{copy.projects.specificationValueHeader}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {specification.map((entry, index) => (
                      <TableRow key={`${entry.label}-${index}`}>
                        <TableCell className="font-medium text-ink">{entry.label}</TableCell>
                        <TableCell className="text-ink-muted">{entry.value}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </div>

      {project.content_html && (
        <div className="mt-16 border-t border-line pt-12 lg:mt-24 lg:pt-16">
          <div className="max-w-4xl">
            <p className="eyebrow">{copy.projects.descriptionTitle}</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">{project.title}</h2>
            <div className="rich-content mt-8" dangerouslySetInnerHTML={{ __html: project.content_html }} />
          </div>
        </div>
      )}

      <div className="mt-16 rounded-[32px] bg-ink p-8 text-white sm:p-12 lg:mt-24">
        <div className="mx-auto flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-brand)]">{copy.projects.eyebrow}</p>
            <h3 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{copy.projects.ctaTitle}</h3>
            <p className="mt-2 max-w-xl text-white/60">{copy.projects.ctaText}</p>
          </div>
          <Button render={<a href="/konfigurator" />} variant="brand" className="h-12 rounded-full px-8 font-semibold transition-all hover:brightness-95">
            {copy.projects.ctaButton} <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      </div>
    </section>
  );
}
