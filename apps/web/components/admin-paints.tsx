'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { mediaSrc } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8081/api';

type Palette = {
  id: number;
  slug: string;
  name: string;
  brand: string | null;
  kind: 'factory' | 'custom';
  description: string | null;
  priceGross: number;
  currency: string;
  requiresPartSku: string | null;
  isActive: boolean;
  sortOrder: number;
};

type Color = {
  id: number;
  paletteId: number;
  slug: string;
  code: string | null;
  name: string;
  hex: string;
  finish: 'uni' | 'metallic' | 'pearl';
  groupName: string | null;
  searchAlt: string | null;
  priceGrossOverride: number | null;
  referencePath: string | null;
  referenceSourceUrl: string | null;
  referenceIsPublic: boolean;
  isActive: boolean;
  sortOrder: number;
  renderCount: number;
};

type Render = {
  id: number;
  colorId: number;
  modelSlug: string | null;
  frameSlug: string | null;
  variant: 'standard' | 'ultra' | 'photo';
  imagePath: string;
  thumbPath: string | null;
  source: string | null;
  sortOrder: number;
  isPublic: boolean;
};

const VARIANT_LABELS: Record<Render['variant'], string> = {
  standard: 'wizualizacja standard',
  ultra: 'wizualizacja ultra',
  photo: 'zdjęcie',
};

type Availability = { product_slug: string; palette_slug: string; price_gross_override: string | null; is_active: number | string };

/** Globalny filtr „które kolory widzi klient”. Rozstrzyga go API, nie panel. */
type ColorFilter = 'all' | 'with_image' | 'with_photo';

const COLOR_FILTERS: Array<{ value: ColorFilter; label: string; help: string }> = [
  {
    value: 'all',
    label: 'Pokazuj wszystkie kolory',
    help: 'Klient widzi każdy włączony lakier z palet przypiętych do produktu. Lakiery bez zdjęcia i bez wizualizacji pokazujemy jako płaską próbkę koloru.',
  },
  {
    value: 'with_image',
    label: 'Pokazuj tylko kolory ze zdjęciem albo wizualizacją',
    help: 'Klient widzi wyłącznie lakiery, dla których mamy obraz tego produktu — zdjęcie realnego roweru albo render. Reszta znika z wyboru koloru i nie da się jej zamówić.',
  },
  {
    value: 'with_photo',
    label: 'Pokazuj tylko kolory ze zdjęciem realnego roweru',
    help: 'Najostrzejszy filtr: renderów nie wystarczy, potrzebne jest wgrane zdjęcie. Zwykle zostaje kilka lakierów, więc włączaj to świadomie.',
  },
];

type PaintsData = {
  settings: { colorFilter: ColorFilter };
  palettes: Palette[];
  colors: Color[];
  renders: Render[];
  availability: { models: Availability[]; frames: Availability[] };
};

type Product = { slug: string; name: string };

const FINISHES: Array<Color['finish']> = ['uni', 'metallic', 'pearl'];
const FINISH_LABELS: Record<Color['finish'], string> = { uni: 'uni', metallic: 'metalik', pearl: 'perła' };

const mediaUrl = mediaSrc;

/**
 * Powyżej tylu produktów listy przestają być „kilkoma kratkami w rzędzie”
 * i dostają wyszukiwarkę oraz własny pasek przewijania. Ram bywa kilkaset
 * (importy, ramy testowe), a rozlane na całą stronę pole wyboru zasłaniało
 * resztę panelu i zawieszało przeglądarkę.
 */
const MANY_PRODUCTS = 12;

type ProductRef = { key: string; slug: string; name: string; resource: 'model' | 'frame' };

function productRefs(models: Product[], frames: Product[]): ProductRef[] {
  return [
    ...models.map((product) => ({ key: `model:${product.slug}`, slug: product.slug, name: product.name, resource: 'model' as const })),
    ...frames.map((product) => ({ key: `frame:${product.slug}`, slug: product.slug, name: `rama: ${product.name}`, resource: 'frame' as const })),
  ];
}

const matchesProduct = (product: ProductRef, needle: string) =>
  needle === '' || product.name.toLowerCase().includes(needle) || product.slug.toLowerCase().includes(needle);

/** Filtr „co widać na liście”: rendery i zdjęcia referencyjne pojawiają się dla różnych kolorów. */
type GraphicFilter = 'all' | 'render' | 'reference' | 'any' | 'none';

const GRAPHIC_FILTERS: Array<{ value: GraphicFilter; label: string }> = [
  { value: 'all', label: 'Wszystkie kolory' },
  { value: 'render', label: 'Tylko z renderem' },
  { value: 'reference', label: 'Tylko ze zdjęciem referencyjnym' },
  { value: 'any', label: 'Z dowolną grafiką' },
  { value: 'none', label: 'Bez grafiki' },
];

function matchesGraphicFilter(color: Color, filter: GraphicFilter): boolean {
  const hasRender = color.renderCount > 0;
  const hasReference = color.referencePath !== null;
  if (filter === 'render') return hasRender;
  if (filter === 'reference') return hasReference;
  if (filter === 'any') return hasRender || hasReference;
  if (filter === 'none') return !hasRender && !hasReference;
  return true;
}

/**
 * Podgląd pełnego obrazu. Miniatury renderów z importu mają 96 px, więc w panelu
 * pokazujemy plik źródłowy i nigdy go nie kadrujemy - `object-contain`, nie `object-cover`.
 */
function ImagePreviewDialog({ src, caption, onClose }: { src: string | null; caption: string; onClose: () => void }) {
  return <Dialog open={src !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="w-[min(96vw,1100px)] max-w-none bg-[#101210] p-3 sm:p-4">
      <DialogTitle className="sr-only">{caption}</DialogTitle>
      {src && <img src={src} alt="" className="max-h-[78vh] w-full rounded-xl object-contain" />}
      <p className="mt-2 text-center text-xs text-white/70">{caption}</p>
    </DialogContent>
  </Dialog>;
}

/**
 * Sekcja „Lakiery”: palety, kolory, dostępność dla modeli i ram oraz rendery.
 *
 * Dane pobiera osobnym żądaniem, nie przez /admin/catalog - to 680 kolorów
 * i kilkaset renderów, których pozostałe zakładki panelu nie potrzebują.
 */
export function PaintsEditor({
  token,
  models,
  frames,
  request,
  setMessage,
}: {
  token: string;
  models: Product[];
  frames: Product[];
  request: (path: string, options?: RequestInit) => Promise<any>;
  setMessage: (value: string) => void;
}) {
  const [data, setData] = useState<PaintsData | null>(null);
  const [paletteFilter, setPaletteFilter] = useState<number | 'all'>('all');
  const [search, setSearch] = useState('');
  const [graphicFilter, setGraphicFilter] = useState<GraphicFilter>('all');
  const [expandedColor, setExpandedColor] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(60);

  async function reload() {
    setData(await request('/admin/paints'));
  }

  useEffect(() => { void reload().catch((error) => setMessage(error.message)); }, []);

  const colors = useMemo(() => {
    if (!data) return [];
    const needle = search.trim().toLowerCase();
    return data.colors.filter((color) => {
      if (paletteFilter !== 'all' && color.paletteId !== paletteFilter) return false;
      if (!matchesGraphicFilter(color, graphicFilter)) return false;
      if (needle === '') return true;
      return color.name.toLowerCase().includes(needle)
        || (color.code?.toLowerCase().includes(needle) ?? false)
        || color.hex.toLowerCase().includes(needle)
        || (color.searchAlt?.toLowerCase().includes(needle) ?? false);
    });
  }, [data, paletteFilter, search, graphicFilter]);

  useEffect(() => { setVisibleCount(60); }, [paletteFilter, search, graphicFilter]);

  if (!data) return <p className="text-sm text-ink-muted">Wczytuję lakiery…</p>;

  return <div className="grid gap-6">
    <PaintSettingsPanel data={data} models={models} frames={frames} request={request} reload={reload} setMessage={setMessage} />
    <PalettesPanel data={data} models={models} frames={frames} request={request} reload={reload} setMessage={setMessage} />

    <section className="rounded-3xl border border-line bg-white p-5 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Kolory</h2>
          <p className="mt-1 text-sm text-ink-muted">
            {data.colors.length} lakierów w {data.palettes.length} paletach. Dopłata bierze się z palety; pole „Dopłata” nadpisuje ją dla jednego koloru.
          </p>
        </div>
        <NewColorForm palettes={data.palettes} request={request} reload={reload} setMessage={setMessage} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Szukaj po nazwie, kodzie, hexie…" className="h-10 w-full sm:w-72" />
        <NativeSelect value={String(paletteFilter)} onChange={(event) => setPaletteFilter(event.target.value === 'all' ? 'all' : Number(event.target.value))} className="h-10">
          <option value="all">Wszystkie palety</option>
          {data.palettes.map((palette) => <option key={palette.id} value={palette.id}>{palette.name}</option>)}
        </NativeSelect>
        <NativeSelect value={graphicFilter} onChange={(event) => setGraphicFilter(event.target.value as GraphicFilter)} className="h-10">
          {GRAPHIC_FILTERS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </NativeSelect>
        <span className="ml-auto text-sm text-ink-muted">{colors.length} pozycji</span>
      </div>

      <div className="mt-4 divide-y divide-line">
        {colors.slice(0, visibleCount).map((color) => <ColorRow
          key={color.id}
          color={color}
          palette={data.palettes.find((item) => item.id === color.paletteId)}
          renders={data.renders.filter((render) => render.colorId === color.id)}
          models={models}
          frames={frames}
          token={token}
          expanded={expandedColor === color.id}
          onToggle={() => setExpandedColor(expandedColor === color.id ? null : color.id)}
          request={request}
          reload={reload}
          setMessage={setMessage}
        />)}
      </div>
      {colors.length > visibleCount && <Button variant="outline" className="mt-4" onClick={() => setVisibleCount((value) => value + 120)}>
        Pokaż kolejne ({colors.length - visibleCount})
      </Button>}
    </section>
  </div>;
}

/**
 * Ustawienia wspólne dla wszystkich palet.
 *
 * Filtr rozstrzyga API (`paintPalettesFor`), więc ukrytego koloru nie da się
 * ani zobaczyć, ani zamówić z pominięciem konfiguratora. Panel pokazuje go
 * razem z tabelką skutków: liczby są liczone per produkt, bo obraz należy do
 * PARY kolor + produkt - ten sam lakier bywa policzony na E55 i nie na E82.
 */
function PaintSettingsPanel({
  data, models, frames, request, reload, setMessage,
}: {
  data: PaintsData;
  models: Product[];
  frames: Product[];
  request: (path: string, options?: RequestInit) => Promise<any>;
  reload: () => Promise<void>;
  setMessage: (value: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [rowSearch, setRowSearch] = useState('');
  const [onlyProblems, setOnlyProblems] = useState(false);
  const current = data.settings.colorFilter;

  // Ile kolorów zostanie klientowi przy każdym z ustawień - dla każdego
  // produktu osobno. Wszystkie dane są już w panelu, więc liczymy na miejscu,
  // zamiast dokładać endpoint podsumowania.
  const impact = useMemo(() => {
    const paletteById = new Map(data.palettes.map((palette) => [palette.id, palette]));
    const activeColors = data.colors.filter((color) => color.isActive && (paletteById.get(color.paletteId)?.isActive ?? false));
    const products = [
      ...models.map((product) => ({ ...product, resource: 'model' as const })),
      ...frames.map((product) => ({ ...product, resource: 'frame' as const })),
    ];

    return products.map((product) => {
      const rows = product.resource === 'model' ? data.availability.models : data.availability.frames;
      const paletteSlugs = new Set(rows
        .filter((row) => row.product_slug === product.slug && Number(row.is_active) === 1)
        .map((row) => row.palette_slug));
      const colors = activeColors.filter((color) => {
        const palette = paletteById.get(color.paletteId);
        return palette !== undefined && paletteSlugs.has(palette.slug);
      });

      const imagesFor = new Map<number, Render[]>();
      for (const render of data.renders) {
        if (!render.isPublic) continue;
        if (product.resource === 'model' ? render.modelSlug !== product.slug : render.frameSlug !== product.slug) continue;
        imagesFor.set(render.colorId, [...(imagesFor.get(render.colorId) ?? []), render]);
      }

      return {
        key: `${product.resource}:${product.slug}`,
        name: product.resource === 'frame' ? `rama: ${product.name}` : product.name,
        all: colors.length,
        withImage: colors.filter((color) => (imagesFor.get(color.id)?.length ?? 0) > 0).length,
        withPhoto: colors.filter((color) => (imagesFor.get(color.id) ?? []).some((render) => render.variant === 'photo')).length,
      };
    });
  }, [data, models, frames]);

  async function choose(value: ColorFilter) {
    if (value === current || saving) return;
    setSaving(true);
    try {
      await request('/admin/paint-settings', { method: 'POST', body: JSON.stringify({ colorFilter: value }) });
      await reload();
    } catch (error) { setMessage((error as Error).message); } finally { setSaving(false); }
  }

  const visible = (row: (typeof impact)[number]) => (current === 'with_photo' ? row.withPhoto : current === 'with_image' ? row.withImage : row.all);
  const problems = impact.filter((row) => visible(row) === 0);
  const needle = rowSearch.trim().toLowerCase();
  const rows = impact.filter((row) => {
    if (onlyProblems && visible(row) > 0) return false;
    return needle === '' || row.name.toLowerCase().includes(needle);
  });

  return <section className="rounded-3xl border border-line bg-white p-5 sm:p-7">
    <h2 className="text-2xl font-semibold tracking-tight">Ustawienia globalne palet</h2>
    <p className="mt-1 max-w-3xl text-sm text-ink-muted">
      Dotyczą wszystkich palet naraz i działają od razu po zapisaniu — także dla klientów, którzy mają już otwarty konfigurator.
      Nic tu nie kasuje ani nie wyłącza kolorów: ukryte lakiery czekają w panelu i wracają, gdy zmienisz ustawienie
      albo wgrasz brakujące zdjęcia.
    </p>

    <h3 className="mt-5 text-xs font-semibold uppercase tracking-wider text-ink-subtle">Które kolory widzi klient</h3>
    <div className="mt-2 grid gap-2">
      {COLOR_FILTERS.map((option) => <label
        key={option.value}
        className={`flex cursor-pointer gap-3 rounded-2xl border p-4 transition-colors ${current === option.value ? 'border-ink bg-[#fafbfa]' : 'border-line hover:border-line-strong'}`}
      >
        <input
          type="radio"
          name="paint-color-filter"
          className="mt-1 size-4 shrink-0 accent-black"
          checked={current === option.value}
          disabled={saving}
          onChange={() => void choose(option.value)}
        />
        <span className="min-w-0">
          <span className="block font-semibold">{option.label}</span>
          <span className="mt-0.5 block text-sm text-ink-muted">{option.help}</span>
        </span>
      </label>)}
    </div>

    <h3 className="mt-6 text-xs font-semibold uppercase tracking-wider text-ink-subtle">Co to znaczy dla poszczególnych produktów</h3>
    <p className="mt-1 max-w-3xl text-sm text-ink-muted">
      Zdjęcia i wizualizacje są przypisane do pary <strong className="font-semibold text-ink">kolor + produkt</strong>, więc ten sam
      lakier bywa policzony dla jednego roweru, a dla drugiego nie. Kolumna „widoczne teraz” pokazuje, ile kolorów zobaczy klient
      przy obecnym ustawieniu.
    </p>
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <Input
        value={rowSearch}
        onChange={(event) => setRowSearch(event.target.value)}
        placeholder="Szukaj produktu…"
        className="h-9 w-full text-sm sm:w-64"
      />
      <span className="text-xs text-ink-muted">{rows.length} z {impact.length} produktów</span>
      {problems.length > 0 && <button
        type="button"
        onClick={() => setOnlyProblems(!onlyProblems)}
        className="focus-ring rounded text-xs font-medium text-ink underline underline-offset-4"
      >
        {onlyProblems ? 'pokaż wszystkie produkty' : `pokaż tylko ${problems.length} bez kolorów`}
      </button>}
    </div>

    {/* Ram bywa kilkaset, więc tabela dostaje własne przewijanie zamiast
        rozpychać stronę na kilkanaście ekranów. */}
    <div className="mt-3 max-h-96 overflow-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead className="sticky top-0 bg-white text-left text-xs uppercase tracking-wider text-ink-subtle">
          <tr>
            <th className="py-2 pr-3 font-semibold">Produkt</th>
            <th className="py-2 pr-3 text-right font-semibold">Wszystkie</th>
            <th className="py-2 pr-3 text-right font-semibold">Ze zdjęciem lub renderem</th>
            <th className="py-2 pr-3 text-right font-semibold">Ze zdjęciem</th>
            <th className="py-2 text-right font-semibold">Widoczne teraz</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => <tr key={row.key} className="border-t border-line">
            <td className="py-2 pr-3">{row.name}</td>
            <td className="py-2 pr-3 text-right tabular-nums text-ink-muted">{row.all}</td>
            <td className="py-2 pr-3 text-right tabular-nums text-ink-muted">{row.withImage}</td>
            <td className="py-2 pr-3 text-right tabular-nums text-ink-muted">{row.withPhoto}</td>
            <td className={`py-2 text-right font-semibold tabular-nums ${visible(row) === 0 ? 'text-red-600' : ''}`}>{visible(row)}</td>
          </tr>)}
        </tbody>
      </table>
    </div>
    {problems.length > 0 && <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm text-red-700">
      Przy tym ustawieniu {problems.length === 1 ? 'jeden produkt nie ma' : `${problems.length} produktów nie ma`} ani jednego koloru do wyboru
      — sekcja lakierowania będzie u {problems.length === 1 ? 'niego' : 'nich'} pusta ({problems.slice(0, 3).map((row) => row.name).join(', ')}
      {problems.length > 3 ? ` i ${problems.length - 3} więcej` : ''}). Wgraj zdjęcia albo wróć do łagodniejszego filtra.
    </p>}
  </section>;
}

function PalettesPanel({
  data, models, frames, request, reload, setMessage,
}: {
  data: PaintsData;
  models: Product[];
  frames: Product[];
  request: (path: string, options?: RequestInit) => Promise<any>;
  reload: () => Promise<void>;
  setMessage: (value: string) => void;
}) {
  const [drafts, setDrafts] = useState<Record<number, Palette>>(() => Object.fromEntries(data.palettes.map((row) => [row.id, { ...row }])));
  const [newName, setNewName] = useState('');
  const products = useMemo(() => productRefs(models, frames), [models, frames]);
  useEffect(() => { setDrafts(Object.fromEntries(data.palettes.map((row) => [row.id, { ...row }]))); }, [data.palettes]);

  async function save(palette: Palette) {
    try {
      await request(`/admin/paint-palettes/${palette.id}`, { method: 'PATCH', body: JSON.stringify(palette) });
      await reload();
    } catch (error) { setMessage((error as Error).message); }
  }

  async function toggleAvailability(resource: 'model' | 'frame', productSlug: string, paletteSlug: string, isActive: boolean) {
    try {
      await request('/admin/paint-availability', {
        method: 'POST',
        body: JSON.stringify({ resource, productSlug, paletteSlug, isActive }),
      });
      await reload();
    } catch (error) { setMessage((error as Error).message); }
  }

  // Number(): MySQL przez PDO zwraca TINYINT raz jako liczbę, raz jako '1'
  // (zależnie od emulacji przygotowanych zapytań na hostingu). Ścisłe
  // porównanie z 1 odznaczało wtedy wszystkie pola mimo aktywnego wiersza.
  const activeFor = (rows: Availability[], productSlug: string, paletteSlug: string) =>
    rows.some((row) => row.product_slug === productSlug && row.palette_slug === paletteSlug && Number(row.is_active) === 1);

  // Licznik obok pól wyboru. Sam znaczek w gęstym rzędzie łatwo przeoczyć,
  // a różnica „nigdzie" / „wszędzie" decyduje o tym, czy konfigurator pokaże
  // paletę - więc stan musi dać się odczytać bez wpatrywania się w kwadraciki.
  const activeCount = (paletteSlug: string) =>
    models.filter((product) => activeFor(data.availability.models, product.slug, paletteSlug)).length
    + frames.filter((product) => activeFor(data.availability.frames, product.slug, paletteSlug)).length;

  const productCount = models.length + frames.length;

  return <section className="rounded-3xl border border-line bg-white p-5 sm:p-7">
    <h2 className="text-2xl font-semibold tracking-tight">Palety</h2>
    <p className="mt-1 text-sm text-ink-muted">
      Dopłata jest ceną sprzedaży za kolor — nie przechodzi przez narzut modelu. „Wymaga opcji” pilnuje, żeby lakier z palety
      płatnej nie stanął obok lakierowania standardowego; konfigurator podnosi tę opcję sam.
    </p>

    <div className="mt-5 grid gap-3">
      {data.palettes.map((palette) => {
        const draft = drafts[palette.id] ?? palette;
        return <div key={palette.id} className="rounded-2xl border border-line p-4">
          <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr_auto]">
            <div className="grid gap-1.5">
              <Label className="text-xs text-ink-subtle">Nazwa</Label>
              <Input value={draft.name} onChange={(event) => setDrafts({ ...drafts, [palette.id]: { ...draft, name: event.target.value } })} className="h-10" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs text-ink-subtle">Dopłata brutto</Label>
              <Input type="number" step="1" value={draft.priceGross} onChange={(event) => setDrafts({ ...drafts, [palette.id]: { ...draft, priceGross: Number(event.target.value) } })} className="h-10" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs text-ink-subtle">Wymaga opcji (SKU)</Label>
              <Input value={draft.requiresPartSku ?? ''} placeholder="np. paint-single-color" onChange={(event) => setDrafts({ ...drafts, [palette.id]: { ...draft, requiresPartSku: event.target.value } })} className="h-10" />
            </div>
            <div className="flex items-end gap-2">
              <label className="flex h-10 items-center gap-2 text-sm">
                <Checkbox checked={draft.isActive} onCheckedChange={(checked) => setDrafts({ ...drafts, [palette.id]: { ...draft, isActive: checked === true } })} />
                aktywna
              </label>
              <Button size="sm" onClick={() => save(draft)}>Zapisz</Button>
            </div>
          </div>

          <AvailabilityPicker
            paletteSlug={palette.slug}
            products={products}
            activeCount={activeCount(palette.slug)}
            productCount={productCount}
            isActive={(product) => activeFor(product.resource === 'model' ? data.availability.models : data.availability.frames, product.slug, palette.slug)}
            onToggle={(product, isActive) => toggleAvailability(product.resource, product.slug, palette.slug, isActive)}
          />
        </div>;
      })}
    </div>

    <div className="mt-4 flex gap-2">
      <Input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Nazwa nowej palety" className="h-10 max-w-xs" />
      <Button
        variant="outline"
        onClick={async () => {
          if (!newName.trim()) { setMessage('Podaj nazwę palety.'); return; }
          try {
            await request('/admin/paint-palettes', { method: 'POST', body: JSON.stringify({ name: newName, kind: 'custom' }) });
            setNewName('');
            await reload();
          } catch (error) { setMessage((error as Error).message); }
        }}
      >
        <Plus /> Dodaj paletę
      </Button>
    </div>
  </section>;
}

/**
 * „Dostępna w” dla jednej palety.
 *
 * Przy trzech rowerach to zwykły rząd pól wyboru. Przy kilkuset ramach rząd
 * rozlewał się na ekrany w dół i panel stawał się nie do użycia, więc lista
 * dostaje wyszukiwarkę, własne przewijanie i domyślnie pokazuje tylko to,
 * co jest włączone - resztę znajduje się po nazwie.
 */
function AvailabilityPicker({
  paletteSlug, products, activeCount, productCount, isActive, onToggle,
}: {
  paletteSlug: string;
  products: ProductRef[];
  activeCount: number;
  productCount: number;
  isActive: (product: ProductRef) => boolean;
  onToggle: (product: ProductRef, isActive: boolean) => void;
}) {
  const crowded = products.length > MANY_PRODUCTS;
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(!crowded);

  const needle = search.trim().toLowerCase();
  const visible = products.filter((product) => {
    if (!matchesProduct(product, needle)) return false;
    return showAll || needle !== '' || isActive(product);
  });

  return <div className="mt-3 border-t border-line pt-3">
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">Dostępna w</span>
      {activeCount === 0
        ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800">nigdzie - konfigurator jej nie pokaże</span>
        : <span className="rounded-full bg-ink-wash px-2 py-0.5 text-xs text-ink-muted">
          {activeCount === productCount ? `wszędzie (${activeCount}/${productCount})` : `${activeCount}/${productCount} produktów`}
        </span>}
      {crowded && <>
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Szukaj produktu…"
          className="h-8 w-full text-sm sm:w-56"
        />
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="focus-ring rounded text-xs font-medium text-ink underline underline-offset-4"
        >
          {showAll ? 'pokaż tylko włączone' : `pokaż wszystkie (${products.length})`}
        </button>
      </>}
    </div>

    <div className={`mt-2 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3 ${crowded ? 'max-h-52 overflow-y-auto pr-1' : ''}`}>
      {visible.length === 0 && <p className="text-xs text-ink-muted">
        {needle === '' ? 'Nic nie jest włączone - użyj „pokaż wszystkie”.' : 'Żaden produkt nie pasuje do wyszukiwania.'}
      </p>}
      {visible.map((product) => <label key={`${paletteSlug}-${product.key}`} className="flex min-w-0 items-center gap-1.5">
        <Checkbox
          checked={isActive(product)}
          onCheckedChange={(checked) => onToggle(product, checked === true)}
        />
        <span className="truncate">{product.name}</span>
      </label>)}
    </div>
  </div>;
}

function NewColorForm({
  palettes, request, reload, setMessage,
}: {
  palettes: Palette[];
  request: (path: string, options?: RequestInit) => Promise<any>;
  reload: () => Promise<void>;
  setMessage: (value: string) => void;
}) {
  const [draft, setDraft] = useState({ paletteId: String(palettes[0]?.id ?? ''), name: '', code: '', hex: '#000000', finish: 'uni' });

  return <div className="flex flex-wrap items-end gap-2">
    <NativeSelect value={draft.paletteId} onChange={(event) => setDraft({ ...draft, paletteId: event.target.value })} className="h-10">
      {palettes.map((palette) => <option key={palette.id} value={palette.id}>{palette.name}</option>)}
    </NativeSelect>
    <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Nazwa" className="h-10 w-36" />
    <Input value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value })} placeholder="Kod" className="h-10 w-24" />
    <input type="color" value={draft.hex} onChange={(event) => setDraft({ ...draft, hex: event.target.value })} className="h-10 w-12 cursor-pointer rounded-lg border border-line" aria-label="Kolor" />
    <NativeSelect value={draft.finish} onChange={(event) => setDraft({ ...draft, finish: event.target.value })} className="h-10">
      {FINISHES.map((finish) => <option key={finish} value={finish}>{FINISH_LABELS[finish]}</option>)}
    </NativeSelect>
    <Button
      variant="outline"
      onClick={async () => {
        if (!draft.name.trim()) { setMessage('Podaj nazwę koloru.'); return; }
        try {
          await request('/admin/paint-colors', { method: 'POST', body: JSON.stringify({ ...draft, paletteId: Number(draft.paletteId) }) });
          setDraft({ ...draft, name: '', code: '' });
          await reload();
        } catch (error) { setMessage((error as Error).message); }
      }}
    >
      <Plus /> Dodaj kolor
    </Button>
  </div>;
}

function ColorRow({
  color, palette, renders, models, frames, token, expanded, onToggle, request, reload, setMessage,
}: {
  color: Color;
  palette: Palette | undefined;
  renders: Render[];
  models: Product[];
  frames: Product[];
  token: string;
  expanded: boolean;
  onToggle: () => void;
  request: (path: string, options?: RequestInit) => Promise<any>;
  reload: () => Promise<void>;
  setMessage: (value: string) => void;
}) {
  const [draft, setDraft] = useState<Color>({ ...color });
  useEffect(() => { setDraft({ ...color }); }, [color]);

  const effectivePrice = color.priceGrossOverride ?? palette?.priceGross ?? 0;
  // Ta sama kolejność co w konfiguratorze: zdjęcie bije „ultra”, „ultra” bije
  // „standard” - miniatura w panelu pokazuje to, co zobaczy klient.
  const thumb = renders.find((render) => render.variant === 'photo')
    ?? renders.find((render) => render.variant === 'ultra')
    ?? renders[0];

  return <div className="py-3">
    <button type="button" onClick={onToggle} className="focus-ring flex w-full items-center gap-3 rounded-xl text-left">
      <span className="relative size-11 shrink-0 overflow-hidden rounded-lg border border-line" style={{ backgroundColor: color.hex }}>
        {thumb && <img src={mediaUrl(thumb.thumbPath ?? thumb.imagePath)} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{color.name}{!color.isActive && <span className="ml-2 rounded bg-ink-wash px-1.5 py-0.5 text-[0.68rem] uppercase text-ink-subtle">wyłączony</span>}</span>
        <span className="mt-0.5 block truncate text-sm text-ink-muted">
          {palette?.name}{color.code ? ` · ${color.code}` : ''} · {FINISH_LABELS[color.finish]} · {color.hex}
          {renders.filter((render) => render.variant !== 'photo').length > 0 && ` · ${renders.filter((render) => render.variant !== 'photo').length} render(y)`}
          {renders.filter((render) => render.variant === 'photo').length > 0 && ` · ${renders.filter((render) => render.variant === 'photo').length} zdjęcie/zdjęcia`}
        </span>
      </span>
      <span className="shrink-0 text-sm font-semibold tabular-nums">{effectivePrice === 0 ? 'w cenie' : `+${effectivePrice} zł`}</span>
    </button>

    {expanded && <div className="mt-3 grid gap-4 rounded-2xl bg-[#fafbfa] p-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="grid gap-1.5"><Label className="text-xs text-ink-subtle">Nazwa</Label><Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="h-10" /></div>
        <div className="grid gap-1.5"><Label className="text-xs text-ink-subtle">Kod</Label><Input value={draft.code ?? ''} onChange={(event) => setDraft({ ...draft, code: event.target.value })} className="h-10" /></div>
        <div className="grid gap-1.5"><Label className="text-xs text-ink-subtle">Hex</Label><div className="flex gap-2"><input type="color" value={draft.hex} onChange={(event) => setDraft({ ...draft, hex: event.target.value.toUpperCase() })} className="h-10 w-12 cursor-pointer rounded-lg border border-line" aria-label="Kolor" /><Input value={draft.hex} onChange={(event) => setDraft({ ...draft, hex: event.target.value.toUpperCase() })} className="h-10" /></div></div>
        <div className="grid gap-1.5"><Label className="text-xs text-ink-subtle">Rodzaj</Label><NativeSelect value={draft.finish} onChange={(event) => setDraft({ ...draft, finish: event.target.value as Color['finish'] })} className="h-10">{FINISHES.map((finish) => <option key={finish} value={finish}>{FINISH_LABELS[finish]}</option>)}</NativeSelect></div>
        <div className="grid gap-1.5"><Label className="text-xs text-ink-subtle">Grupa</Label><Input value={draft.groupName ?? ''} onChange={(event) => setDraft({ ...draft, groupName: event.target.value })} className="h-10" /></div>
        <div className="grid gap-1.5">
          <Label className="text-xs text-ink-subtle">Dopłata (nadpisuje paletę)</Label>
          <Input type="number" step="1" value={draft.priceGrossOverride ?? ''} placeholder={String(palette?.priceGross ?? 0)} onChange={(event) => setDraft({ ...draft, priceGrossOverride: event.target.value === '' ? null : Number(event.target.value) })} className="h-10" />
        </div>
        <div className="grid gap-1.5 sm:col-span-2"><Label className="text-xs text-ink-subtle">Synonimy do wyszukiwarki</Label><Input value={draft.searchAlt ?? ''} onChange={(event) => setDraft({ ...draft, searchAlt: event.target.value })} className="h-10" /></div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={draft.isActive} onCheckedChange={(checked) => setDraft({ ...draft, isActive: checked === true })} /> aktywny w konfiguratorze</label>
        <Button size="sm" onClick={async () => { try { await request(`/admin/paint-colors/${color.id}`, { method: 'PATCH', body: JSON.stringify(draft) }); await reload(); } catch (error) { setMessage((error as Error).message); } }}>Zapisz kolor</Button>
        <Button size="sm" variant="ghost" className="text-red-600" onClick={async () => { if (!confirm(`Usunąć kolor „${color.name}”?`)) return; try { await request(`/admin/paint-colors/${color.id}`, { method: 'DELETE' }); await reload(); } catch (error) { setMessage((error as Error).message); } }}><Trash2 /> Usuń</Button>
      </div>

      <RendersEditor color={color} renders={renders} models={models} frames={frames} request={request} reload={reload} setMessage={setMessage} />

      {color.referencePath && <div className="border-t border-line pt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">Zdjęcie referencyjne</h4>
        <p className="mt-1 text-xs text-ink-muted">
          Zdjęcie auta w tym lakierze, pobrane z zewnętrznej galerii. Domyślnie widoczne wyłącznie tutaj — publikuj je dopiero,
          gdy prawa do zdjęcia są potwierdzone.
        </p>
        <div className="mt-3 flex items-start gap-4">
          {/* Token w adresie, bo <img> nie wyśle nagłówka Authorization.
              Trasa jest wyłącznie odczytem pliku, po stronie API pod requireAdminToken(). */}
          <img src={`${API_BASE}/admin${color.referencePath}?token=${encodeURIComponent(token)}`} alt="" className="h-28 w-40 rounded-xl border border-line object-cover" />
          <div className="min-w-0 flex-1 text-sm">
            <label className="flex items-center gap-2">
              <Checkbox
                checked={draft.referenceIsPublic}
                onCheckedChange={async (checked) => {
                  const next = { ...draft, referenceIsPublic: checked === true };
                  setDraft(next);
                  try { await request(`/admin/paint-colors/${color.id}`, { method: 'PATCH', body: JSON.stringify(next) }); await reload(); } catch (error) { setMessage((error as Error).message); }
                }}
              />
              pokazuj klientom na stronie
            </label>
            {color.referenceSourceUrl && <a href={color.referenceSourceUrl} target="_blank" rel="noreferrer" className="mt-2 block truncate text-xs text-ink-muted underline underline-offset-4">{color.referenceSourceUrl}</a>}
          </div>
        </div>
      </div>}
    </div>}
  </div>;
}

/** Trzy zestawy obrazów w kolejności, w jakiej konfigurator po nie sięga. */
const SLOTS: Array<{
  variant: Render['variant'];
  title: string;
  rank: string;
  rule: string;
  multiple: boolean;
}> = [
  {
    variant: 'photo',
    title: 'Zdjęcia realnego roweru',
    rank: '1. wybór',
    rule: 'Kilka ujęć — każde wgranie dokłada kolejne.',
    multiple: true,
  },
  {
    variant: 'ultra',
    title: 'Wizualizacja ultra',
    rank: '2. wybór',
    rule: 'Jedna na produkt — nowe wgranie podmienia poprzednią.',
    multiple: false,
  },
  {
    variant: 'standard',
    title: 'Wizualizacja standard',
    rank: '3. wybór',
    rule: 'Jedna na produkt — nowe wgranie podmienia poprzednią.',
    multiple: false,
  },
];

/** Klucz „produktu” dla obrazu: rendery modeli i ram leżą w jednej tabeli. */
const renderTarget = (render: Render) => (render.modelSlug !== null ? `model:${render.modelSlug}` : `frame:${render.frameSlug}`);

/**
 * Jeden z trzech zestawów obrazów dla wybranego produktu.
 *
 * Pliki wchodzą przeciągnięciem albo kliknięciem - w obu wypadkach trafiają
 * dokładnie do tego wariantu, więc nie da się wgrać zdjęcia „w miejsce”
 * wizualizacji przez nieuwagę przy liście wyboru.
 */
function RenderSlot({
  slot, items, isWinner, uploading, onUpload, onPreview, onDelete,
}: {
  slot: (typeof SLOTS)[number];
  items: Render[];
  isWinner: boolean;
  uploading: boolean;
  onUpload: (files: File[]) => void;
  onPreview: (render: Render) => void;
  onDelete: (render: Render) => void;
}) {
  const [dragging, setDragging] = useState(false);

  function accept(list: FileList | null) {
    const files = [...(list ?? [])].filter((file) => file.type.startsWith('image/'));
    if (files.length === 0) return;
    onUpload(slot.multiple ? files : files.slice(0, 1));
  }

  return <div
    onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
    onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
    onDrop={(event) => { event.preventDefault(); setDragging(false); accept(event.dataTransfer.files); }}
    className={`flex flex-col rounded-2xl border-2 bg-white p-3 transition-colors ${dragging ? 'border-dashed border-ink bg-[#f2f4f2]' : isWinner ? 'border-ink' : 'border-line'}`}
  >
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{slot.title}</p>
        <p className="mt-0.5 text-[11px] text-ink-muted">{slot.rank} · {slot.rule}</p>
      </div>
      {isWinner && <span className="shrink-0 rounded-full bg-ink px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">to widzi klient</span>}
    </div>

    <div className="mt-3 grid flex-1 grid-cols-2 gap-2">
      {items.map((render) => <div key={render.id} className="group relative overflow-hidden rounded-xl border border-line bg-[#f2f4f2]">
        <button type="button" onClick={() => onPreview(render)} className="focus-ring block w-full" title="Pokaż w pełnym rozmiarze">
          {/* Pełny plik, nie `thumbPath`: miniatury z importu mają 96 px i w tym kafelku były rozmyte. */}
          <img src={mediaUrl(render.imagePath)} alt="" loading="lazy" className="aspect-square w-full object-contain" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(render)}
          title="Usuń"
          className="focus-ring absolute right-1 top-1 rounded-full bg-white/90 p-1.5 text-red-600 shadow-sm transition-opacity hover:bg-white"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>)}

      <label className={`focus-within:ring-2 focus-within:ring-ink/20 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line-strong p-3 text-center text-[11px] text-ink-muted hover:border-ink hover:text-ink ${items.length === 0 ? 'col-span-2 aspect-[2/1]' : 'aspect-square'}`}>
        <Upload className="size-4" />
        <span>{uploading ? 'Wgrywam…' : items.length === 0 ? 'Przeciągnij plik albo kliknij' : slot.multiple ? 'Dodaj ujęcie' : 'Podmień'}</span>
        <input
          type="file"
          accept="image/*"
          multiple={slot.multiple}
          className="sr-only"
          disabled={uploading}
          onChange={(event) => { accept(event.target.files); event.target.value = ''; }}
        />
      </label>
    </div>
  </div>;
}

function RendersEditor({
  color, renders, models, frames, request, reload, setMessage,
}: {
  color: Color;
  renders: Render[];
  models: Product[];
  frames: Product[];
  request: (path: string, options?: RequestInit) => Promise<any>;
  reload: () => Promise<void>;
  setMessage: (value: string) => void;
}) {
  const products = useMemo(() => productRefs(models, frames), [models, frames]);

  const [target, setTarget] = useState(products[0]?.key ?? '');
  const [uploadingVariant, setUploadingVariant] = useState<Render['variant'] | null>(null);
  const [preview, setPreview] = useState<Render | null>(null);
  const [productSearch, setProductSearch] = useState('');

  // Render należy do pary kolor + produkt, więc wszystko poniżej idzie za
  // wybranym produktem: jeden przełącznik steruje i podglądem, i celem
  // wgrywania, żeby nie dało się wgrać obrazu pod inny rower, niż się ogląda.
  const current = products.find((product) => product.key === target) ?? products[0];
  const crowded = products.length > MANY_PRODUCTS;
  const needle = productSearch.trim().toLowerCase();
  const shownProducts = products.filter((product) => product.key === current?.key || matchesProduct(product, needle));
  const forTarget = renders.filter((render) => renderTarget(render) === current?.key);
  const bySlot = (variant: Render['variant']) => forTarget.filter((render) => render.variant === variant);
  const winner = SLOTS.find((slot) => bySlot(slot.variant).length > 0)?.variant ?? null;

  async function upload(variant: Render['variant'], files: File[]) {
    if (!current) { setMessage('Wskaż model albo ramę dla obrazu.'); return; }
    setUploadingVariant(variant);
    try {
      // Sekwencyjnie, nie równolegle: `sort_order` kolejnego zdjęcia liczy się
      // z maksimum już zapisanych, więc równoległe zapisy dałyby remis
      // i przypadkową kolejność ujęć.
      for (const file of files) {
        const form = new FormData();
        form.append('file', file);
        const media = await request('/admin/media', { method: 'POST', body: form });
        await request('/admin/paint-renders', {
          method: 'POST',
          body: JSON.stringify({
            colorId: color.id,
            [current.resource === 'model' ? 'modelSlug' : 'frameSlug']: current.slug,
            variant,
            imagePath: media.url,
            source: 'panel',
          }),
        });
      }
      await reload();
    } catch (error) { setMessage((error as Error).message); } finally { setUploadingVariant(null); }
  }

  async function remove(render: Render) {
    if (!confirm(render.variant === 'photo' ? 'Usunąć to zdjęcie?' : 'Usunąć tę wizualizację?')) return;
    try {
      await request(`/admin/paint-renders/${render.id}`, { method: 'DELETE' });
      await reload();
    } catch (error) { setMessage((error as Error).message); }
  }

  return <div className="border-t border-line pt-4">
    <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">Rendery i zdjęcia</h4>
    <p className="mt-1 text-xs text-ink-muted">
      Obraz należy do pary kolor + produkt: obraz E55 nie pokaże tego lakieru na E82. Najpierw wybierz produkt,
      potem przeciągnij plik do właściwego zestawu. Konfigurator bierze pierwszy zestaw, w którym coś jest:
      <strong className="font-semibold text-ink"> zdjęcie → ultra → standard</strong>.
    </p>

    <div className="mt-4 flex flex-wrap items-center gap-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">1 · Produkt</p>
      {crowded && <>
        <Input
          value={productSearch}
          onChange={(event) => setProductSearch(event.target.value)}
          placeholder="Szukaj modelu albo ramy…"
          className="h-9 w-full text-sm sm:w-64"
        />
        <span className="text-xs text-ink-muted">{shownProducts.length} z {products.length}</span>
      </>}
    </div>

    {/* Przy kilkuset ramach rząd chipów zająłby kilkanaście ekranów, więc
        dostaje wyszukiwarkę i własne przewijanie. Wybrany produkt jest zawsze
        na liście, nawet gdy wypadnie z wyszukiwania. */}
    <div className={`mt-2 flex flex-wrap gap-2 ${crowded ? 'max-h-40 overflow-y-auto pr-1' : ''}`}>
      {shownProducts.length === 0 && <p className="text-xs text-ink-muted">Żaden produkt nie pasuje do wyszukiwania.</p>}
      {shownProducts.map((product) => {
        const count = renders.filter((render) => renderTarget(render) === product.key).length;
        const active = product.key === current?.key;
        return <button
          key={product.key}
          type="button"
          onClick={() => setTarget(product.key)}
          aria-pressed={active}
          className={`focus-ring flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-colors ${active ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:border-line-strong'}`}
        >
          <span className="font-medium">{product.name}</span>
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${active ? 'bg-white/20' : count === 0 ? 'bg-amber-50 text-amber-800' : 'bg-ink-wash text-ink-muted'}`}>
            {count === 0 ? 'brak' : count}
          </span>
        </button>;
      })}
    </div>

    <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
      2 · Obrazy: <span className="text-ink">{color.name}</span> na <span className="text-ink">{current?.name ?? '—'}</span>
    </p>
    <div className="mt-2 grid gap-3 lg:grid-cols-3">
      {SLOTS.map((slot) => <RenderSlot
        key={slot.variant}
        slot={slot}
        items={bySlot(slot.variant)}
        isWinner={winner === slot.variant}
        uploading={uploadingVariant === slot.variant}
        onUpload={(files) => void upload(slot.variant, files)}
        onPreview={setPreview}
        onDelete={(render) => void remove(render)}
      />)}
    </div>
    {winner === null && <p className="mt-2 text-xs text-amber-800">
      Ten lakier nie ma żadnego obrazu dla: {current?.name}. Przy filtrze „tylko kolory ze zdjęciem albo wizualizacją” klient go tu nie zobaczy.
    </p>}

    <ImagePreviewDialog
      src={preview ? mediaUrl(preview.imagePath) : null}
      caption={preview ? `${color.name} · ${preview.modelSlug ?? `rama: ${preview.frameSlug}`} · ${VARIANT_LABELS[preview.variant]}` : ''}
      onClose={() => setPreview(null)}
    />
  </div>;
}
