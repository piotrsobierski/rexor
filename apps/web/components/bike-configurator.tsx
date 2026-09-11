'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowRight, BatteryCharging, Bike, Check, Gauge, ShieldCheck, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from '@/components/ui/carousel';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { CUSTOMER_SUPPLIED_SKU, bikeModels, formatPrice, type BikeModel, type OptionGroup } from '@/lib/catalog';
import { computeBatteryEstimates, computeRangeEstimates } from '@/lib/battery';
import { configurationPricing, groupDefaultPrice, type Selections } from '@/lib/pricing';
import { usePublicCatalog, type PublicCatalogData } from '@/lib/use-public-catalog';
type ContactForm = { customerName: string; customerEmail: string; customerPhone: string; notes: string; privacyAccepted: boolean };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8081/api';
const defaultBatteryCode = (model: BikeModel): string => (model.batteries.find((item) => item.isDefault) ?? model.batteries[0])?.code ?? '';
const formatEnergy = (wh: number) => `${new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 }).format(wh)} Wh`;
// Grupa bez pozycji katalogowej, ale z dopuszczoną częścią klienta (np. damper
// E55 w jedynym zgodnym wymiarze) startuje z wyborem „własna część”.
const initialSelections = (model: BikeModel): Selections => Object.fromEntries(model.groups
  .map((group) => [group.slug, group.defaultSku ?? (group.customerPartAllowed ? CUSTOMER_SUPPLIED_SKU : null)] as const)
  .filter((entry): entry is readonly [string, string] => entry[1] !== null));
const modelSlugs: Record<BikeModel['id'], string> = { e82: 'e82-wielichowo', e55: 'e55-reference', cfr707: 'cfr707' };
const defaultSizeCode = (model: BikeModel): string =>
  (model.sizes.find((item) => item.code === 'M') ?? model.sizes[0])?.code ?? '';

/**
 * Lista wyborów w grupie. Pozycja „własna część” nie jest produktem w katalogu:
 * jest trybem grupy z własną wartością rozliczeniową.
 */
function groupChoices(group: OptionGroup) {
  const catalogChoices = group.options
    .filter((option) => option.configurable || option.isDefault)
    .map((option) => ({ sku: option.sku, name: option.name, detail: option.detail, price: option.price, customerSupplied: false }));
  if (!group.customerPartAllowed) return catalogChoices;
  return [...catalogChoices, {
    sku: CUSTOMER_SUPPLIED_SKU,
    name: group.customerPartLabel,
    detail: 'Zgodność potwierdzi Rexor',
    price: group.customerPartGrossPrice,
    customerSupplied: true,
  }];
}

export function BikeConfigurator({ catalog }: { catalog?: PublicCatalogData }) {
  const { models } = usePublicCatalog(catalog);
  const [modelId, setModelId] = useState<BikeModel['id']>('e82');
  const [size, setSize] = useState('M');
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitState, setSubmitState] = useState<'idle' | 'saving' | 'error'>('idle');
  const [submitError, setSubmitError] = useState('');
  const [contact, setContact] = useState<ContactForm>({ customerName: '', customerEmail: '', customerPhone: '', notes: '', privacyAccepted: false });
  const [selectionsByModel, setSelectionsByModel] = useState<Record<string, Selections>>(() => Object.fromEntries(bikeModels.map((model) => [model.id, initialSelections(model)])));
  const [touchedModels, setTouchedModels] = useState<Record<string, true>>({});
  const [batteryByModel, setBatteryByModel] = useState<Record<string, string>>(() => Object.fromEntries(bikeModels.map((model) => [model.id, defaultBatteryCode(model)])));
  const model = models.find((item) => item.id === modelId) ?? models[0];
  const selections = selectionsByModel[model.id] ?? {};
  // Pakiet domyślny wyznacza cenę bazową modelu, więc każdy inny wybór liczy się
  // jako różnica względem niego.
  const defaultBattery = model.batteries.find((item) => item.isDefault) ?? model.batteries[0];
  const battery = model.batteries.find((item) => item.code === batteryByModel[model.id]) ?? defaultBattery;
  const batteryLabel = battery
    ? (battery.name.includes('Wh') ? battery.name : `${battery.name} · ${formatEnergy(battery.energyWh)}`)
    : model.battery;

  const selectedSize = model.sizes.find((item) => item.code === size) ?? model.sizes[0] ?? null;
  // Cena liczona z tej samej formuły co API: rama, rozmiar, bateria, części,
  // składanie i narzut. Różnica względem ceny "od" jest tylko informacją.
  const pricing = useMemo(() => {
    const result = configurationPricing(model, selections, battery ?? null, selectedSize);
    const delta = result.total !== null && model.basePrice !== null ? Math.round((result.total - model.basePrice) * 100) / 100 : 0;
    return { total: result.total, delta };
  }, [battery, model, selectedSize, selections]);

  // Grupy opcji przychodzą z API, więc domyślne wybory ustawiamy po ich
  // wczytaniu — ale tylko dla modeli, których klient jeszcze nie ruszył.
  useEffect(() => {
    setSelectionsByModel((current) => {
      const next = { ...current };
      let changed = false;
      for (const item of models) {
        if (touchedModels[item.id] || item.groups.length === 0) continue;
        const defaults = initialSelections(item);
        if (JSON.stringify(next[item.id] ?? {}) === JSON.stringify(defaults)) continue;
        next[item.id] = defaults;
        changed = true;
      }
      return changed ? next : current;
    });
    setBatteryByModel((current) => {
      const next = { ...current };
      let changed = false;
      for (const item of models) {
        if (next[item.id] || item.batteries.length === 0) continue;
        next[item.id] = defaultBatteryCode(item);
        changed = true;
      }
      return changed ? next : current;
    });
  }, [models, touchedModels]);

  useEffect(() => {
    if (size === '' && model.sizes.length > 0) setSize(defaultSizeCode(model));
  }, [model, size]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const resumeToken = query.get('resume');
    if (resumeToken) {
      fetch(`${API_BASE}/configurations/resume/${resumeToken}`)
        .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); return data; })
        .then(({ configuration }) => {
          const nextModel = models.find((item) => modelSlugs[item.id] === configuration.model.slug && item.available);
          if (!nextModel) return;
          const restored = initialSelections(nextModel);
          for (const item of configuration.items as Array<{ groupSlug: string; sku: string }>) {
            const group = nextModel.groups.find((candidate) => candidate.slug === item.groupSlug);
            if (!group) continue;
            if (groupChoices(group).some((choice) => choice.sku === item.sku)) restored[group.slug] = item.sku;
          }
          setTouchedModels((current) => ({ ...current, [nextModel.id]: true }));
          setModelId(nextModel.id);
          setSize(configuration.size.code);
          const restoredBattery = configuration.battery?.code as string | undefined;
          if (restoredBattery && nextModel.batteries.some((item) => item.code === restoredBattery)) {
            setBatteryByModel((current) => ({ ...current, [nextModel.id]: restoredBattery }));
          }
          setSelectionsByModel((current) => ({ ...current, [nextModel.id]: restored }));
        })
        .catch(() => setSubmitError('Nie udało się odtworzyć zapisanej konfiguracji.'));
      return;
    }
    const requested = query.get('model') as BikeModel['id'] | null;
    if (requested && models.some((item) => item.id === requested)) selectModel(requested);
  // Query is read once when the configurator opens.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!carouselApi) return;
    const update = () => setGalleryIndex(carouselApi.selectedScrollSnap());
    update();
    carouselApi.on('select', update);
    return () => { carouselApi.off('select', update); };
  }, [carouselApi]);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const report = () => undefined;
    try {
      void Promise.resolve(context.registerTool({
        name: 'configure_rexor_bike', title: 'Skonfiguruj rower Rexor',
        description: 'Ustaw model, rozmiar i dostępne opcje w widocznym konfiguratorze. Nie wysyła zapytania.',
        inputSchema: { type: 'object', properties: { model: { type: 'string', enum: ['e82', 'e55'] }, size: { type: 'string' }, battery: { type: 'string' }, options: { type: 'object', additionalProperties: { type: 'string' } } }, required: ['model'], additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(input: unknown) {
          const value = input as { model?: BikeModel['id']; size?: string; battery?: string; options?: Record<string, string> };
          const next = models.find((item) => item.id === value.model && item.available);
          if (!next) throw new Error('Nieobsługiwany model. Dostępne: e82, e55.');
          selectModel(next.id);
          if (value.size && next.sizes.some((item) => item.code === value.size)) setSize(value.size);
          if (value.battery && next.batteries.some((item) => item.code === value.battery)) setBatteryByModel((current) => ({ ...current, [next.id]: value.battery! }));
          if (value.options) {
            setTouchedModels((current) => ({ ...current, [next.id]: true }));
            setSelectionsByModel((current) => ({ ...current, [next.id]: { ...current[next.id], ...value.options } }));
          }
          return { status: 'staged', model: next.id, size: value.size ?? defaultSizeCode(next) };
        },
      }, { signal: lifecycle.signal })).catch(report);
      void Promise.resolve(context.registerTool({
        name: 'read_rexor_configuration', title: 'Odczytaj konfigurację Rexor', description: 'Zwraca aktualnie wybrany model, rozmiar, opcje i cenę brutto.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute() { return { model: model.id, size, battery: battery?.code ?? null, options: selections, totalGross: pricing.total, currency: 'PLN' }; },
      }, { signal: lifecycle.signal })).catch(report);
    } catch { return; }
    return () => lifecycle.abort();
  }, [battery?.code, model.id, models, pricing.total, selections, size]);

  function selectModel(nextId: BikeModel['id']) {
    const next = models.find((item) => item.id === nextId) ?? models[0];
    setModelId(nextId);
    setSize(defaultSizeCode(next));
    setGalleryIndex(0);
    carouselApi?.scrollTo(0, true);
  }

  function choose(groupSlug: string, sku: string) {
    setTouchedModels((current) => ({ ...current, [model.id]: true }));
    setSelectionsByModel((current) => ({ ...current, [model.id]: { ...current[model.id], [groupSlug]: sku } }));
  }

  async function submitConfiguration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!contact.privacyAccepted) { setSubmitError('Zaznacz zgodę na kontakt i przetwarzanie danych.'); setSubmitState('error'); return; }
    setSubmitState('saving'); setSubmitError('');
    try {
      // Wysyłamy tylko wybory klienta. Elementy stałe i cena wynikają z bazy,
      // więc konfigurator nie przekazuje żadnej kwoty.
      const selectionsPayload = Object.fromEntries(model.groups
        .filter((group) => group.selectionMode !== 'fixed' && selections[group.slug])
        .map((group) => [group.slug, selections[group.slug]]));
      const response = await fetch(`${API_BASE}/configurations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelSlug: modelSlugs[model.id],
          sizeCode: size,
          batteryCode: battery?.code ?? '',
          selections: selectionsPayload,
          customerName: contact.customerName,
          customerEmail: contact.customerEmail,
          customerPhone: contact.customerPhone,
          customerNotes: contact.notes,
          privacyConsent: contact.privacyAccepted,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Nie udało się zapisać konfiguracji.');
      window.location.href = result.shareUrl;
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Nie udało się zapisać konfiguracji.');
      setSubmitState('error');
    }
  }

  return <div className="flex min-h-screen flex-col bg-background text-foreground">
    <SiteHeader />
    <main className="flex-1">
      <section className="mx-auto max-w-[1480px] px-4 pb-3 pt-7 sm:px-8 sm:pt-10 lg:px-12">
        <div className="mb-5 flex items-end justify-between gap-4"><div><p className="eyebrow">Wybierz bazę projektu</p><h1 className="mt-2 text-[clamp(2rem,5vw,4.8rem)] font-semibold leading-[0.94] tracking-[-0.055em]">Rower skrojony<br className="hidden sm:block" /> pod Twój teren.</h1></div><p className="hidden max-w-sm text-right text-base leading-relaxed text-ink-muted xl:block">Dobieraj komponenty, obserwuj cenę i wróć do swojego projektu przez prywatny link.</p></div>
        <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0">
          {models.map((item) => { const active = item.id === model.id; return <button key={item.id} type="button" onClick={() => selectModel(item.id)} className={`pick-card focus-ring min-w-[78vw] snap-center sm:min-w-0 ${active ? 'pick-card-active' : ''}`} aria-pressed={active}><span className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">{item.category}</span><span className={`grid size-6 place-items-center rounded-full border ${active ? 'border-ink bg-ink text-white' : 'border-line-strong'}`}>{active && <Check className="size-3.5" />}</span></span><span className="mt-1 text-xl font-semibold tracking-tight">{item.name}</span><span className="mt-1 text-sm text-ink-muted">{item.basePrice ? `od ${formatPrice(item.basePrice)}` : 'cena w przygotowaniu'}</span></button>; })}
        </div>
      </section>

      <section className="mx-auto grid max-w-[1480px] gap-4 px-4 pb-20 sm:px-8 lg:grid-cols-[minmax(0,1.32fr)_minmax(380px,0.68fr)] lg:px-12">
        <div className="lg:sticky lg:top-[88px] lg:self-start">
          <div className="stage-card">
            <div className="stage-bar justify-between border-b border-line">
              <div>
                <p className="eyebrow">{model.eyebrow}</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">{model.name}</h2>
              </div>
              <span className="ml-auto rounded-full bg-ink-wash px-3 py-1.5 text-xs font-semibold tabular-nums text-ink-muted">{galleryIndex + 1} / {model.gallery.length}</span>
            </div>
            <Carousel key={model.id} setApi={setCarouselApi} opts={{ loop: model.gallery.length > 1 }} aria-label={`Zdjęcia modelu ${model.name}`}>
              <CarouselContent className="ml-0">
                {model.gallery.map((image, index) => <CarouselItem key={image} className="pl-0">
                  <div className="stage-media p-4 sm:p-8">
                    <img src={image} alt={`${model.name} — zdjęcie ${index + 1}`} loading={index === 0 ? 'eager' : 'lazy'} />
                  </div>
                </CarouselItem>)}
              </CarouselContent>
              {model.gallery.length > 1 && <><CarouselPrevious size="icon-lg" className="left-3 z-20 border-line bg-surface/90 shadow-md hover:bg-surface sm:left-5" /><CarouselNext size="icon-lg" className="right-3 z-20 border-line bg-surface/90 shadow-md hover:bg-surface sm:right-5" /></>}
            </Carousel>
            <div className="stage-bar border-t border-line">
              <span className="spec-pill"><Gauge /> {model.motor}</span>
              <span className="spec-pill"><BatteryCharging /> {batteryLabel}</span>
            </div>
          </div>
          {(model.descriptionHtml || model.description) && (
            <details className="mt-4 rounded-[28px] border border-line bg-white p-5 sm:p-6" open>
              <summary className="cursor-pointer text-base font-semibold tracking-tight text-ink flex items-center justify-between">
                <span>O modelu {model.name}</span>
                <span className="text-xs font-normal text-ink-muted">Opis i specyfikacja</span>
              </summary>
              <div className="rich-content mt-4 border-t border-line pt-4 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: model.descriptionHtml || model.description }} />
            </details>
          )}
        </div>

        <aside className="rounded-[28px] border border-line bg-white p-5 sm:p-7 lg:p-8">
          <div className="flex items-start justify-between gap-5"><div><p className="eyebrow">Twój projekt</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">Konfiguracja {model.name.replace('Rexor ', '')}</h2></div><span className="rounded-full bg-[var(--accent-brand)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em]">Brutto</span></div>
          <Progress value={model.available ? 72 : 12} className="mt-5 h-1.5 bg-ink-wash [&>div]:bg-ink" />
          {!model.available ? <div className="mt-8 rounded-3xl bg-ink p-6 text-white"><Bike className="size-8 text-[var(--accent-brand)]" /><h3 className="mt-8 text-2xl font-semibold">Konfiguracja w przygotowaniu</h3><p className="mt-3 leading-relaxed text-white/64">Geometria i zdjęcia CFR707 są już gotowe. Uzupełniamy konkretne komponenty oraz cenę modelu.</p><Button render={<a href="/serwis" />} className="mt-6 w-full rounded-full bg-white text-ink hover:bg-white/90">Zapytaj o CFR707 <ArrowRight data-icon="inline-end" /></Button></div> : <>
            <section className="config-section"><div className="section-heading"><div><span>01</span><h3>Rozmiar ramy</h3></div><p>Dopasowanie potwierdzimy przed zamówieniem.</p></div><RadioGroup value={size} onValueChange={setSize} className="grid grid-cols-3 gap-2">{model.sizes.map((item) => <label key={item.code} className={`size-choice focus-ring ${size === item.code ? 'size-choice-active' : ''}`}><RadioGroupItem value={item.code} className="choice-input" /><span>{item.code}</span>{item.priceDelta !== 0 && <span className="text-xs text-ink-muted tabular-nums">+{formatPrice(item.priceDelta)}</span>}</label>)}</RadioGroup></section>
            {model.batteries.length > 0 && <section className="config-section">
              <div className="section-heading"><div><span>02</span><h3>Bateria</h3></div><p>Pakiet dobrany do ramy i silnika. Pojemność zmienia zasięg i masę roweru.</p></div>
              <RadioGroup value={battery?.code ?? ''} onValueChange={(value) => setBatteryByModel((current) => ({ ...current, [model.id]: value }))} className="gap-2">
                {model.batteries.map((item) => { const selected = battery?.code === item.code; const delta = item.grossPrice - (defaultBattery?.grossPrice ?? item.grossPrice); return <label key={item.code} className={`option-choice focus-ring ${selected ? 'option-choice-active' : ''}`}>
                  <RadioGroupItem value={item.code} className="choice-input" />
                  <span className={`choice-indicator ${selected ? 'choice-indicator-active' : ''}`}>{selected && <Check className="size-3.5" />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 font-semibold">{item.name}{item.isDefault && <span className="rounded bg-ink-wash px-1.5 py-0.5 text-[0.68rem] uppercase tracking-wide text-ink-subtle">W standardzie</span>}</span>
                    <span className="mt-0.5 block text-sm text-ink-muted">
                      {item.shortLabel?.includes('Wh') ? item.shortLabel : `${item.shortLabel ? `${item.shortLabel} · ` : ''}${formatEnergy(item.energyWh)}`}
                      {(() => {
                        const est = computeBatteryEstimates(item);
                        return est.estimatedTotalPackWeightKg > 0 ? ` · ~${est.estimatedTotalPackWeightKg.toFixed(1).replace('.', ',')} kg` : '';
                      })()}
                    </span>
                  </span>
                  <span className={`shrink-0 text-sm font-semibold tabular-nums ${delta === 0 ? 'text-ink-subtle' : ''}`}>{delta === 0 ? 'w cenie' : `${delta > 0 ? '+' : '−'}${formatPrice(Math.abs(delta))}`}</span>
                </label>; })}
              </RadioGroup>

              {battery && battery.energyWh > 0 && (
                <div className="mt-3.5 rounded-2xl border border-line bg-[#fafbfa] p-4 text-ink">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line/70 pb-2.5">
                    <div>
                      <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink">
                        <Zap className="size-3.5 text-amber-600" />
                        Szacowane zasięgi ({formatEnergy(battery.energyWh)})
                      </h4>
                      <p className="mt-0.5 text-[11px] text-ink-muted">
                        Wyliczone na żywo w oparciu o typowe zużycie energii w zróżnicowanych warunkach.
                      </p>
                    </div>
                    <span className="rounded-md bg-white border border-line px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-ink">
                      {battery.energyWh} Wh
                    </span>
                  </div>

                  <div className="mt-2.5 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-[11px] text-ink-subtle">
                          <th className="pb-1.5 font-medium">Tryb / warunki</th>
                          <th className="pb-1.5 font-medium text-center">Typowe zużycie</th>
                          <th className="pb-1.5 text-right font-semibold text-ink">Estymowany zasięg</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line/60">
                        {computeRangeEstimates(battery.energyWh).map((row) => (
                          <tr key={row.mode + row.condition} className="group">
                            <td className="py-2 pr-2">
                              <strong className="font-semibold text-ink">{row.mode}</strong>
                              <span className="block text-[11px] text-ink-muted">{row.condition}</span>
                            </td>
                            <td className="py-2 px-2 text-center font-mono text-[11px] text-ink-muted">
                              {row.consumptionLabel}
                            </td>
                            <td className="py-2 pl-2 text-right">
                              <span className="inline-block rounded-md bg-emerald-50 px-2 py-0.5 font-semibold tabular-nums text-emerald-900 group-hover:bg-emerald-100">
                                {row.rangeMinKm}–{row.rangeMaxKm} km
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>}
            {model.groups.filter((group) => group.selectionMode !== 'fixed').map((group, groupIndex) => {
              const choices = groupChoices(group);
              const defaultPrice = groupDefaultPrice(group);
              return <section className="config-section" key={group.slug}>
                <div className="section-heading"><div><span>{String(groupIndex + (model.batteries.length > 0 ? 3 : 2)).padStart(2, '0')}</span><h3>{group.name}</h3></div><p>{group.helper}</p></div>
                <RadioGroup value={selections[group.slug] ?? ''} onValueChange={(value) => choose(group.slug, value)} className="gap-2">
                  {choices.map((choice) => { const selected = selections[group.slug] === choice.sku; const delta = choice.price === null ? null : choice.price - defaultPrice; return <label key={choice.sku} className={`option-choice focus-ring ${selected ? 'option-choice-active' : ''}`}>
                    <RadioGroupItem value={choice.sku} className="choice-input" />
                    <span className={`choice-indicator ${selected ? 'choice-indicator-active' : ''}`}>{selected && <Check className="size-3.5" />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2 font-semibold">{choice.name}{choice.customerSupplied && <span className="rounded bg-ink-wash px-1.5 py-0.5 text-[0.68rem] uppercase tracking-wide text-ink-muted">Twoja część</span>}</span>
                      <span className="mt-0.5 block text-sm text-ink-muted">{choice.detail}</span>
                    </span>
                    <span className={`shrink-0 text-sm font-semibold tabular-nums ${delta === 0 ? 'text-ink-subtle' : ''}`}>{delta === null ? 'wycena' : delta === 0 ? 'w cenie' : `${delta > 0 ? '+' : '−'}${formatPrice(Math.abs(delta))}`}</span>
                  </label>; })}
                </RadioGroup>
              </section>;
            })}
            <div className="mt-7 rounded-3xl bg-ink p-5 text-white sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-sm text-white/54">Cena Twojej konfiguracji</p><p className="mt-1 text-3xl font-semibold tracking-[-0.04em] tabular-nums">{pricing.total === null ? 'wycena indywidualna' : formatPrice(pricing.total)}</p></div>{pricing.delta !== 0 && <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm tabular-nums">{pricing.delta > 0 ? '+' : '−'}{formatPrice(Math.abs(pricing.delta))}</span>}</div><Button onClick={() => setDialogOpen(true)} className="mt-6 h-12 w-full rounded-full bg-[var(--accent-brand)] font-semibold text-[var(--accent-brand-foreground)] hover:brightness-95">Zapisz i przejdź do podsumowania <ArrowRight data-icon="inline-end" className="shrink-0" /></Button><p className="mt-3 flex items-center justify-center gap-2 text-center text-xs text-white/48"><ShieldCheck className="size-3.5" /> Cena brutto · zgodność potwierdzi Rexor</p></div>
          </>}
        </aside>
      </section>
    </main>
    <SiteFooter />

    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto rounded-3xl p-5 sm:max-w-lg sm:p-7">
        <DialogHeader><DialogTitle className="text-2xl font-semibold tracking-tight">Zapisz projekt {model.name}</DialogTitle><DialogDescription>Podaj kontakt. Utworzymy prywatny link z dokładnie tą konfiguracją i przygotujemy wiadomość e-mail.</DialogDescription></DialogHeader>
        <form onSubmit={submitConfiguration} className="mt-2 grid gap-4">
          <div className="grid gap-1.5"><Label htmlFor="customerName">Imię i nazwisko</Label><Input id="customerName" required autoComplete="name" className="h-11" value={contact.customerName} onChange={(e) => setContact({ ...contact, customerName: e.target.value })} /></div>
          <div className="grid gap-1.5"><Label htmlFor="customerEmail">E-mail</Label><Input id="customerEmail" required type="email" autoComplete="email" className="h-11" value={contact.customerEmail} onChange={(e) => setContact({ ...contact, customerEmail: e.target.value })} /></div>
          <div className="grid gap-1.5"><Label htmlFor="customerPhone">Telefon <span className="text-ink-subtle">(opcjonalnie)</span></Label><Input id="customerPhone" type="tel" autoComplete="tel" className="h-11" value={contact.customerPhone} onChange={(e) => setContact({ ...contact, customerPhone: e.target.value })} /></div>
          <div className="grid gap-1.5"><Label htmlFor="notes">Uwagi <span className="text-ink-subtle">(opcjonalnie)</span></Label><Textarea id="notes" rows={3} value={contact.notes} onChange={(e) => setContact({ ...contact, notes: e.target.value })} placeholder="Wzrost, styl jazdy lub inne istotne informacje" /></div>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-ink-wash p-4 text-sm leading-relaxed"><Checkbox checked={contact.privacyAccepted} onCheckedChange={(checked) => setContact({ ...contact, privacyAccepted: checked === true })} className="mt-0.5" /><span>Zgadzam się na kontakt w sprawie tej konfiguracji i przetwarzanie podanych danych.</span></label>
          {submitError && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</p>}
          <Button type="submit" disabled={submitState === 'saving'} className="h-12 rounded-full bg-ink text-white">{submitState === 'saving' ? 'Zapisuję…' : 'Utwórz prywatny link'} <ArrowRight data-icon="inline-end" /></Button>
        </form>
      </DialogContent>
    </Dialog>
  </div>;
}
