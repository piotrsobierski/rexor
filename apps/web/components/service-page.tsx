import { CalendarDays, Mail, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';

/** Treść zapasowa na wypadek niedostępnego API; normalnie nie jest używana. */
export const serviceFallbackContent = '<h2>Rower gotowy na kolejny kilometr</h2><p>Serwisujemy rowery Rexor, układy elektryczne oraz osprzęt mechaniczny. Każde zgłoszenie zaczynamy od oględzin i potwierdzenia zakresu prac.</p><h3>Zakres obsługi</h3><ul><li>diagnostyka napędu i instalacji elektrycznej,</li><li>regulacja hamulców, napędu i zawieszenia,</li><li>kontrola baterii, połączeń i oprogramowania,</li><li>przeglądy okresowe i przygotowanie do sezonu.</li></ul>';

/**
 * Treść dostarcza komponent serwerowy strony. Komponent nie dociąga jej sam,
 * bo pierwszy render pokazywałby wtedy tekst z kodu, a dopiero potem ten
 * z panelu — dokładnie to mignięcie, które było widać przy każdym wejściu.
 */
export function ServicePage({ content }: { content: string }) {
  return <div className="flex min-h-screen flex-col"><SiteHeader /><main className="flex-1"><section className="bg-[#111] text-white"><div className="mx-auto grid max-w-[1480px] gap-10 px-4 py-16 sm:px-8 lg:grid-cols-[1fr_0.8fr] lg:px-12 lg:py-24"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-brand)]">Serwis Rexor</p><h1 className="mt-3 max-w-4xl text-5xl font-semibold tracking-[-0.06em] sm:text-7xl">Pewność przed kolejną trasą.</h1></div><div className="flex items-end"><p className="max-w-lg text-lg leading-relaxed text-white/58">Diagnostyka, regulacja i opieka nad rowerem przed sezonem oraz po wymagających kilometrach.</p></div></div></section><section className="mx-auto grid max-w-[1200px] gap-10 px-4 py-14 sm:px-8 lg:grid-cols-[1fr_320px] lg:py-20"><article className="rich-content" dangerouslySetInnerHTML={{ __html: content }} /><aside className="h-fit rounded-3xl bg-[var(--muted)] p-6"><Wrench className="size-7" /><h2 className="mt-8 text-2xl font-semibold tracking-tight">Zgłoś rower</h2><p className="mt-3 text-sm leading-relaxed text-ink-muted">Opisz model i objawy. Wrócimy z proponowanym terminem oraz zakresem.</p><Button className="mt-6 h-11 w-full rounded-full bg-ink text-white"><Mail /> Napisz do serwisu</Button><p className="mt-4 flex items-center gap-2 text-xs text-ink-subtle"><CalendarDays className="size-4" /> Termin potwierdzamy indywidualnie</p></aside></section></main><SiteFooter /></div>;
}
