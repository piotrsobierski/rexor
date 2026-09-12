'use client';

import { CalendarDays, Mail, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { usePublicCopy } from '@/lib/use-public-copy';
import { usePublicPage } from '@/lib/use-public-page';

/** Treść zapasowa na wypadek niedostępnego API; normalnie nie jest używana. */
export const serviceFallbackContent = '<h2>Rower gotowy na kolejny kilometr</h2><p>Serwisujemy rowery Rexor, układy elektryczne oraz osprzęt mechaniczny. Każde zgłoszenie zaczynamy od oględzin i potwierdzenia zakresu prac.</p><h3>Zakres obsługi</h3><ul><li>diagnostyka napędu i instalacji elektrycznej,</li><li>regulacja hamulców, napędu i zawieszenia,</li><li>kontrola baterii, połączeń i oprogramowania,</li><li>przeglądy okresowe i przygotowanie do sezonu.</li></ul>';

/**
 * Treść dostarcza komponent serwerowy strony. Komponent nie dociąga jej sam,
 * bo pierwszy render pokazywałby wtedy tekst z kodu, a dopiero potem ten
 * z panelu — dokładnie to mignięcie, które było widać przy każdym wejściu.
 */
export function ServicePage({ content, copy: initialCopy }: { content: string | null; copy?: unknown }) {
  const copy = usePublicCopy(initialCopy);
  const page = usePublicPage('serwis', content ? { slug: 'serwis', title: 'Serwis', excerpt: null, content_html: content, hero_image_path: null, updated_at: '' } : undefined);
  const html = page?.content_html ?? content ?? serviceFallbackContent;
  return <div className="flex min-h-screen flex-col"><SiteHeader /><main className="flex-1"><section className="bg-[#111] text-white"><div className="mx-auto grid max-w-[1480px] gap-10 px-4 py-16 sm:px-8 lg:grid-cols-[1fr_0.8fr] lg:px-12 lg:py-24"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-brand)]">{copy.service.eyebrow}</p><h1 className="mt-3 max-w-4xl text-5xl font-semibold tracking-[-0.06em] sm:text-7xl">{copy.service.title}</h1></div><div className="flex items-end"><p className="max-w-lg text-lg leading-relaxed text-white/58">{copy.service.subtitle}</p></div></div></section><section className="mx-auto grid max-w-[1200px] gap-10 px-4 py-14 sm:px-8 lg:grid-cols-[1fr_320px] lg:py-20"><article className="rich-content" dangerouslySetInnerHTML={{ __html: html }} /><aside className="h-fit rounded-3xl bg-[var(--muted)] p-6"><Wrench className="size-7" /><h2 className="mt-8 text-2xl font-semibold tracking-tight">{copy.service.asideTitle}</h2><p className="mt-3 text-sm leading-relaxed text-ink-muted">{copy.service.asideText}</p><Button className="mt-6 h-11 w-full rounded-full bg-ink text-white"><Mail /> {copy.service.asideCta}</Button><p className="mt-4 flex items-center gap-2 text-xs text-ink-subtle"><CalendarDays className="size-4" /> {copy.service.asideNote}</p></aside></section></main><SiteFooter /></div>;
}
