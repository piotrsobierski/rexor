'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Check, Info, Palette, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  FINISH_LABELS,
  bestRender,
  findColor,
  paintImageUrl,
  searchColors,
  type PaintColor,
  type PaintPalette,
  type PaintSelection,
} from '@/lib/paints';

type Choice = { sku: string; name: string; detail: string; price: number | null };

type Props = {
  /** Opcje procesu lakierowania z grupy `paint` - robocizna, nie kolor. */
  choices: Choice[];
  defaultSku: string | null;
  selectedSku: string | null;
  onChooseSku: (sku: string) => void;
  palettes: PaintPalette[];
  paintState: 'idle' | 'loading' | 'ready' | 'error';
  selection: PaintSelection | null;
  onSelect: (selection: PaintSelection | null, color: PaintColor | null) => void;
  /** Otwarcie pickera uruchamia pobranie palet - patrz usePaints(enabled). */
  onOpen: () => void;
  formatPrice: (value: number) => string;
  includedLabel: string;
};

/**
 * Sekcja „Lakierowanie” w konfiguratorze.
 *
 * Dwa kroki w jednej sekcji, bo to dwie różne rzeczy, których klient nie
 * powinien mylić: najpierw ZAKRES lakierowania (pozycja z cennika części),
 * potem KOLOR (osobny byt z własną dopłatą). Wybór koloru z palety płatnej
 * podnosi zakres sam, żeby nie dało się zestawić „standard + Riviera Blue”.
 *
 * Konfigurator prowadzi do JEDNEGO koloru. Malowanie dwukolorowe, wzory
 * i przejścia nie są tu wyborem - trafiają do uwag i wyceniamy je osobno.
 */
export function PaintSection({
  choices,
  defaultSku,
  selectedSku,
  onChooseSku,
  palettes,
  paintState,
  selection,
  onSelect,
  onOpen,
  formatPrice,
  includedLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const chosen = findColor(palettes, selection);
  // Administrator może wyłączyć wszystkie palety dla modelu. Wtedy nie
  // pokazujemy pustego wyboru koloru, tylko mówimy, co dalej.
  const noPalettes = paintState === 'ready' && palettes.length === 0;
  const defaultPrice = choices.find((choice) => choice.sku === defaultSku)?.price ?? 0;

  /** Paleta „custom” nie ma własnej ceny - kosztuje wymagany proces lakierowania. */
  function requirementFor(palette: PaintPalette): PaintRequirement {
    if (!palette.requiresPartSku) return null;
    const choice = choices.find((item) => item.sku === palette.requiresPartSku);
    if (!choice) return null;
    return { name: choice.name, delta: (choice.price ?? 0) - defaultPrice };
  }

  function openPicker() {
    onOpen();
    setOpen(true);
  }

  return <>
    {choices.length > 0 && <RadioGroup value={selectedSku ?? ''} onValueChange={onChooseSku} className="gap-2">
      {choices.map((choice) => {
        const active = selectedSku === choice.sku;
        const delta = choice.price === null ? null : choice.price - defaultPrice;
        return <label key={choice.sku} className={`option-choice focus-ring ${active ? 'option-choice-active' : ''}`}>
          <RadioGroupItem value={choice.sku} className="choice-input" />
          <span className={`choice-indicator ${active ? 'choice-indicator-active' : ''}`}>{active && <Check className="size-3.5" />}</span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{choice.name}</span>
            {choice.detail && <span className="mt-0.5 block text-sm text-ink-muted">{choice.detail}</span>}
          </span>
          <span className={`shrink-0 text-sm font-semibold tabular-nums ${delta === 0 ? 'text-ink-subtle' : ''}`}>
            {delta === null ? 'wycena' : delta === 0 ? includedLabel : `${delta > 0 ? '+' : '−'}${formatPrice(Math.abs(delta))}`}
          </span>
        </label>;
      })}
    </RadioGroup>}

    {noPalettes ? <p className="mt-3 rounded-2xl border border-line bg-ink-wash/40 p-3.5 text-sm text-ink-muted">
      Dla tego modelu nie włączono jeszcze żadnej palety kolorów. Kolor ustalimy indywidualnie - napisz w uwagach, na czym Ci zależy.
    </p> : <div className="mt-3 rounded-2xl border border-line p-3.5">
      {chosen ? <div className="flex items-center gap-3.5">
        <ColorPreview color={chosen.color} className="size-14 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{chosen.color.name}</p>
          <p className="mt-0.5 truncate text-sm text-ink-muted">
            {chosen.palette.name}
            {chosen.color.code ? ` · ${chosen.color.code}` : ''} · {FINISH_LABELS[chosen.color.finish]}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold tabular-nums">{paletteNote(chosen.palette, requirementFor(chosen.palette), formatPrice, includedLabel, chosen.color.priceGross)}</p>
          <button type="button" onClick={openPicker} className="focus-ring mt-1 rounded text-sm font-medium text-ink underline underline-offset-4">Zmień</button>
        </div>
      </div> : <button type="button" onClick={openPicker} className="focus-ring flex w-full items-center gap-3.5 rounded-xl text-left">
        <span className="grid size-14 shrink-0 place-items-center rounded-xl border border-dashed border-line-strong text-ink-subtle"><Palette className="size-6" /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Wybierz kolor</span>
          <span className="mt-0.5 block text-sm text-ink-muted">
            {paintState === 'error' ? 'Nie udało się pobrać palet lakierów.' : 'Kolor producenta w cenie; palety Porsche i Volkswagen przy lakierowaniu jednokolorowym.'}
          </span>
        </span>
      </button>}
    </div>}

    <p className="mt-3 flex gap-2 text-xs leading-relaxed text-ink-muted">
      <Info className="mt-0.5 size-3.5 shrink-0" />
      <span>Konfigurator obejmuje jeden kolor. Malowanie dwukolorowe, przejścia i wzory wyceniamy indywidualnie — opisz pomysł w uwagach przy zapisie projektu, a ustalimy zakres i cenę.</span>
    </p>

    <PaintDialog
      open={open}
      onOpenChange={setOpen}
      palettes={palettes}
      paintState={paintState}
      selection={selection}
      onConfirm={(next, color) => { onSelect(next, color); setOpen(false); }}
      formatPrice={formatPrice}
      includedLabel={includedLabel}
      requirementFor={requirementFor}
    />
  </>;
}

/**
 * Próbka koloru: render produktu, jeśli jest, inaczej płaska plama lakieru.
 *
 * `full` przełącza próbkę w podgląd całego zdjęcia. Miniatura renderu ma 96x96
 * i jest ciasnym wycinkiem rury ramy - jako próbka lakieru to działa, ale
 * rozciągnięta do szerokości panelu dawała rozmyte zbliżenie, na którym nie
 * dało się zobaczyć roweru. W tym trybie bierzemy pełny render (1184x912 albo
 * 1024x1024) i mieścimy go w całości, na białym tle studyjnym renderu -
 * kolorem lakieru nie podmalowujemy, bo dałby kolorowe pasy wokół zdjęcia.
 */
function ColorPreview({ color, className, full = false }: { color: PaintColor; className?: string; full?: boolean }) {
  const render = bestRender(color);
  const source = full ? render?.image ?? render?.thumb ?? null : render?.thumb ?? render?.image ?? null;
  const showsRender = full && source !== null;
  return <span
    className={`relative block overflow-hidden border border-line ${showsRender ? 'bg-white' : ''} ${className ?? ''}`}
    style={showsRender ? undefined : { backgroundColor: color.hex }}
  >
    {source && <img
      src={paintImageUrl(source)}
      alt=""
      loading="lazy"
      className={`absolute inset-0 size-full ${showsRender ? 'object-contain' : 'object-cover'}`}
    />}
  </span>;
}

/**
 * Etykieta palety. Dopłata za sam kolor jest dziś zerowa - klient płaci za
 * proces lakierowania (część z grupy `paint`), więc w chipie pokazujemy tę
 * kwotę, a nie mylące „w cenie”.
 */
type PaintRequirement = { name: string; delta: number } | null;

function paletteNote(
  palette: PaintPalette,
  requirement: PaintRequirement,
  formatPrice: (value: number) => string,
  includedLabel: string,
  price: number = palette.priceGross,
): string {
  if (price > 0) return `+${formatPrice(price)}`;
  if (requirement && requirement.delta > 0) return `+${formatPrice(requirement.delta)} za lakierowanie`;
  return includedLabel;
}

function PaintDialog({
  open,
  onOpenChange,
  palettes,
  paintState,
  selection,
  onConfirm,
  formatPrice,
  includedLabel,
  requirementFor,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  palettes: PaintPalette[];
  paintState: 'idle' | 'loading' | 'ready' | 'error';
  selection: PaintSelection | null;
  onConfirm: (selection: PaintSelection, color: PaintColor) => void;
  formatPrice: (value: number) => string;
  includedLabel: string;
  requirementFor: (palette: PaintPalette) => PaintRequirement;
}) {
  const [query, setQuery] = useState('');
  const [paletteFilter, setPaletteFilter] = useState<string | null>(null);
  // Renderów jest kilkaset na ~690 lakierów, więc sama kropka na próbce nie
  // wystarczy do ich znalezienia - potrzebny jest filtr.
  const [onlyWithRender, setOnlyWithRender] = useState(false);
  // Podgląd jest stanem modala, nie konfiguracji: klik w próbkę pokazuje
  // lakier, ale ceny nie zmienia dopóki klient nie potwierdzi. Przy 680
  // kolorach przypadkowe trafienie nie może przestawić zamówienia.
  const [preview, setPreview] = useState<PaintSelection | null>(selection);

  useEffect(() => { if (open) setPreview(selection); }, [open, selection]);

  const renderCount = useMemo(
    () => palettes.reduce((sum, palette) => sum + palette.colors.filter((color) => bestRender(color) !== null).length, 0),
    [palettes],
  );

  const results = useMemo(() => {
    const found = searchColors(palettes, query, paletteFilter);
    return onlyWithRender ? found.filter(({ color }) => bestRender(color) !== null) : found;
  }, [palettes, query, paletteFilter, onlyWithRender]);
  const previewed = findColor(palettes, preview);
  const previewHasRender = previewed !== null && bestRender(previewed.color) !== null;

  // Sekcje po grupie kolorystycznej palety ("Czerwienie", "Błękity").
  // Przy wyszukiwaniu grupujemy po palecie, bo wynik i tak jest przemieszany.
  const sections = useMemo(() => {
    const map = new Map<string, Array<{ palette: PaintPalette; color: PaintColor }>>();
    for (const row of results) {
      const key = query.trim() !== '' ? row.palette.name : row.color.groupName ?? row.palette.name;
      const bucket = map.get(key);
      if (bucket) bucket.push(row); else map.set(key, [row]);
    }
    return [...map.entries()];
  }, [results, query]);

  const listRef = useRef<HTMLDivElement>(null);

  function step(direction: 1 | -1) {
    if (results.length === 0) return;
    const index = results.findIndex(({ palette, color }) => palette.slug === preview?.paletteSlug && color.slug === preview?.colorSlug);
    const next = results[(index + direction + results.length) % results.length] ?? results[0];
    setPreview({ paletteSlug: next.palette.slug, colorSlug: next.color.slug });
  }

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent
      showCloseButton={false}
      className="flex h-[100dvh] w-screen max-w-none flex-col gap-0 rounded-none bg-white p-0 sm:h-[min(88vh,860px)] sm:w-[min(96vw,1080px)] sm:max-w-none sm:rounded-3xl"
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') { event.preventDefault(); step(1); }
        if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
        if (event.key === 'Enter' && previewed) { event.preventDefault(); onConfirm(preview!, previewed.color); }
      }}
    >
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-6">
        <div className="min-w-0">
          <DialogTitle className="text-lg font-semibold tracking-tight text-ink">Kolor lakieru</DialogTitle>
          <DialogDescription className="text-xs text-ink-muted">
            {paintState === 'loading' ? 'Wczytuję palety…' : `${results.length} lakierów do wyboru`}
          </DialogDescription>
        </div>
        <DialogClose render={<Button variant="ghost" size="icon" aria-label="Zamknij" />}><X className="size-5" /></DialogClose>
      </div>

      <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:px-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Szukaj: nazwa, kod albo #hex"
            className="h-11 bg-ink-wash/50 pl-9"
            aria-label="Szukaj lakieru"
          />
        </div>
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
          <FilterChip active={paletteFilter === null} onClick={() => setPaletteFilter(null)}>Wszystkie</FilterChip>
          {palettes.map((palette) => <FilterChip key={palette.slug} active={paletteFilter === palette.slug} onClick={() => setPaletteFilter(palette.slug)}>
            {palette.name}
            <span className="ml-1.5 text-[0.7rem] font-normal opacity-70">{paletteNote(palette, requirementFor(palette), formatPrice, includedLabel)}</span>
          </FilterChip>)}
          {renderCount > 0 && <FilterChip active={onlyWithRender} onClick={() => setOnlyWithRender(!onlyWithRender)}>
            <Camera className="mr-1.5 inline size-3.5 align-[-2px]" />
            Z wizualizacją
            <span className="ml-1.5 text-[0.7rem] font-normal opacity-70">{renderCount}</span>
          </FilterChip>}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col-reverse sm:flex-row">
        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {paintState === 'loading' && <p className="py-10 text-center text-sm text-ink-muted">Wczytuję palety lakierów…</p>}
          {paintState === 'error' && <p className="py-10 text-center text-sm text-ink-muted">Nie udało się pobrać palet. Odśwież stronę i spróbuj ponownie.</p>}
          {paintState === 'ready' && results.length === 0 && <p className="py-10 text-center text-sm text-ink-muted">{query.trim() === '' ? 'Brak lakierów spełniających wybrane filtry.' : `Nic nie pasuje do „${query}”.`}</p>}
          {sections.map(([label, rows]) => <section key={label} className="mb-5">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-subtle">{label}</h4>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(56px,1fr))] gap-2">
              {rows.map(({ palette, color }) => {
                const active = preview?.paletteSlug === palette.slug && preview?.colorSlug === color.slug;
                return <button
                  key={`${palette.slug}/${color.slug}`}
                  type="button"
                  title={`${color.name}${color.code ? ` · ${color.code}` : ''}`}
                  aria-label={`${color.name}, ${palette.name}`}
                  aria-pressed={active}
                  onClick={() => setPreview({ paletteSlug: palette.slug, colorSlug: color.slug })}
                  className={`focus-ring relative aspect-square rounded-xl border transition-all ${active ? 'border-ink ring-2 ring-ink ring-offset-2' : 'border-line hover:border-line-strong'}`}
                  style={{ backgroundColor: color.hex }}
                >
                  {/* Kropka = ten lakier ma policzony render ramy. Ta sama
                      konwencja co w projekcie e55, tam się sprawdziła. */}
                  {bestRender(color) && <span className="absolute right-1 top-1 size-1.5 rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.25)]" />}
                </button>;
              })}
            </div>
          </section>)}
        </div>

        <aside className="shrink-0 border-b border-line bg-[#fafbfa] p-4 sm:w-[340px] sm:border-b-0 sm:border-l sm:p-5">
          {previewed ? <div className={previewHasRender ? 'block' : 'flex gap-4 sm:block'}>
            {/* Gdy jest render, zdjęcie idzie na pełną szerokość panelu także
                na telefonie - przy 96 px obok tekstu roweru nie było widać. */}
            <ColorPreview
              color={previewed.color}
              full={previewHasRender}
              className={previewHasRender
                ? 'aspect-[4/3] w-full rounded-2xl'
                : 'aspect-square w-24 shrink-0 rounded-2xl sm:w-full'}
            />
            <div className={previewHasRender ? 'mt-4 min-w-0' : 'min-w-0 flex-1 sm:mt-4'}>
              <p className="text-lg font-semibold leading-tight tracking-tight">{previewed.color.name}</p>
              <p className="mt-1 text-sm text-ink-muted">
                {previewed.palette.name}
                {previewed.color.code ? ` · ${previewed.color.code}` : ''} · {FINISH_LABELS[previewed.color.finish]}
              </p>
              <p className="mt-2 text-base font-semibold tabular-nums">
                {paletteNote(previewed.palette, requirementFor(previewed.palette), formatPrice, includedLabel, previewed.color.priceGross)}
              </p>
              {requirementFor(previewed.palette) && <p className="mt-1 text-xs text-ink-muted">
                Ten lakier wymaga opcji „{requirementFor(previewed.palette)!.name}” - ustawimy ją automatycznie po wyborze koloru.
              </p>}
              <p className="mt-2 text-[11px] leading-relaxed text-ink-subtle">
                {bestRender(previewed.color)
                  ? 'Wizualizacja poglądowa przygotowana komputerowo. Rzeczywisty odcień lakieru może się różnić od obrazu na ekranie.'
                  : 'Dla tego lakieru nie mamy jeszcze wizualizacji na ramie. Próbka pokazuje przybliżony odcień — realny kolor potwierdzimy wzornikiem.'}
              </p>
              <Button
                type="button"
                variant="brand"
                className="mt-4 hidden h-11 w-full rounded-full font-semibold sm:flex"
                onClick={() => onConfirm({ paletteSlug: previewed.palette.slug, colorSlug: previewed.color.slug }, previewed.color)}
              >
                Wybierz ten kolor
              </Button>
            </div>
          </div> : <p className="text-sm text-ink-muted">Wskaż lakier z listy, żeby zobaczyć podgląd.</p>}
        </aside>
      </div>

      {previewed && <div className="border-t border-line p-4 sm:hidden">
        <Button
          type="button"
          variant="brand"
          className="h-12 w-full rounded-full font-semibold"
          onClick={() => onConfirm({ paletteSlug: previewed.palette.slug, colorSlug: previewed.color.slug }, previewed.color)}
        >
          Wybierz {previewed.color.name}
        </Button>
      </div>}
    </DialogContent>
  </Dialog>;
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`focus-ring shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${active ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-ink hover:border-line-strong'}`}
  >
    {children}
  </button>;
}
