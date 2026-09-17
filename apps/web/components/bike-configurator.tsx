'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, BatteryCharging, Bike, Check, ChevronDown, Gauge, ShieldCheck, Zap } from 'lucide-react';
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
import { ConfiguratorSkeleton } from '@/components/page-loading';
import { OptimizedImage } from '@/components/optimized-image';
import { CUSTOMER_SUPPLIED_SKU, NONE_SKU, bikeModels, formatPrice, type BikeModel, type OptionGroup } from '@/lib/catalog';
import { publicMediaUrl } from '@/lib/catalog-merge';
import { computeBatteryEstimates, computeRangeEstimates } from '@/lib/battery';
import { configurationPricing, groupDefaultPrice, type Selections } from '@/lib/pricing';
import { PAINT_GROUP_SLUG, findColor, paintImageUrl, paintImages, usePaints, type PaintColor, type PaintSelection } from '@/lib/paints';
import { PaintSection } from '@/components/paint-picker';
import { usePublicCatalog, type PublicCatalogData } from '@/lib/use-public-catalog';
import { usePublicCopy } from '@/lib/use-public-copy';
import type { SiteCopy } from '@/lib/copy';
type ContactForm = { customerName: string; customerEmail: string; customerPhone: string; notes: string; privacyAccepted: boolean };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8081/api';
// Log "z detalami" dla dziennika aktywności w panelu admina: każda zmiana
// wyboru w konfiguratorze (model, rozmiar, bateria, osprzęt), nie tylko
// finalne zgłoszenie. Fire-and-forget - błąd logowania nie może przerwać
// korzystania z konfiguratora, a keepalive dowozi żądanie nawet tuż przed
// przejściem dalej.
function logConfiguratorEvent(modelSlug: string, parameter: string, value: string, label?: string) {
  fetch(`${API_BASE}/configurator-events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ modelSlug, parameter, value, label }),
    keepalive: true,
  }).catch(() => {});
}
const defaultBatteryCode = (model: BikeModel): string => (model.batteries.find((item) => item.isDefault) ?? model.batteries[0])?.code ?? '';
const formatEnergy = (wh: number) => `${new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 }).format(wh)} Wh`;
// Oświetlenie zawsze jest dodatkiem — również dla starszych danych, w których
// ustawienie grupy mogło jeszcze pozostać jako "select_one".
const optionalLightingGroups = new Set(['front-light', 'rear-light']);
const allowsNoneChoice = (group: OptionGroup) => group.selectionMode === 'optional' || optionalLightingGroups.has(group.slug);
// Grupa bez pozycji katalogowej, ale z dopuszczoną częścią klienta (np. damper
// E55 w jedynym zgodnym wymiarze) startuje z wyborem „własna część”.
const initialSelections = (model: BikeModel): Selections => Object.fromEntries(model.groups
  .map((group) => [group.slug, group.defaultSku ?? (group.customerPartAllowed ? CUSTOMER_SUPPLIED_SKU : (group.selectionMode === 'optional' ? NONE_SKU : null))] as const)
  .filter((entry): entry is readonly [string, string] => entry[1] !== null));
const defaultSizeCode = (model: BikeModel): string =>
  (model.sizes.find((item) => item.code === 'M') ?? model.sizes[0])?.code ?? '';

/**
 * Lista wyborów w grupie. Pozycja „własna część” nie jest produktem w katalogu:
 * jest trybem grupy z własną wartością rozliczeniową.
 */
function groupChoices(group: OptionGroup, t: SiteCopy['configurator']) {
  const catalogChoices = group.options
    .filter((option) => option.configurable || option.isDefault)
    .map((option) => ({ sku: option.sku, name: option.name, detail: option.detail, price: option.price, imagePath: publicMediaUrl(option.imagePath), customerSupplied: false }));
  const withNoneChoice = allowsNoneChoice(group)
    ? [{ sku: NONE_SKU, name: t.noneOptionName, detail: t.noneOptionDetail, price: 0, imagePath: '', customerSupplied: false }, ...catalogChoices]
    : catalogChoices;
  if (!group.customerPartAllowed) return withNoneChoice;
  return [...withNoneChoice, {
    sku: CUSTOMER_SUPPLIED_SKU,
    name: group.customerPartLabel,
    detail: t.customerPartDetail,
    price: group.customerPartGrossPrice,
    imagePath: '',
    customerSupplied: true,
  }];
}

export function BikeConfigurator({ catalog }: { catalog?: PublicCatalogData }) {
  const { models, loaded: catalogLoaded } = usePublicCatalog(catalog);
  const copy = usePublicCopy();
  const [modelId, setModelId] = useState<BikeModel['id']>(models[0]?.id ?? 'e82');
  const [size, setSize] = useState('M');
  const [galleryIndex, setGalleryIndex] = useState(0);
  // Na komputerze opis pozostaje od razu dostępny. Na telefonie jest zwinięty,
  // żeby po wyborze modelu nie zasłaniał całego właściwego konfiguratora.
  const [modelDescriptionOpen, setModelDescriptionOpen] = useState(false);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<'idle' | 'saving' | 'error'>('idle');
  const [submitError, setSubmitError] = useState('');
  const [contact, setContact] = useState<ContactForm>({ customerName: '', customerEmail: '', customerPhone: '', notes: '', privacyAccepted: false });
  const [selectionsByModel, setSelectionsByModel] = useState<Record<string, Selections>>(() => Object.fromEntries(bikeModels.map((model) => [model.id, initialSelections(model)])));
  const [touchedModels, setTouchedModels] = useState<Record<string, true>>({});
  const [batteryByModel, setBatteryByModel] = useState<Record<string, string>>(() => Object.fromEntries(bikeModels.map((model) => [model.id, defaultBatteryCode(model)])));
  // Wybór lakieru jest osobnym wymiarem konfiguracji, nie pozycją w grupie
  // części, więc ma własny stan - i własny per model, tak jak reszta wyborów.
  const [paintByModel, setPaintByModel] = useState<Record<string, PaintSelection | null>>({});
  // SKU lakierowania, które podniósł za klienta wybór palety płatnej. Bez tej
  // pamięci nie da się odróżnić „podnieśliśmy sami" od „klient tak wybrał",
  // więc powrót na paletę bez wymagań zostawiał dopłatę za proces.
  const [paintAutoPartByModel, setPaintAutoPartByModel] = useState<Record<string, string | null>>({});
  // Palety (680 kolorów) pobieramy dopiero przy pierwszym otwarciu wyboru
  // koloru - katalog modeli nie ma po co ich wozić.
  const [paintsRequested, setPaintsRequested] = useState(false);
  // Model z `?model=` ustawiamy dokładnie raz - inaczej ponowny przebieg
  // efektu cofałby wybór klienta, który zdążył przełączyć rower.
  const requestedModelApplied = useRef(false);
  const model = models.find((item) => item.id === modelId) ?? models[0];
  const selections = selectionsByModel[model.id] ?? {};
  // Pakiet domyślny wyznacza cenę bazową modelu, więc każdy inny wybór liczy się
  // jako różnica względem niego.
  const defaultBattery = model.batteries.find((item) => item.isDefault) ?? model.batteries[0];
  const battery = model.batteries.find((item) => item.code === batteryByModel[model.id]) ?? defaultBattery;
  const batteryLabel = battery
    ? (battery.name.includes('Wh') ? battery.name : `${battery.name} · ${formatEnergy(battery.energyWh)}`)
    : model.battery;

  const { palettes, state: paintState, colorFilter: paintColorFilter } = usePaints('model', model.id, paintsRequested);
  const paintSelection = paintByModel[model.id] ?? null;
  const chosenPaint = findColor(palettes, paintSelection);
  const paintPrice = chosenPaint?.color.priceGross ?? 0;

  const selectedSize = model.sizes.find((item) => item.code === size) ?? model.sizes[0] ?? null;
  // Cena liczona z tej samej formuły co API: rama, rozmiar, bateria, części,
  // składanie i narzut. Różnica względem ceny "od" jest tylko informacją.
  const pricing = useMemo(() => {
    const result = configurationPricing(model, selections, battery ?? null, selectedSize, paintPrice);
    const delta = result.total !== null && model.basePrice !== null ? Math.round((result.total - model.basePrice) * 100) / 100 : 0;
    return { total: result.total, delta };
  }, [battery, model, paintPrice, selectedSize, selections]);

  // Render ramy w wybranym kolorze wchodzi na początek galerii, zamiast
  // podmieniać scenę na stałe: klient nadal ma dostęp do zdjęć fabrycznych,
  // a porównanie jest jednym ruchem karuzeli.
  // Zdjęcia realnego roweru w tym lakierze idą przed wizualizacją i przed
  // zdjęciami fabrycznymi - jeśli mamy dowód koloru, to on otwiera galerię.
  const paintSlides = useMemo(() => (chosenPaint ? paintImages(chosenPaint.color) : []), [chosenPaint]);
  const gallery = useMemo(
    () => [...paintSlides.map((slide) => paintImageUrl(slide.image)), ...model.gallery],
    [paintSlides, model.gallery],
  );
  const paintSlide = galleryIndex < paintSlides.length ? paintSlides[galleryIndex] : null;

  useEffect(() => {
    setModelDescriptionOpen(window.matchMedia('(min-width: 1024px)').matches);
  }, []);

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
    if (requestedModelApplied.current) return;
    const query = new URLSearchParams(window.location.search);
    const resumeToken = query.get('resume');
    if (resumeToken) {
      fetch(`${API_BASE}/configurations/resume/${resumeToken}`)
        .then(async (response) => { const data = (await response.json()) as any; if (!response.ok) throw new Error(data.error); return data; })
        .then(({ configuration }) => {
          const nextModel = models.find((item) => item.id === configuration.model.slug && item.available);
          if (!nextModel) return;
          const restored = initialSelections(nextModel);
          for (const item of configuration.items as Array<{ groupSlug: string; sku: string }>) {
            const group = nextModel.groups.find((candidate) => candidate.slug === item.groupSlug);
            if (!group) continue;
            if (groupChoices(group, copy.configurator).some((choice) => choice.sku === item.sku)) restored[group.slug] = item.sku;
          }
          setTouchedModels((current) => ({ ...current, [nextModel.id]: true }));
          setModelId(nextModel.id);
          setSize(configuration.size.code);
          const restoredBattery = configuration.battery?.code as string | undefined;
          if (restoredBattery && nextModel.batteries.some((item) => item.code === restoredBattery)) {
            setBatteryByModel((current) => ({ ...current, [nextModel.id]: restoredBattery }));
          }
          setSelectionsByModel((current) => ({ ...current, [nextModel.id]: restored }));
          // Lakier odtwarzamy z migawki po slugach; palety dociągają się
          // asynchronicznie, więc wymuszamy też ich pobranie.
          const restoredPaint = configuration.paint as { paletteSlug?: string; colorSlug?: string } | null;
          if (restoredPaint?.paletteSlug && restoredPaint.colorSlug) {
            setPaintsRequested(true);
            setPaintByModel((current) => ({ ...current, [nextModel.id]: { paletteSlug: restoredPaint.paletteSlug!, colorSlug: restoredPaint.colorSlug! } }));
          }
        })
        .catch(() => setSubmitError(copy.configurator.resumeError));
      return;
    }
    const requested = query.get('model') as BikeModel['id'] | null;
    if (requested && models.some((item) => item.id === requested)) {
      requestedModelApplied.current = true;
      selectModel(requested);
    }
  // Efekt powtarza się, dopóki żądany model nie zostanie ustawiony: przy
  // pierwszym przebiegu `models` to jeszcze lista zapasowa, więc model
  // istniejący wyłącznie w bazie nie miał szans się dopasować.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [models]);

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
    logConfiguratorEvent(nextId, 'model', nextId, next.name);
  }

  function changeSize(value: string) {
    setSize(value);
    logConfiguratorEvent(model.id, 'size', value, `Rozmiar ${value}`);
  }

  function changeBattery(value: string) {
    setBatteryByModel((current) => ({ ...current, [model.id]: value }));
    logConfiguratorEvent(model.id, 'battery', value, model.batteries.find((item) => item.code === value)?.name);
  }

  function choose(groupSlug: string, sku: string) {
    setTouchedModels((current) => ({ ...current, [model.id]: true }));
    setSelectionsByModel((current) => ({ ...current, [model.id]: { ...current[model.id], [groupSlug]: sku } }));
    // Ręczny wybór zakresu lakierowania przestaje być „nasz": od tej chwili
    // zmiana koloru go nie cofa (patrz choosePaint).
    if (groupSlug === PAINT_GROUP_SLUG) setPaintAutoPartByModel((current) => ({ ...current, [model.id]: null }));
    const group = model.groups.find((item) => item.slug === groupSlug);
    const choiceName = group ? groupChoices(group, copy.configurator).find((item) => item.sku === sku)?.name : undefined;
    logConfiguratorEvent(model.id, `group:${groupSlug}`, sku, group && choiceName ? `${group.name}: ${choiceName}` : undefined);
  }

  /**
   * Wybór koloru. Kolor z palety płatnej sam podnosi zakres lakierowania do
   * opcji wymaganej przez paletę - inaczej dałoby się zestawić „lakierowanie
   * standardowe” z lakierem Paint to Sample. API sprawdza tę samą regułę
   * jeszcze raz, bo wycena nie może zależeć od stanu przeglądarki.
   *
   * Powrót na paletę bez wymagań cofa TYLKO to, co podnieśliśmy sami
   * (`paintAutoPartByModel`). Klient, który świadomie wybrał droższe
   * lakierowanie, zachowuje je przy każdej zmianie koloru.
   */
  function choosePaint(next: PaintSelection | null, color: PaintColor | null) {
    setTouchedModels((current) => ({ ...current, [model.id]: true }));
    setPaintByModel((current) => ({ ...current, [model.id]: next }));
    if (!next || !color) return;

    const palette = palettes.find((item) => item.slug === next.paletteSlug);
    const paintGroup = model.groups.find((item) => item.slug === PAINT_GROUP_SLUG);
    const required = palette?.requiresPartSku ?? null;
    if (paintGroup) {
      const current = selections[PAINT_GROUP_SLUG] ?? paintGroup.defaultSku;
      const autoApplied = paintAutoPartByModel[model.id] ?? null;
      if (required) {
        const available = paintGroup.options.some((option) => option.sku === required);
        if (available && (current === null || current === paintGroup.defaultSku || current === autoApplied)) {
          setSelectionsByModel((state) => ({ ...state, [model.id]: { ...state[model.id], [PAINT_GROUP_SLUG]: required } }));
          setPaintAutoPartByModel((state) => ({ ...state, [model.id]: required }));
        }
      } else if (autoApplied !== null && current === autoApplied) {
        setSelectionsByModel((state) => {
          const next = { ...state[model.id] };
          // Grupa bez domyślnego SKU nie ma czego przywrócić - kasujemy wpis,
          // żeby wycena wróciła do stanu sprzed automatycznego podniesienia.
          if (paintGroup.defaultSku === null) delete next[PAINT_GROUP_SLUG];
          else next[PAINT_GROUP_SLUG] = paintGroup.defaultSku;
          return { ...state, [model.id]: next };
        });
        setPaintAutoPartByModel((state) => ({ ...state, [model.id]: null }));
      }
    }
    logConfiguratorEvent(model.id, 'paint', `${next.paletteSlug}/${next.colorSlug}`, `Lakier: ${color.name}${palette ? ` (${palette.name})` : ''}`);
  }

  async function submitConfiguration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!contact.privacyAccepted) { setSubmitError(copy.configurator.privacyRequiredError); setSubmitState('error'); return; }
    setSubmitState('saving'); setSubmitError('');
    try {
      // Wysyłamy tylko wybory klienta. Elementy stałe i cena wynikają z bazy,
      // więc konfigurator nie przekazuje żadnej kwoty.
      const selectionsPayload = Object.fromEntries(model.groups
        .filter((group) => group.selectionMode !== 'fixed' && selections[group.slug] && selections[group.slug] !== NONE_SKU)
        .map((group) => [group.slug, selections[group.slug]]));
      const response = await fetch(`${API_BASE}/configurations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelSlug: model.id,
          sizeCode: size,
          batteryCode: battery?.code ?? '',
          selections: selectionsPayload,
          paintPaletteSlug: paintSelection?.paletteSlug ?? '',
          paintColorSlug: paintSelection?.colorSlug ?? '',
          customerName: contact.customerName,
          customerEmail: contact.customerEmail,
          customerPhone: contact.customerPhone,
          customerNotes: contact.notes,
          privacyConsent: contact.privacyAccepted,
        }),
      });
      const result = (await response.json()) as any;
      if (!response.ok) throw new Error(result.error ?? copy.configurator.submitError);
      window.location.href = result.shareUrl;
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : copy.configurator.submitError);
      setSubmitState('error');
    }
  }

  // Dopóki nie ma katalogu z API, `models` to lista zapasowa z kodu i pierwszy
  // jej element - konfigurator pokazywał więc przez ułamek sekundy cudzy rower,
  // także przy wejściu z `?model=`, bo parametr stosuje dopiero efekt.
  if (!catalogLoaded) {
    return <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />
      <main className="flex-1"><ConfiguratorSkeleton /></main>
      <SiteFooter />
    </div>;
  }

  return <div className="flex min-h-screen flex-col bg-background text-foreground">
    <SiteHeader />
    <main className="flex-1">
      <section className="mx-auto max-w-[1480px] px-4 pb-3 pt-7 sm:px-8 sm:pt-10 lg:px-12">
        <div className="mb-5 flex items-end justify-between gap-4"><div><p className="eyebrow">{copy.configurator.heroEyebrow}</p><h1 className="mt-2 text-[clamp(2rem,5vw,4.8rem)] font-semibold leading-[0.94] tracking-[-0.055em]">{copy.configurator.heroTitleLine1}<br className="hidden sm:block" /> {copy.configurator.heroTitleLine2}</h1></div><p className="hidden max-w-sm text-right text-base leading-relaxed text-ink-muted xl:block">{copy.configurator.heroSubtitle}</p></div>
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">{copy.configurator.currentModelEyebrow}</p>
            <p className="mt-0.5 truncate text-lg font-semibold tracking-tight">{model.name}</p>
          </div>
          <Button type="button" variant="outline" className="shrink-0 rounded-full" onClick={() => setModelPickerOpen(true)} data-testid="model-switcher-trigger">
            {copy.configurator.changeModelCta} <ChevronDown className="size-4" />
          </Button>
        </div>
      </section>

      <Dialog open={modelPickerOpen} onOpenChange={setModelPickerOpen}>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:max-w-2xl sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold tracking-tight text-ink">{copy.configurator.changeModelCta}</DialogTitle>
          </DialogHeader>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {models.map((item) => { const active = item.id === model.id; return <button key={item.id} type="button" onClick={() => { selectModel(item.id); setModelPickerOpen(false); }} className={`pick-card focus-ring overflow-hidden p-0 ${active ? 'pick-card-active' : ''}`} aria-pressed={active} data-testid={`model-select-${item.id}`}>
              <span className="block aspect-[4/3] w-full overflow-hidden bg-ink-wash">
                {item.image && <OptimizedImage src={item.image} alt={item.name} className="size-full object-contain mix-blend-multiply" />}
              </span>
              <span className="block p-4">
                <span className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">{item.category}</span>
                  <span className={`grid size-6 shrink-0 place-items-center rounded-full border ${active ? 'border-ink bg-ink text-white' : 'border-line-strong'}`}>{active && <Check className="size-3.5" />}</span>
                </span>
                <span className="mt-1 block text-xl font-semibold tracking-tight">{item.name}</span>
                {item.eyebrow && <span className="mt-1 block text-sm text-ink-muted">{item.eyebrow}</span>}
                <span className="mt-2 block text-sm font-medium text-ink">{item.basePrice ? `od ${formatPrice(item.basePrice)}` : copy.configurator.priceComingSoon}</span>
              </span>
            </button>; })}
          </div>
        </DialogContent>
      </Dialog>

      <section className="mx-auto grid max-w-[1480px] gap-4 px-4 pb-20 sm:px-8 lg:grid-cols-[minmax(0,1.32fr)_minmax(380px,0.68fr)] lg:px-12">
        <div className="lg:sticky lg:top-[88px] lg:self-start">
          <div className="stage-card">
            <div className="stage-bar justify-between border-b border-line">
              <div>
                <p className="eyebrow">{model.eyebrow}</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">{model.name}</h2>
              </div>
              {/* Podpis slajdu lakieru: klient ma wiedzieć, czy patrzy na
                  wizualizację, czy na rower, który naprawdę stoi w tym kolorze. */}
              {paintSlide && chosenPaint && <span className="ml-auto rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white">
                {paintSlide.variant === 'photo' ? 'zdjęcie' : 'wizualizacja'} · {chosenPaint.color.name}
              </span>}
              <span className={`rounded-full bg-ink-wash px-3 py-1.5 text-xs font-semibold tabular-nums text-ink-muted ${paintSlide ? '' : 'ml-auto'}`}>{galleryIndex + 1} / {gallery.length}</span>
            </div>
            <Carousel key={`${model.id}-${gallery[0] ?? ''}`} setApi={setCarouselApi} opts={{ loop: gallery.length > 1 }} aria-label={`Zdjęcia modelu ${model.name}`} data-testid="model-gallery">
              <CarouselContent className="ml-0">
                {gallery.map((image, index) => <CarouselItem key={image} className="pl-0" data-testid={`gallery-slide-${index}`}>
                  <div className="stage-media p-4 sm:p-8">
                    <OptimizedImage
                      src={image}
                      alt={index < paintSlides.length && chosenPaint
                        ? `${model.name} — ${paintSlides[index].variant === 'photo' ? 'zdjęcie' : 'wizualizacja'} w kolorze ${chosenPaint.color.name}`
                        : `${model.name} — zdjęcie ${index - paintSlides.length + 1}`}
                      priority={index === 0}
                      data-testid={`gallery-image-${index}`}
                    />
                  </div>
                </CarouselItem>)}
              </CarouselContent>
              {gallery.length > 1 && <><CarouselPrevious size="icon-lg" className="left-3 z-20 border-line bg-surface/90 shadow-md hover:bg-surface sm:left-5" /><CarouselNext size="icon-lg" className="right-3 z-20 border-line bg-surface/90 shadow-md hover:bg-surface sm:right-5" /></>}
            </Carousel>
            <div className="stage-bar border-t border-line">
              <span className="spec-pill"><Gauge /> {model.motor}</span>
              <span className="spec-pill"><BatteryCharging /> {batteryLabel}</span>
            </div>
          </div>
          {(model.descriptionHtml || model.description) && (
            <details
              className="mt-4 rounded-[28px] border border-line bg-white p-3 sm:p-4"
              open={modelDescriptionOpen}
              onToggle={(event) => setModelDescriptionOpen(event.currentTarget.open)}
              data-testid="model-description-collapsible"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-[20px] px-2 py-2 text-left text-ink transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 [&::-webkit-details-marker]:hidden" data-testid="model-description-toggle">
                <span className="min-w-0">
                  <span className="block text-base font-semibold tracking-tight">{copy.configurator.aboutModelPrefix} {model.name}</span>
                  <span className="mt-0.5 block text-xs font-normal text-ink-muted">{copy.model.descriptionEyebrow}</span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-white px-3 py-2 text-xs font-semibold text-ink shadow-sm">
                  <span>{modelDescriptionOpen ? copy.model.collapseDescriptionCta : copy.model.expandDescriptionCta}</span>
                  <ChevronDown className={`size-4 transition-transform ${modelDescriptionOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                </span>
              </summary>
              <div className="rich-content mx-2 mt-3 border-t border-line pt-4 text-sm leading-relaxed sm:mx-3" dangerouslySetInnerHTML={{ __html: model.descriptionHtml || model.description }} />
            </details>
          )}
        </div>

        <aside className="rounded-[28px] border border-line bg-white p-5 sm:p-7 lg:p-8">
          <div className="flex items-start justify-between gap-5"><div><p className="eyebrow">{copy.configurator.projectEyebrow}</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">{copy.configurator.configTitlePrefix} {model.name.replace('Rexor ', '')}</h2></div><span className="rounded-full bg-[var(--accent-brand)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em]">{copy.configurator.grossBadge}</span></div>
          <Progress value={model.available ? 72 : 12} className="mt-5 h-1.5 bg-ink-wash [&>div]:bg-ink" />
          {!model.available ? <div className="mt-8 rounded-3xl bg-ink p-6 text-white"><Bike className="size-8 text-[var(--accent-brand)]" /><h3 className="mt-8 text-2xl font-semibold">{copy.configurator.unavailableTitle}</h3><p className="mt-3 leading-relaxed text-white/64">{copy.configurator.unavailableText}</p><Button render={<a href="/serwis" />} className="mt-6 w-full rounded-full bg-white text-ink hover:bg-white/90">{copy.configurator.unavailableCta} <ArrowRight data-icon="inline-end" /></Button></div> : <>
            <section className="config-section" data-testid="size-section"><div className="section-heading"><div><span>01</span><h3>{copy.configurator.sizeSectionTitle}</h3></div><p>{copy.configurator.sizeSectionSubtitle}</p></div><RadioGroup value={size} onValueChange={changeSize} className="grid grid-cols-3 gap-2" data-testid="size-selector">{model.sizes.map((item) => <label key={item.code} className={`size-choice focus-ring ${size === item.code ? 'size-choice-active' : ''}`} data-testid={`size-option-${item.code}`}><RadioGroupItem value={item.code} className="choice-input" /><span>{item.code}</span>{item.priceDelta !== 0 && <span className="text-xs text-ink-muted tabular-nums">+{formatPrice(item.priceDelta)}</span>}</label>)}</RadioGroup></section>
            {model.batteries.length > 0 && <section className="config-section" data-testid="battery-section">
              <div className="section-heading"><div><span>02</span><h3>{copy.configurator.batterySectionTitle}</h3></div><p>{copy.configurator.batterySectionSubtitle}</p></div>
              <RadioGroup value={battery?.code ?? ''} onValueChange={changeBattery} className="gap-2" data-testid="battery-selector">
                {model.batteries.map((item) => { const selected = battery?.code === item.code; const delta = item.grossPrice - (defaultBattery?.grossPrice ?? item.grossPrice); return <label key={item.code} className={`option-choice focus-ring ${selected ? 'option-choice-active' : ''}`} data-testid={`battery-option-${item.code}`}>
                  <RadioGroupItem value={item.code} className="choice-input" />
                  <span className={`choice-indicator ${selected ? 'choice-indicator-active' : ''}`}>{selected && <Check className="size-3.5" />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 font-semibold">{item.name}{item.isDefault && <span className="rounded bg-ink-wash px-1.5 py-0.5 text-[0.68rem] uppercase tracking-wide text-ink-subtle">{copy.configurator.defaultBadge}</span>}</span>
                    <span className="mt-0.5 block text-sm text-ink-muted">
                      {item.shortLabel?.includes('Wh') ? item.shortLabel : `${item.shortLabel ? `${item.shortLabel} · ` : ''}${formatEnergy(item.energyWh)}`}
                      {(() => {
                        const est = computeBatteryEstimates(item);
                        return est.estimatedTotalPackWeightKg > 0 ? ` · ~${est.estimatedTotalPackWeightKg.toFixed(1).replace('.', ',')} kg` : '';
                      })()}
                    </span>
                  </span>
                  <span className={`shrink-0 text-sm font-semibold tabular-nums ${delta === 0 ? 'text-ink-subtle' : ''}`}>{delta === 0 ? copy.configurator.includedPrice : `${delta > 0 ? '+' : '−'}${formatPrice(Math.abs(delta))}`}</span>
                </label>; })}
              </RadioGroup>

              {battery && battery.energyWh > 0 && (
                <div className="mt-3.5 rounded-2xl border border-line bg-[#fafbfa] p-4 text-ink">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line/70 pb-2.5">
                    <div>
                      <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink">
                        <Zap className="size-3.5 text-amber-600" />
                        {copy.configurator.rangeEstimateTitle} ({formatEnergy(battery.energyWh)})
                      </h4>
                      <p className="mt-0.5 text-[11px] text-ink-muted">
                        {copy.configurator.rangeEstimateSubtitle}
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
                          <th className="pb-1.5 font-medium">{copy.configurator.rangeTableModeHeader}</th>
                          <th className="pb-1.5 font-medium text-center">{copy.configurator.rangeTableConsumptionHeader}</th>
                          <th className="pb-1.5 text-right font-semibold text-ink">{copy.configurator.rangeTableRangeHeader}</th>
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
              const choices = groupChoices(group, copy.configurator);
              const defaultPrice = groupDefaultPrice(group);
              const heading = <div className="section-heading"><div><span>{String(groupIndex + (model.batteries.length > 0 ? 3 : 2)).padStart(2, '0')}</span><h3>{group.name}</h3></div><p>{group.helper}</p></div>;
              // Lakierowanie ma własną sekcję: obok zakresu robót stoi wybór
              // koloru, który nie jest częścią z cennika, tylko osobnym bytem.
              if (group.slug === PAINT_GROUP_SLUG) {
                return <section className="config-section" key={group.slug} data-testid={`group-section-${group.slug}`}>
                  {heading}
                  <PaintSection
                    choices={choices.map(({ sku, name, detail, price }) => ({ sku, name, detail, price }))}
                    defaultSku={group.defaultSku}
                    selectedSku={selections[group.slug] ?? null}
                    onChooseSku={(value) => choose(group.slug, value)}
                    palettes={palettes}
                    paintState={paintState}
                    colorFilter={paintColorFilter}
                    selection={paintSelection}
                    onSelect={choosePaint}
                    onOpen={() => setPaintsRequested(true)}
                    formatPrice={formatPrice}
                    includedLabel={copy.configurator.includedPrice}
                  />
                </section>;
              }
              return <section className="config-section" key={group.slug} data-testid={`group-section-${group.slug}`}>
                {heading}
                <RadioGroup value={selections[group.slug] ?? ''} onValueChange={(value) => choose(group.slug, value)} className="gap-2" data-testid={`group-selector-${group.slug}`}>
                  {choices.map((choice) => { const selected = selections[group.slug] === choice.sku; const delta = choice.price === null ? null : choice.price - defaultPrice; return <label key={choice.sku} className={`option-choice focus-ring ${selected ? 'option-choice-active' : ''}`} data-testid={`option-${group.slug}-${choice.sku}`}>
                    <RadioGroupItem value={choice.sku} className="choice-input" />
                    <span className={`choice-indicator ${selected ? 'choice-indicator-active' : ''}`}>{selected && <Check className="size-3.5" />}</span>
                    {choice.imagePath && <img src={choice.imagePath} alt="" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setZoomedImage(choice.imagePath); }} className="size-10 shrink-0 cursor-zoom-in rounded-lg border border-line bg-white object-contain transition-transform hover:scale-110" data-testid={`option-image-${group.slug}-${choice.sku}`} />}
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2 font-semibold">{choice.name}{choice.customerSupplied && <span className="rounded bg-ink-wash px-1.5 py-0.5 text-[0.68rem] uppercase tracking-wide text-ink-muted">{copy.configurator.customerPartBadge}</span>}</span>
                      <span className="mt-0.5 block text-sm text-ink-muted">{choice.detail}</span>
                    </span>
                    <span className={`shrink-0 text-sm font-semibold tabular-nums ${delta === 0 ? 'text-ink-subtle' : ''}`}>{choice.sku === NONE_SKU ? '—' : delta === null ? copy.configurator.quotePrice : delta === 0 ? copy.configurator.includedPrice : `${delta > 0 ? '+' : '−'}${formatPrice(Math.abs(delta))}`}</span>
                  </label>; })}
                </RadioGroup>
              </section>;
            })}
            <div className="mt-7 rounded-3xl bg-ink p-5 text-white sm:p-6" data-testid="price-summary"><div className="flex items-start justify-between gap-4"><div><p className="text-sm text-white/54">{copy.configurator.priceLabel}</p><p className="mt-1 text-3xl font-semibold tracking-[-0.04em] tabular-nums" data-testid="total-price">{pricing.total === null ? copy.configurator.priceIndividual : formatPrice(pricing.total)}</p></div>{pricing.delta !== 0 && <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm tabular-nums" data-testid="price-delta">{pricing.delta > 0 ? '+' : '−'}{formatPrice(Math.abs(pricing.delta))}</span>}</div><Button onClick={() => setDialogOpen(true)} variant="brand" className="mt-6 h-12 w-full rounded-full font-semibold transition-all hover:brightness-95" data-testid="open-contact-form-button">{copy.configurator.saveCta} <ArrowRight data-icon="inline-end" className="shrink-0" /></Button><p className="mt-3 flex items-center justify-center gap-2 text-center text-xs text-white/48"><ShieldCheck className="size-3.5" /> {copy.configurator.grossPriceNote}</p></div>
          </>}
        </aside>
      </section>
    </main>
    <SiteFooter />

    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:max-w-lg sm:p-8">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold tracking-tight text-ink">{copy.configurator.saveDialogTitlePrefix} {model.name}</DialogTitle>
          <DialogDescription className="text-sm text-ink-muted">{copy.configurator.saveDialogDescription}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submitConfiguration} className="mt-2 grid gap-4" data-testid="contact-form">
          <div className="grid gap-1.5"><Label htmlFor="customerName" className="font-medium text-ink">{copy.configurator.nameLabel}</Label><Input id="customerName" data-testid="contact-name-input" required autoComplete="name" className="h-11 bg-ink-wash/50 border-line text-ink focus:bg-white" value={contact.customerName} onChange={(e) => setContact({ ...contact, customerName: e.target.value })} /></div>
          <div className="grid gap-1.5"><Label htmlFor="customerEmail" className="font-medium text-ink">{copy.configurator.emailLabel}</Label><Input id="customerEmail" data-testid="contact-email-input" required type="email" autoComplete="email" className="h-11 bg-ink-wash/50 border-line text-ink focus:bg-white" value={contact.customerEmail} onChange={(e) => setContact({ ...contact, customerEmail: e.target.value })} /></div>
          <div className="grid gap-1.5"><Label htmlFor="customerPhone" className="font-medium text-ink">{copy.configurator.phoneLabel} <span className="text-ink-subtle font-normal">{copy.configurator.optionalHint}</span></Label><Input id="customerPhone" data-testid="contact-phone-input" type="tel" autoComplete="tel" className="h-11 bg-ink-wash/50 border-line text-ink focus:bg-white" value={contact.customerPhone} onChange={(e) => setContact({ ...contact, customerPhone: e.target.value })} /></div>
          <div className="grid gap-1.5"><Label htmlFor="notes" className="font-medium text-ink">{copy.configurator.notesLabel} <span className="text-ink-subtle font-normal">{copy.configurator.optionalHint}</span></Label><Textarea id="notes" data-testid="contact-notes-input" rows={3} className="bg-ink-wash/50 border-line text-ink focus:bg-white" value={contact.notes} onChange={(e) => setContact({ ...contact, notes: e.target.value })} placeholder={copy.configurator.notesPlaceholder} /></div>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-ink-wash p-4 text-sm leading-relaxed text-ink"><Checkbox checked={contact.privacyAccepted} onCheckedChange={(checked) => setContact({ ...contact, privacyAccepted: checked === true })} className="mt-0.5" data-testid="contact-privacy-checkbox" /><span>{copy.configurator.privacyConsentLabel}</span></label>
          {submitError && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" data-testid="contact-error-message">{submitError}</p>}
          <Button type="submit" disabled={submitState === 'saving'} className="h-12 rounded-full bg-ink text-white font-semibold transition-colors hover:bg-black" data-testid="contact-submit-button">{submitState === 'saving' ? copy.configurator.submittingCta : copy.configurator.submitCta} <ArrowRight data-icon="inline-end" /></Button>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog open={zoomedImage !== null} onOpenChange={(open) => !open && setZoomedImage(null)}>
      <DialogContent className="flex max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] items-center justify-center rounded-3xl bg-white p-4 shadow-2xl sm:max-w-xl">
        <DialogTitle className="sr-only">{copy.configurator.zoomedImageTitle}</DialogTitle>
        {zoomedImage && <img src={zoomedImage} alt="" className="max-h-[70vh] w-full object-contain" />}
      </DialogContent>
    </Dialog>
  </div>;
}
