'use client';

import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { usePublicCopy } from '@/lib/use-public-copy';
import { usePublicPage } from '@/lib/use-public-page';

/** Prosta strona treściowa (Regulamin, Polityka prywatności, Kontakt) - ten sam site_pages/WYSIWYG mechanizm co Serwis, bez sekcji z CTA. */
export function ContentPage({ slug, title, content }: { slug: string; title: string; content: string | null }) {
  const copy = usePublicCopy();
  const { page, loading } = usePublicPage(slug, content ? { slug, title, excerpt: null, content_html: content, hero_image_path: null, updated_at: '' } : undefined);
  const html = page?.content_html ?? null;
  return <div className="flex min-h-screen flex-col"><SiteHeader /><main className="flex-1"><section className="mx-auto max-w-[900px] px-4 py-14 sm:px-8 lg:py-20"><h1 className="text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">{loading ? <Skeleton aria-hidden="true" className="h-10 w-2/3 sm:h-12" /> : (page?.title ?? title)}</h1>{loading ? <div className="mt-12 flex items-center gap-2 text-sm text-ink-muted"><Spinner className="size-4" /> {copy.content.loading}</div> : html ? <article className="rich-content mt-8" dangerouslySetInnerHTML={{ __html: html }} /> : <p className="mt-8 text-ink-muted">{copy.content.notPublished}</p>}</section></main><SiteFooter /></div>;
}
