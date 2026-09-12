'use client';

import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { usePublicCopy } from '@/lib/use-public-copy';

/** Prosta strona treściowa (Regulamin, Polityka prywatności, Kontakt) - ten sam site_pages/WYSIWYG mechanizm co Serwis, bez sekcji z CTA. */
export function ContentPage({ title, content }: { title: string; content: string | null }) {
  const copy = usePublicCopy();
  return <div className="flex min-h-screen flex-col"><SiteHeader /><main className="flex-1"><section className="mx-auto max-w-[900px] px-4 py-14 sm:px-8 lg:py-20"><h1 className="text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">{title}</h1>{content ? <article className="rich-content mt-8" dangerouslySetInnerHTML={{ __html: content }} /> : <p className="mt-8 text-ink-muted">{copy.content.notPublished}</p>}</section></main><SiteFooter /></div>;
}
