'use client';

import { ContactForm } from '@/components/contact-form';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { Spinner } from '@/components/ui/spinner';
import { usePublicCopy } from '@/lib/use-public-copy';
import { usePublicPage } from '@/lib/use-public-page';

/** Jak ContentPage (Regulamin, Polityka), ale z formularzem kontaktowym obok treści z panelu. */
export function KontaktPage({ content, title }: { content: string | null; title: string }) {
  const copy = usePublicCopy();
  const { page, loading } = usePublicPage('kontakt', content ? { slug: 'kontakt', title, excerpt: null, content_html: content, hero_image_path: null, updated_at: '' } : undefined);
  const html = page?.content_html ?? content ?? null;
  return <div className="flex min-h-screen flex-col"><SiteHeader /><main className="flex-1"><section className="mx-auto grid max-w-[1100px] gap-10 px-4 py-14 sm:px-8 lg:grid-cols-[1fr_380px] lg:py-20">
    <div>
      <h1 className="text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">{page?.title ?? title}</h1>
      {loading ? <div className="mt-12 flex items-center gap-2 text-sm text-ink-muted"><Spinner className="size-4" /> {copy.content.loading}</div> : html ? <article className="rich-content mt-8" dangerouslySetInnerHTML={{ __html: html }} /> : <p className="mt-8 text-ink-muted">{copy.content.notPublished}</p>}
    </div>
    <aside className="h-fit rounded-3xl border border-line bg-white p-6"><ContactForm type="contact" title="Napisz do nas" description="Odpowiemy najszybciej, jak to możliwe." /></aside>
  </section></main><SiteFooter /></div>;
}
