'use client';

import { useState } from 'react';
import { ArrowRight, BatteryCharging, Gauge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { formatPrice, type BikeModel } from '@/lib/catalog';
import { usePublicCatalog, type PublicCatalogData } from '@/lib/use-public-catalog';

const Frame = ({ children }: { children: React.ReactNode }) => <div className="flex min-h-screen flex-col"><SiteHeader /><main className="flex-1">{children}</main><SiteFooter /></div>;

function BikePickCard({ model }: { model: BikeModel }) {
  const productHref = `/rowery/${model.categorySlug}/${model.id}`;
  const configHref = model.available ? `/konfigurator?model=${model.id}` : '/serwis';

  return (
    <article className="overflow-hidden rounded-[28px] border border-line bg-white transition-shadow hover:shadow-[0_10px_34px_rgba(0,0,0,0.09)] focus-within:shadow-[0_10px_34px_rgba(0,0,0,0.09)] flex flex-col justify-between">
      <div>
        <a href={productHref} aria-label={`Poznaj ${model.name}`} className="block text-inherit no-underline">
          <div className="aspect-[4/3] bg-[var(--muted)] p-5">
            <img src={model.image} alt={model.name} className="size-full object-contain mix-blend-multiply transition-transform duration-500 hover:scale-[1.03]" />
          </div>
          <div className="p-6 pb-2">
            <span className="eyebrow">{model.category}</span>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">{model.name}</h2>
            <p className="mt-3 min-h-16 leading-relaxed text-ink-muted">{model.description}</p>
          </div>
        </a>
      </div>
      <div className="p-6 pt-2">
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-line/60 pt-4">
          <strong>{model.basePrice ? `od ${formatPrice(model.basePrice)}` : 'Cena w przygotowaniu'}</strong>
          <div className="flex items-center gap-2">
            <Button render={<a href={productHref} />} variant="ghost" size="sm" className="rounded-full text-xs">
              Opis
            </Button>
            <Button render={<a href={configHref} />} size="sm" className="rounded-full bg-ink text-white hover:bg-black text-xs px-3">
              {model.available ? 'Konfiguruj' : 'Zapytaj'} <ArrowRight data-icon="inline-end" className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

export function BikesPage({ catalog }: { catalog?: PublicCatalogData }) {
  // Ceny i zdjęcia pochodzą z katalogu API, bo cena "od" jest wyliczana z
  // cennika części, a nie wpisana w kodzie. Katalog przychodzi z serwera,
  // żeby pierwszy render nie pokazywał danych zapasowych.
  const { models } = usePublicCatalog(catalog);
  return <Frame><section className="mx-auto max-w-[1480px] px-4 py-12 sm:px-8 lg:px-12 lg:py-20"><p className="eyebrow">Rowery Rexor</p><h1 className="mt-3 text-5xl font-semibold tracking-[-0.06em] sm:text-7xl">Trzy różne punkty wyjścia.</h1><div className="mt-10 grid gap-5 lg:grid-cols-3">{models.map((model) => <BikePickCard key={model.id} model={model} />)}</div></section></Frame>;
}

export function CategoryPage({ catalog, categorySlug }: { catalog?: PublicCatalogData; categorySlug: string }) {
  const { models, categories } = usePublicCatalog(catalog);
  const category = categories.find((item) => item.slug === categorySlug);
  const categoryModels = models.filter((model) => model.categorySlug === categorySlug);

  if (!category) return <Frame><section className="mx-auto max-w-[1480px] px-4 py-12 sm:px-8 lg:px-12 lg:py-20"><p className="eyebrow">Kategoria</p><h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em]">Nie znaleziono tej kategorii.</h1><Button render={<a href="/rowery" />} variant="outline" className="mt-6 rounded-full">Zobacz wszystkie rowery <ArrowRight data-icon="inline-end" /></Button></section></Frame>;

  return <Frame><section className="mx-auto max-w-[1480px] px-4 py-12 sm:px-8 lg:px-12 lg:py-20">
    <p className="eyebrow">Kategoria</p>
    <h1 className="mt-3 text-5xl font-semibold tracking-[-0.06em] sm:text-7xl">{category.name}</h1>
    {category.short_description && <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-muted">{category.short_description}</p>}
    {category.description_html && <div className="rich-content mt-4 max-w-2xl text-sm leading-relaxed text-ink-muted" dangerouslySetInnerHTML={{ __html: category.description_html }} />}

    {categoryModels.length === 0
      ? <p className="mt-10 rounded-2xl bg-[var(--muted)] p-6 text-sm text-ink-muted">Ta kategoria nie ma jeszcze przypisanych modeli. Wkrótce się to zmieni.</p>
      : <div className="mt-10 grid gap-5 lg:grid-cols-3">{categoryModels.map((model) => <BikePickCard key={model.id} model={model} />)}</div>}
  </section></Frame>;
}

export function BikeModelPage({ catalog, modelSlug }: { catalog?: PublicCatalogData; modelSlug: string }) {
  const { models, categories } = usePublicCatalog(catalog);
  const normalizedSlug = modelSlug.toLowerCase();
  const model = models.find((m) => m.id === normalizedSlug || m.name.toLowerCase().includes(normalizedSlug) || (normalizedSlug.includes('e82') && m.id === 'e82') || (normalizedSlug.includes('e55') && m.id === 'e55') || (normalizedSlug.includes('cfr707') && m.id === 'cfr707')) ?? models[0];
  const [selectedPhoto, setSelectedPhoto] = useState(0);

  if (!model) {
    return <Frame><section className="mx-auto max-w-[1480px] px-4 py-12 sm:px-8 lg:px-12 lg:py-20"><p className="eyebrow">Rower</p><h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em]">Nie znaleziono takiego modelu.</h1><Button render={<a href="/rowery" />} variant="outline" className="mt-6 rounded-full">Zobacz wszystkie rowery <ArrowRight data-icon="inline-end" /></Button></section></Frame>;
  }

  const category = categories.find((c) => c.slug === model.categorySlug);
  const activeImage = model.gallery[selectedPhoto] ?? model.image;
  const configHref = model.available ? `/konfigurator?model=${model.id}` : '/serwis';
  const ctaLabel = model.available ? 'Konfiguruj ten model' : 'Zapytaj o dostępność';

  return (
    <Frame>
      <section className="mx-auto max-w-[1480px] px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
          <a href="/" className="hover:text-ink transition-colors">Rexor</a>
          <span>/</span>
          <a href="/rowery" className="hover:text-ink transition-colors">Rowery</a>
          <span>/</span>
          <a href={`/rowery/${model.categorySlug}`} className="hover:text-ink transition-colors">{category?.name ?? model.category}</a>
          <span>/</span>
          <span className="text-ink">{model.name}</span>
        </nav>

        {/* Hero Section */}
        <div className="mt-8 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-14">
          {/* Gallery showcase */}
          <div className="space-y-4">
            <div className="aspect-[4/3] overflow-hidden rounded-[32px] bg-[var(--muted)] p-6 sm:p-10">
              <img
                src={activeImage}
                alt={model.name}
                className="size-full object-contain mix-blend-multiply transition-all duration-300"
              />
            </div>
            {model.gallery.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {model.gallery.map((img, idx) => (
                  <button
                    key={img}
                    type="button"
                    onClick={() => setSelectedPhoto(idx)}
                    className={`aspect-[4/3] h-20 shrink-0 overflow-hidden rounded-2xl border-2 bg-[var(--muted)] p-2 transition-all ${
                      selectedPhoto === idx ? 'border-ink shadow-sm' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="size-full object-contain mix-blend-multiply" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details & CTA */}
          <div className="flex flex-col justify-between">
            <div>
              <span className="eyebrow">{model.eyebrow}</span>
              <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] sm:text-6xl">{model.name}</h1>
              <p className="mt-4 text-lg leading-relaxed text-ink-muted">{model.description}</p>

              <div className="mt-6 flex flex-wrap gap-2">
                {model.motor && (
                  <span className="inline-flex items-center gap-2 rounded-xl bg-ink-wash px-3.5 py-2 text-sm font-medium text-ink">
                    <Gauge className="size-4 text-ink-subtle" /> {model.motor}
                  </span>
                )}
                {model.battery && (
                  <span className="inline-flex items-center gap-2 rounded-xl bg-ink-wash px-3.5 py-2 text-sm font-medium text-ink">
                    <BatteryCharging className="size-4 text-ink-subtle" /> {model.battery}
                  </span>
                )}
                <span className="inline-flex items-center gap-2 rounded-xl bg-ink-wash px-3.5 py-2 text-sm font-medium text-ink">
                  Kategoria: {model.category}
                </span>
              </div>

              <div className="mt-8 rounded-3xl border border-line bg-[var(--muted)]/50 p-6">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-ink-subtle">Cena wyjściowa</span>
                <p className="mt-1 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                  {model.basePrice ? `od ${formatPrice(model.basePrice)}` : 'Wycena w przygotowaniu'}
                </p>
                <p className="mt-2 text-xs text-ink-muted">
                  Cena brutto wyliczana z sumy ramy, wybranego napędu, baterii, części domyślnych i montażu.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button
                    render={<a href={configHref} />}
                    className="h-12 flex-1 rounded-full bg-ink px-6 text-white hover:bg-black font-medium"
                  >
                    {ctaLabel} <ArrowRight data-icon="inline-end" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rich Description Section */}
        <div className="mt-16 border-t border-line pt-12 lg:mt-24 lg:pt-16">
          <div className="max-w-4xl">
            <p className="eyebrow">Opis i specyfikacja</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">Poznaj {model.name}</h2>
            {model.descriptionHtml ? (
              <div
                className="rich-content mt-8"
                dangerouslySetInnerHTML={{ __html: model.descriptionHtml }}
              />
            ) : (
              <p className="mt-6 text-base leading-relaxed text-ink-muted">{model.description}</p>
            )}
          </div>
        </div>

        {/* Bottom Banner */}
        <div className="mt-16 rounded-[32px] bg-ink p-8 text-white sm:p-12 lg:mt-24">
          <div className="mx-auto flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-brand)]">Konfigurator Rexor</p>
              <h3 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Zbuduj swój {model.name}</h3>
              <p className="mt-2 max-w-xl text-white/60">
                Wybierz rozmiar, osprzęt, baterię i dodatki pod swój styl jazdy oraz planowane trasy.
              </p>
            </div>
            <Button
              render={<a href={configHref} />}
              className="h-12 rounded-full bg-[var(--accent-brand)] px-8 font-semibold text-[var(--accent-brand-foreground)] hover:brightness-95"
            >
              {ctaLabel} <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        </div>
      </section>
    </Frame>
  );
}

export function FramesPage({ catalog }: { catalog?: PublicCatalogData }) {
  const { models: bikeModels } = usePublicCatalog(catalog);
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
