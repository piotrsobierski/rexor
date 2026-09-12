'use client';

import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { usePublicCopy } from '@/lib/use-public-copy';
import { usePublicPage } from '@/lib/use-public-page';

/** Prosta strona treściowa (Regulamin, Polityka prywatności, Kontakt) - ten sam site_pages/WYSIWYG mechanizm co Serwis, bez sekcji z CTA. */
export function ContentPage({ slug, title, content }: { slug: string; title: string; content: string | null }) {
  const copy = usePublicCopy();
  const page = usePublicPage(slug, content ? { slug, title, excerpt: null, content_html: content, hero_image_path: null, updated_at: '' } : undefined);
  const html = page?.content_html ?? null;
  return <div className="flex min-h-screen flex-col"><SiteHeader /><main className="flex-1"><section className="mx-auto max-w-[900px] px-4 py-14 sm:px-8 lg:py-20"><h1 className="text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">{page?.title ?? title}</h1>{html ? <article className="rich-content mt-8" dangerouslySetInnerHTML={{ __html: html }} /> : <p className="mt-8 text-ink-muted">{copy.content.notPublished}</p>}</section></main><SiteFooter /></div>;
}
