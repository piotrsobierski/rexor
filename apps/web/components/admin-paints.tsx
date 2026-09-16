'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
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
  variant: 'standard' | 'ultra';
  imagePath: string;
  thumbPath: string | null;
  source: string | null;
  isPublic: boolean;
};

type Availability = { product_slug: string; palette_slug: string; price_gross_override: string | null; is_active: number | string };

type PaintsData = {
  palettes: Palette[];
  colors: Color[];
  renders: Render[];
  availability: { models: Availability[]; frames: Availability[] };
};

type Product = { slug: string; name: string };

const FINISHES: Array<Color['finish']> = ['uni', 'metallic', 'pearl'];
const FINISH_LABELS: Record<Color['finish'], string> = { uni: 'uni', metallic: 'metalik', pearl: 'perła' };

const mediaUrl = (path: string) => (path.startsWith('http') ? path : `${API_BASE}${path}`);

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

  const availableNowhere = (paletteSlug: string) =>
    !data.availability.models.some((row) => row.palette_slug === paletteSlug && Number(row.is_active) === 1)
    && !data.availability.frames.some((row) => row.palette_slug === paletteSlug && Number(row.is_active) === 1);

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

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-3 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">Dostępna w</span>
            {availableNowhere(palette.slug) && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800">nigdzie - konfigurator jej nie pokaże</span>}
            {models.map((product) => <label key={`m-${product.slug}`} className="flex items-center gap-1.5">
              <Checkbox
                checked={activeFor(data.availability.models, product.slug, palette.slug)}
                onCheckedChange={(checked) => toggleAvailability('model', product.slug, palette.slug, checked === true)}
              />
              {product.name}
            </label>)}
            {frames.map((product) => <label key={`f-${product.slug}`} className="flex items-center gap-1.5">
              <Checkbox
                checked={activeFor(data.availability.frames, product.slug, palette.slug)}
                onCheckedChange={(checked) => toggleAvailability('frame', product.slug, palette.slug, checked === true)}
              />
              <span className="text-ink-muted">rama:</span> {product.name}
            </label>)}
          </div>
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
  const thumb = renders.find((render) => render.variant === 'ultra') ?? renders[0];

  return <div className="py-3">
    <button type="button" onClick={onToggle} className="focus-ring flex w-full items-center gap-3 rounded-xl text-left">
      <span className="relative size-11 shrink-0 overflow-hidden rounded-lg border border-line" style={{ backgroundColor: color.hex }}>
        {thumb && <img src={mediaUrl(thumb.thumbPath ?? thumb.imagePath)} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{color.name}{!color.isActive && <span className="ml-2 rounded bg-ink-wash px-1.5 py-0.5 text-[0.68rem] uppercase text-ink-subtle">wyłączony</span>}</span>
        <span className="mt-0.5 block truncate text-sm text-ink-muted">
          {palette?.name}{color.code ? ` · ${color.code}` : ''} · {FINISH_LABELS[color.finish]} · {color.hex}
          {renders.length > 0 && ` · ${renders.length} render(y)`}
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
  const [target, setTarget] = useState(models[0] ? `model:${models[0].slug}` : '');
  const [variant, setVariant] = useState<'standard' | 'ultra'>('standard');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<Render | null>(null);

  async function upload(file: File) {
    const [resource, slug] = target.split(':');
    if (!slug) { setMessage('Wskaż model albo ramę dla renderu.'); return; }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const media = await request('/admin/media', { method: 'POST', body: form });
      await request('/admin/paint-renders', {
        method: 'POST',
        body: JSON.stringify({
          colorId: color.id,
          [resource === 'model' ? 'modelSlug' : 'frameSlug']: slug,
          variant,
          imagePath: media.url,
          source: 'panel',
        }),
      });
      await reload();
    } catch (error) { setMessage((error as Error).message); } finally { setUploading(false); }
  }

  return <div className="border-t border-line pt-4">
    <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">Rendery</h4>
    <p className="mt-1 text-xs text-ink-muted">
      Render zależy od pary kolor + produkt: obraz ramy E55 nie pokaże tego lakieru na E82. Wariant „ultra” ma pierwszeństwo w konfiguratorze.
    </p>

    <div className="mt-3 flex flex-wrap gap-3">
      {renders.map((render) => <div key={render.id} className="w-44 rounded-xl border border-line bg-white p-2">
        <button
          type="button"
          onClick={() => setPreview(render)}
          className="focus-ring block w-full overflow-hidden rounded-lg bg-[#f2f4f2]"
          title="Pokaż w pełnym rozmiarze"
        >
          {/* Pełny plik, nie `thumbPath`: miniatury z importu mają 96 px i w tym kafelku były rozmyte. */}
          <img src={mediaUrl(render.imagePath)} alt="" loading="lazy" className="aspect-square w-full object-contain" />
        </button>
        <p className="mt-1.5 truncate text-[11px] text-ink-muted">{render.modelSlug ?? `rama: ${render.frameSlug}`} · {render.variant}</p>
        <Button size="sm" variant="ghost" className="mt-1 h-7 w-full text-red-600" onClick={async () => { if (!confirm('Usunąć ten render?')) return; try { await request(`/admin/paint-renders/${render.id}`, { method: 'DELETE' }); await reload(); } catch (error) { setMessage((error as Error).message); } }}>
          <Trash2 /> Usuń
        </Button>
      </div>)}
    </div>

    <div className="mt-3 flex flex-wrap items-end gap-2">
      <NativeSelect value={target} onChange={(event) => setTarget(event.target.value)} className="h-10">
        {models.map((product) => <option key={`m-${product.slug}`} value={`model:${product.slug}`}>{product.name}</option>)}
        {frames.map((product) => <option key={`f-${product.slug}`} value={`frame:${product.slug}`}>rama: {product.name}</option>)}
      </NativeSelect>
      <NativeSelect value={variant} onChange={(event) => setVariant(event.target.value as 'standard' | 'ultra')} className="h-10">
        <option value="standard">standard</option>
        <option value="ultra">ultra</option>
      </NativeSelect>
      <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-line px-4 text-sm font-medium hover:border-line-strong">
        <Upload className="size-4" /> {uploading ? 'Wgrywam…' : 'Wgraj render'}
        <input type="file" accept="image/*" className="sr-only" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = ''; }} />
      </label>
    </div>

    <ImagePreviewDialog
      src={preview ? mediaUrl(preview.imagePath) : null}
      caption={preview ? `${color.name} · ${preview.modelSlug ?? `rama: ${preview.frameSlug}`} · ${preview.variant}` : ''}
      onClose={() => setPreview(null)}
    />
  </div>;
}
