'use client';

import { useState } from 'react';
import { CalendarDays, Mail, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContactForm } from '@/components/contact-form';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { usePublicCopy, usePublicCopyReady } from '@/lib/use-public-copy';
import { usePublicPage } from '@/lib/use-public-page';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';

/** Treść zapasowa na wypadek niedostępnego API; normalnie nie jest używana. */
export const serviceFallbackContent = '<h2>Rower gotowy na kolejny kilometr</h2><p>Serwisujemy rowery Rexor, układy elektryczne oraz osprzęt mechaniczny. Każde zgłoszenie zaczynamy od oględzin i potwierdzenia zakresu prac.</p><h3>Zakres obsługi</h3><ul><li>diagnostyka napędu i instalacji elektrycznej,</li><li>regulacja hamulców, napędu i zawieszenia,</li><li>kontrola baterii, połączeń i oprogramowania,</li><li>przeglądy okresowe i przygotowanie do sezonu.</li></ul>';

/**
 * Treść dostarcza komponent serwerowy strony. Komponent nie dociąga jej sam,
 * bo pierwszy render pokazywałby wtedy tekst z kodu, a dopiero potem ten
 * z panelu — dokładnie to mignięcie, które było widać przy każdym wejściu.
 */
export function ServicePage({ content }: { content: string | null }) {
  const copy = usePublicCopy();
  const copyReady = usePublicCopyReady();
  const [showForm, setShowForm] = useState(false);
  const { page, loading } = usePublicPage('serwis', content ? { slug: 'serwis', title: 'Serwis', excerpt: null, content_html: content, hero_image_path: null, updated_at: '' } : undefined);
  const html = page?.content_html ?? content ?? serviceFallbackContent;
  // Tytuł i lead z panelu (zakładka „Strony") mają pierwszeństwo; puste pola
  // albo niedostępne API zostawiają teksty z zakładki „Teksty" (copy.service).
  // Szkielet, dopóki nie wiadomo, co pokazać - bez tego mignęłaby wartość
  // z builda, zanim dojedzie strona z API.
  const heroTitle = page?.title?.trim() ? page.title : copyReady ? copy.service.title : null;
  const heroSubtitle = page?.excerpt?.trim() ? page.excerpt : copyReady ? copy.service.subtitle : null;
  return <div className="flex min-h-screen flex-col"><SiteHeader /><main className="flex-1"><section className="bg-[#111] text-white"><div className="mx-auto grid max-w-[1480px] gap-10 px-4 py-16 sm:px-8 lg:grid-cols-[1fr_0.8fr] lg:px-12 lg:py-24"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-brand)]">{copyReady ? copy.service.eyebrow : <Skeleton aria-hidden="true" className="h-3 w-24 bg-white/15" />}</p><h1 className="mt-3 max-w-4xl text-5xl font-semibold tracking-[-0.06em] sm:text-7xl">{heroTitle ?? <Skeleton aria-hidden="true" className="h-12 w-2/3 bg-white/15 sm:h-16" />}</h1></div><div className="flex items-end"><p className="max-w-lg text-lg leading-relaxed text-white/58">{heroSubtitle ?? <Skeleton aria-hidden="true" className="h-5 w-full max-w-lg bg-white/15" />}</p></div></div></section><section className="mx-auto grid max-w-[1200px] gap-10 px-4 py-14 sm:px-8 lg:grid-cols-[1fr_320px] lg:py-20">{loading ? <div className="flex items-center gap-2 text-sm text-ink-muted"><Spinner className="size-4" /> {copy.content.loading}</div> : <article className="rich-content" dangerouslySetInnerHTML={{ __html: html }} />}<aside className="h-fit rounded-3xl bg-[var(--muted)] p-6"><Wrench className="size-7" /><h2 className="mt-8 text-2xl font-semibold tracking-tight">{copyReady ? copy.service.asideTitle : <Skeleton aria-hidden="true" className="h-7 w-28" />}</h2><p className="mt-3 text-sm leading-relaxed text-ink-muted">{copyReady ? copy.service.asideText : <Skeleton aria-hidden="true" className="h-4 w-full" />}</p>{showForm ? <div className="mt-6"><ContactForm type="service" /></div> : <Button onClick={() => setShowForm(true)} className="mt-6 h-11 w-full rounded-full bg-ink text-white"><Mail /> {copyReady ? copy.service.asideCta : <Skeleton aria-hidden="true" className="h-4 w-32" />}</Button>}<p className="mt-4 flex items-center gap-2 text-xs text-ink-subtle"><CalendarDays className="size-4" /> {copyReady ? copy.service.asideNote : <Skeleton aria-hidden="true" className="h-3 w-40" />}</p></aside></section></main><SiteFooter /></div>;
}
