'use client';

import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { bikeModels, formatPrice } from '@/lib/catalog';
import { usePublicCatalog } from '@/lib/use-public-catalog';

const Frame = ({ children }: { children: React.ReactNode }) => <div className="flex min-h-screen flex-col"><SiteHeader /><main className="flex-1">{children}</main><SiteFooter /></div>;

export function BikesPage() {
  // Ceny i zdjęcia pochodzą z katalogu API, bo cena "od" jest wyliczana z
  // cennika części, a nie wpisana w kodzie.
  const { models: bikeModels } = usePublicCatalog();
  return <Frame><section className="mx-auto max-w-[1480px] px-4 py-12 sm:px-8 lg:px-12 lg:py-20"><p className="eyebrow">Rowery Rexor</p><h1 className="mt-3 text-5xl font-semibold tracking-[-0.06em] sm:text-7xl">Trzy różne punkty wyjścia.</h1><div className="mt-10 grid gap-5 lg:grid-cols-3">{bikeModels.map((model) => <article key={model.id} className="relative overflow-hidden rounded-[28px] border border-line bg-white transition-shadow hover:shadow-[0_10px_34px_rgba(0,0,0,0.09)] focus-within:shadow-[0_10px_34px_rgba(0,0,0,0.09)]"><div className="aspect-[4/3] bg-[var(--muted)] p-5"><img src={model.image} alt={model.name} className="size-full object-contain mix-blend-multiply" /></div><div className="p-6"><span className="eyebrow">{model.category}</span><h2 className="mt-2 text-3xl font-semibold tracking-tight">{model.name}</h2><p className="mt-3 min-h-20 leading-relaxed text-ink-muted">{model.description}</p><div className="mt-5 flex items-center justify-between"><strong>{model.basePrice ? `od ${formatPrice(model.basePrice)}` : 'Cena w przygotowaniu'}</strong><Button render={<a href={model.available ? `/konfigurator?model=${model.id}` : '/serwis'} />} size="icon-lg" className="pick-card-hit rounded-full" aria-label={model.available ? `Konfiguruj ${model.name}` : `Zapytaj o ${model.name}`}><ArrowRight /></Button></div></div></article>)}</div></section></Frame>;
}

export function FramesPage() {
  const { models: bikeModels } = usePublicCatalog();
  const frames = [
    { model: bikeModels[0], facts: ['Karbon T700/T800', 'Skok ramy 170 mm', 'Koła 29 cali', 'Silnik M560'] },
    { model: bikeModels[1], facts: ['Karbon T700/T800', 'Damper 210×55', 'Łącznik 70 mm', 'Silnik M620 CAN'] },
    { model: bikeModels[2], facts: ['Karbon T700/T800', 'BSA 68 mm', 'Opony do 700×50', 'Mocowanie UDH'] },
  ];
  return <Frame><section className="mx-auto max-w-[1480px] px-4 py-12 sm:px-8 lg:px-12 lg:py-20"><p className="eyebrow">Ramy</p><h1 className="mt-3 max-w-4xl text-5xl font-semibold tracking-[-0.06em] sm:text-7xl">Geometria decyduje o charakterze.</h1><div className="mt-12 divide-y divide-line border-y border-line">{frames.map(({ model, facts }) => <article key={model.id} className="grid gap-6 py-8 md:grid-cols-[0.7fr_1fr_1fr] md:items-center"><img src={model.frameImage ?? model.gallery[1] ?? model.image} alt={`Rama ${model.name}`} className="aspect-[4/3] w-full rounded-2xl bg-[var(--muted)] object-contain mix-blend-multiply" /><div><span className="eyebrow">{model.category}</span><h2 className="mt-2 text-3xl font-semibold">{model.name.replace('Rexor ', '')}</h2><p className="mt-3 text-sm leading-relaxed text-ink-muted">{model.description}</p></div><ul className="grid grid-cols-2 gap-2">{facts.map((fact) => <li key={fact} className="rounded-xl bg-ink-wash p-3 text-sm font-medium">{fact}</li>)}</ul></article>)}</div></section></Frame>;
}

export function PartsPage() {
  const groups = [['Napęd elektryczny', 'Silniki przypisane do ramy, wyświetlacze i ładowarki.'], ['Zawieszenie', 'Widelce i dampery w wymiarach zgodnych z geometrią.'], ['Hamulce', 'Czterotłoczkowe zestawy i dopasowane tarcze.'], ['Napęd mechaniczny', 'Deore, CUES i Linkglide przygotowane do obciążeń e-MTB.'], ['Koła i opony', 'Koła Boost oraz ogumienie dobrane do terenu.'], ['Kokpit', 'Kierownice, mostki, gripy, sztyce i punkty kontaktu.']];
  return <Frame><section className="mx-auto max-w-[1480px] px-4 py-12 sm:px-8 lg:px-12 lg:py-20"><p className="eyebrow">Części</p><h1 className="mt-3 max-w-4xl text-5xl font-semibold tracking-[-0.06em] sm:text-7xl">Wybory, które naprawdę zmieniają jazdę.</h1><div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{groups.map(([name, text], index) => <article key={name} className="flex min-h-56 flex-col rounded-[24px] border border-line bg-white p-6"><span className="font-mono text-xs text-ink-subtle">{String(index + 1).padStart(2, '0')}</span><h2 className="mt-auto text-2xl font-semibold tracking-tight">{name}</h2><p className="mt-3 text-sm leading-relaxed text-ink-muted">{text}</p></article>)}</div><Button render={<a href="/konfigurator" />} className="mt-8 h-12 rounded-full bg-ink px-6 text-white">Dobierz części w konfiguratorze <ArrowRight data-icon="inline-end" /></Button></section></Frame>;
}
