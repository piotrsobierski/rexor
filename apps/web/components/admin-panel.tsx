'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Bold, ExternalLink, ImagePlus, Italic, List, LogOut, RefreshCw, Save, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8081/api';

type Row = Record<string, string | number | boolean | null> & { id: number };
type MediaRow = { model_id: number; media_id: number; role: string; storage_path: string; alt_text: string };
type ModelPartRow = { model_id: number; part_id: number; group_id: number; group_slug: string; is_default: number | boolean; is_customer_configurable: number | boolean; customer_supplied_allowed: number | boolean; customer_supplied_gross_price: string | number; gross_price_override: string | number | null; sort_order: number; notes: string | null };
type GroupSettingsRow = { model_id: number; group_id: number; group_slug: string; selection_mode: string; customer_part_allowed: number | boolean; customer_part_gross_price: string | number; customer_part_label: string; helper_text: string | null };
type PricingLine = { groupSlug: string; groupName: string; name: string; grossPrice: number };
type ModelPricing = { modelId: number; framePriceGross: number; batteryPriceGross: number; componentsPriceGross: number; assemblyPriceGross: number; marginPercent: number; marginAmountGross: number; grossTotal: number; issues: string[]; notes: string[]; lines: PricingLine[] };
type Catalog = { categories: Row[]; models: Row[]; parts: Row[]; partGroups: Row[]; modelParts: ModelPartRow[]; modelGroupSettings: GroupSettingsRow[]; modelSizes: Row[]; modelPricing: Record<string, ModelPricing>; batteries: Row[]; inquiries: Row[]; pages: Row[]; modelMedia: MediaRow[]; theme: Record<string, string> };

export function AdminPanel() {
  const [token, setToken] = useState('');
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [email, setEmail] = useState('admin@rexor.local');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => { const saved = sessionStorage.getItem('rexor_admin_token'); if (saved) { setToken(saved); void loadCatalog(saved); } }, []);

  async function request(path: string, options: RequestInit = {}, authToken = token) {
    const response = await fetch(`${API_BASE}${path}`, { ...options, headers: { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}), ...options.headers } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? 'Operacja nie powiodła się.');
    return data;
  }

  async function loadCatalog(authToken = token) {
    try { setCatalog(await request('/admin/catalog', {}, authToken)); setMessage(''); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Nie udało się pobrać danych.'); if ((error as Error).message.includes('Sesja')) logout(); }
  }

  async function login(event: FormEvent) {
    event.preventDefault(); setMessage('Logowanie…');
    try { const result = await request('/admin/login', { method: 'POST', body: JSON.stringify({ email, password }) }, ''); sessionStorage.setItem('rexor_admin_token', result.token); setToken(result.token); setPassword(''); await loadCatalog(result.token); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Nie udało się zalogować.'); }
  }

  function logout() { sessionStorage.removeItem('rexor_admin_token'); setToken(''); setCatalog(null); }

  async function patch(resource: string, id: number, fields: Record<string, unknown>) {
    setMessage('Zapisuję…');
    try { await request(`/admin/${resource}/${id}`, { method: 'PATCH', body: JSON.stringify(fields) }); await loadCatalog(); setMessage('Zmiany zapisane.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Nie udało się zapisać.'); }
  }

  if (!token || !catalog) return <main className="grid min-h-screen place-items-center bg-[#111] px-4"><form onSubmit={login} className="w-full max-w-sm rounded-3xl bg-white p-7"><img src="/brand/rexor-logo.png" alt="Rexor" className="w-32" /><p className="eyebrow mt-10">Panel administracyjny</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Zaloguj się</h1><div className="mt-6 grid gap-4"><div className="grid gap-1.5"><Label htmlFor="admin-email">E-mail</Label><Input id="admin-email" type="email" required className="h-11" value={email} onChange={(event) => setEmail(event.target.value)} /></div><div className="grid gap-1.5"><Label htmlFor="admin-password">Hasło</Label><Input id="admin-password" type="password" required className="h-11" value={password} onChange={(event) => setPassword(event.target.value)} /></div><Button type="submit" className="h-11 rounded-full bg-ink text-white">Zaloguj</Button>{message && <p className="text-center text-sm text-ink-muted">{message}</p>}</div></form></main>;

  return <div className="min-h-screen bg-[#f4f5f2]"><header className="border-b border-line bg-white"><div className="mx-auto flex h-18 max-w-[1500px] items-center justify-between px-4 sm:px-8"><a href="/"><img src="/brand/rexor-logo.png" alt="Rexor" className="w-28" /></a><div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => loadCatalog()}><RefreshCw /> Odśwież</Button><Button variant="ghost" size="sm" onClick={logout}><LogOut /> Wyloguj</Button></div></div></header><main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-8"><div className="mb-8"><p className="eyebrow">Rexor CMS</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">Treść, oferta i wygląd</h1>{message && <p className="mt-3 text-sm text-ink-muted" role="status">{message}</p>}</div>
    <Tabs defaultValue="models"><TabsList className="no-scrollbar mb-6 h-auto max-w-full justify-start overflow-x-auto rounded-full bg-white p-1"><TabsTrigger value="models" className="rounded-full px-4 py-2">Modele i zdjęcia</TabsTrigger><TabsTrigger value="categories" className="rounded-full px-4 py-2">Kategorie</TabsTrigger><TabsTrigger value="equipment" className="rounded-full px-4 py-2">Osprzęt i cena modelu</TabsTrigger><TabsTrigger value="parts" className="rounded-full px-4 py-2">Części i ceny</TabsTrigger><TabsTrigger value="batteries" className="rounded-full px-4 py-2">Baterie</TabsTrigger><TabsTrigger value="service" className="rounded-full px-4 py-2">Serwis</TabsTrigger><TabsTrigger value="theme" className="rounded-full px-4 py-2">Kolory</TabsTrigger><TabsTrigger value="inquiries" className="rounded-full px-4 py-2">Zapytania</TabsTrigger></TabsList>
      <TabsContent value="models"><ModelsEditor rows={catalog.models} media={catalog.modelMedia} categories={catalog.categories} patch={patch} request={request} reload={loadCatalog} setMessage={setMessage} /></TabsContent>
      <TabsContent value="categories"><SimpleEditor resource="categories" rows={catalog.categories} patch={patch} fields={[['name', 'Nazwa'], ['short_description', 'Krótki opis']]} /></TabsContent>
      <TabsContent value="equipment"><ModelEquipmentEditor catalog={catalog} patch={patch} request={request} reload={loadCatalog} setMessage={setMessage} /></TabsContent>
      <TabsContent value="parts"><SimpleEditor resource="parts" rows={catalog.parts} patch={patch} fields={[['name', 'Nazwa części'], ['gross_price', 'Cena brutto']]} /></TabsContent>
      <TabsContent value="batteries"><BatteriesEditor batteries={catalog.batteries ?? []} models={catalog.models} request={request} reload={loadCatalog} setMessage={setMessage} /></TabsContent>
      <TabsContent value="service"><PageEditor page={catalog.pages.find((page) => page.slug === 'serwis')} patch={patch} request={request} /></TabsContent>
      <TabsContent value="theme"><ThemeEditor theme={catalog.theme} request={request} reload={loadCatalog} setMessage={setMessage} /></TabsContent>
      <TabsContent value="inquiries"><InquiriesTable rows={catalog.inquiries} /></TabsContent>
    </Tabs>
  </main></div>;
}

function Panel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) { return <section className="rounded-3xl border border-line bg-white p-5 sm:p-7"><h2 className="text-2xl font-semibold tracking-tight">{title}</h2><p className="mt-1 text-sm text-ink-muted">{description}</p><div className="mt-6">{children}</div></section>; }

function SimpleEditor({ resource, rows, patch, fields }: { resource: string; rows: Row[]; patch: (resource: string, id: number, fields: Record<string, unknown>) => Promise<void>; fields: string[][] }) {
  const [drafts, setDrafts] = useState<Record<number, Row>>(() => Object.fromEntries(rows.map((row) => [row.id, { ...row }])));

  useEffect(() => {
    setDrafts(Object.fromEntries(rows.map((row) => [row.id, { ...row }])));
  }, [rows]);

  return <Panel title={resource === 'parts' ? 'Części i ceny brutto' : 'Kategorie'} description="Zmieniaj dane bez edycji kodu. Zapis dotyczy pojedynczego wiersza."><Table><TableHeader><TableRow>{fields.map(([, label]) => <TableHead key={label}>{label}</TableHead>)}<TableHead className="w-28">Akcja</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}>{fields.map(([field]) => <TableCell key={field} className="min-w-52"><Input type={field.includes('price') ? 'number' : 'text'} step={field.includes('price') ? '0.01' : undefined} value={String(drafts[row.id]?.[field] ?? '')} onChange={(event) => setDrafts({ ...drafts, [row.id]: { ...drafts[row.id], [field]: event.target.value } })} /></TableCell>)}<TableCell><Button size="sm" variant="outline" onClick={() => patch(resource, row.id, Object.fromEntries(fields.map(([field]) => [field, drafts[row.id]?.[field]])))}><Save /> Zapisz</Button></TableCell></TableRow>)}</TableBody></Table></Panel>;
}

function WysiwygEditor({
  value,
  initialHtml,
  onChange,
  onUploadImage,
  onRef,
  minHeight = 'min-h-48',
}: {
  value?: string;
  initialHtml?: string;
  onChange?: (html: string) => void;
  onUploadImage?: (file: File) => Promise<string | null>;
  onRef?: (el: HTMLDivElement | null) => void;
  minHeight?: string;
}) {
  const localRef = useRef<HTMLDivElement | null>(null);
  const content = value ?? initialHtml ?? '';

  useEffect(() => {
    try {
      document.execCommand('defaultParagraphSeparator', false, 'p');
    } catch {}
  }, []);

  useEffect(() => {
    if (localRef.current && localRef.current.innerHTML !== content) {
      localRef.current.innerHTML = content;
    }
  }, [content]);

  function setRef(node: HTMLDivElement | null) {
    localRef.current = node;
    onRef?.(node);
  }

  function format(command: string, arg?: string) {
    localRef.current?.focus();
    document.execCommand(command, false, arg);
    onChange?.(localRef.current?.innerHTML ?? '');
  }

  async function handleImage(file?: File) {
    if (!file || !onUploadImage) return;
    const url = await onUploadImage(file);
    if (url) {
      localRef.current?.focus();
      document.execCommand('insertImage', false, url);
      onChange?.(localRef.current?.innerHTML ?? '');
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-1 rounded-xl border bg-[var(--muted)] p-1.5">
        <Button size="icon-sm" variant="ghost" type="button" onClick={() => format('bold')} aria-label="Pogrubienie" title="Pogrubienie"><Bold className="size-4" /></Button>
        <Button size="icon-sm" variant="ghost" type="button" onClick={() => format('italic')} aria-label="Kursywa" title="Kursywa"><Italic className="size-4" /></Button>
        <Button size="sm" variant="ghost" type="button" className="h-8 px-2 text-xs font-semibold" onClick={() => format('formatBlock', '<h3>')} title="Nagłówek H3">H3</Button>
        <Button size="sm" variant="ghost" type="button" className="h-8 px-2 text-xs" onClick={() => format('formatBlock', '<p>')} title="Akapit">P</Button>
        <Button size="icon-sm" variant="ghost" type="button" onClick={() => format('insertUnorderedList')} aria-label="Lista punktowana" title="Lista"><List className="size-4" /></Button>
        {onUploadImage && (
          <Label className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg hover:bg-white" aria-label="Wstaw zdjęcie" title="Wstaw zdjęcie">
            <ImagePlus className="size-4" />
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => void handleImage(e.target.files?.[0])} />
          </Label>
        )}
      </div>
      <div
        ref={setRef}
        contentEditable
        suppressContentEditableWarning
        className={`rich-content ${minHeight} max-h-[460px] overflow-y-auto rounded-2xl border bg-white p-4 text-sm outline-none focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/20`}
        onInput={(e) => {
          onChange?.(e.currentTarget.innerHTML);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.stopPropagation();
          }
        }}
      />
    </div>
  );
}

function ModelsEditor({ rows, media, categories, patch, request, reload, setMessage }: { rows: Row[]; media: MediaRow[]; categories: Row[]; patch: (resource: string, id: number, fields: Record<string, unknown>) => Promise<void>; request: (path: string, options?: RequestInit) => Promise<any>; reload: () => Promise<void>; setMessage: (value: string) => void }) {
  const [drafts, setDrafts] = useState<Record<number, Row>>(() => Object.fromEntries(rows.map((row) => [row.id, { ...row }])));
  const editorRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    setDrafts(Object.fromEntries(rows.map((row) => [row.id, { ...row }])));
  }, [rows]);

  async function upload(model: Row, file?: File) { if (!file) return; const form = new FormData(); form.append('file', file); form.append('ownerType', 'model'); form.append('ownerId', String(model.id)); form.append('role', 'gallery'); form.append('altText', String(model.name)); setMessage('Wysyłam zdjęcie…'); try { const result = await request('/admin/media', { method: 'POST', body: form }); if (!model.default_image_path) await patch('models', model.id, { default_image_path: `${API_BASE}${result.url}` }); await reload(); setMessage('Zdjęcie dodane do galerii.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Nie udało się dodać zdjęcia.'); } }
  async function removePhoto(model: Row, mediaId: number) { if (!window.confirm('Usunąć to zdjęcie z galerii modelu?')) return; setMessage('Usuwam zdjęcie…'); try { await request(`/admin/models/${model.id}/media/${mediaId}`, { method: 'DELETE' }); await reload(); setMessage('Zdjęcie usunięte.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Nie udało się usunąć zdjęcia.'); } }
  function imageSrc(path: string) { return path.startsWith('http') ? path : `${API_BASE}${path}`; }
  return <Panel title="Modele i galerie" description="Zdjęcia są wieloelementową galerią. Kliknij zdjęcie, aby zobaczyć je w pełnym rozmiarze w nowej karcie, albo usuń je krzyżykiem."><div className="grid gap-6">{rows.map((row) => { const modelMedia = media.filter((item) => item.model_id === row.id); return <article key={row.id} className="min-w-0 rounded-2xl border border-line p-5 sm:p-6"><div className="flex gap-3 overflow-x-auto pb-3">{modelMedia.length === 0 && <img src={String(row.default_image_path || '/models/e82/01.jpg')} alt="" className="h-28 w-40 shrink-0 rounded-xl bg-[var(--muted)] object-contain" />}{modelMedia.map((item) => <div key={item.media_id} className="group/photo relative h-28 w-40 shrink-0"><a href={imageSrc(item.storage_path)} target="_blank" rel="noopener noreferrer"><img src={imageSrc(item.storage_path)} alt={item.alt_text} className="size-full rounded-xl bg-[var(--muted)] object-contain" /></a><button type="button" onClick={() => removePhoto(row, item.media_id)} aria-label="Usuń zdjęcie" className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-white/90 text-ink opacity-0 shadow transition-opacity group-hover/photo:opacity-100 hover:bg-white"><Trash2 className="size-3.5" /></button></div>)}</div><div className="mt-4 grid gap-4"><div className="grid gap-3 sm:grid-cols-2"><div className="grid gap-1"><Label className="text-xs text-ink-muted" htmlFor={`model-name-${row.id}`}>Nazwa modelu</Label><Input id={`model-name-${row.id}`} value={String(drafts[row.id]?.name ?? '')} onChange={(event) => setDrafts({ ...drafts, [row.id]: { ...drafts[row.id], name: event.target.value } })} /></div><div className="grid gap-1"><Label className="text-xs text-ink-muted" htmlFor={`model-cat-${row.id}`}>Kategoria</Label><NativeSelect id={`model-cat-${row.id}`} value={String(drafts[row.id]?.category_id ?? '')} onChange={(event) => setDrafts({ ...drafts, [row.id]: { ...drafts[row.id], category_id: event.target.value } })} className="w-full">{categories.map((category) => <NativeSelectOption key={category.id} value={category.id}>{String(category.name)}</NativeSelectOption>)}</NativeSelect></div></div><div className="grid gap-2 sm:grid-cols-3">{([['frame_price_gross', 'Cena ramy brutto'], ['assembly_price_gross', 'Cena składania brutto'], ['margin_percent', 'Narzut %']] as const).map(([field, label]) => <div key={field} className="grid gap-1"><Label className="text-xs text-ink-muted" htmlFor={`${field}-${row.id}`}>{label}</Label><Input id={`${field}-${row.id}`} type="number" step="0.01" value={String(drafts[row.id]?.[field] ?? '')} onChange={(event) => setDrafts({ ...drafts, [row.id]: { ...drafts[row.id], [field]: event.target.value } })} /></div>)}</div><p className="rounded-xl bg-ink-wash px-3 py-2 text-sm text-ink-muted">Cena „od” {row.computed_base_price_gross ? <strong className="tabular-nums text-ink">{String(row.computed_base_price_gross)} zł</strong> : <strong>wymaga wyceny</strong>} — wyliczona z ramy, baterii, części domyślnych i składania. Nie wpisuje się jej ręcznie.</p><details className="rounded-xl border border-line p-3" open><summary className="cursor-pointer text-sm font-semibold text-ink">Opis modelu (edytor WYSIWYG / strona produktu)</summary><div className="mt-3"><WysiwygEditor value={String(drafts[row.id]?.description_html ?? '')} onRef={(el) => { editorRefs.current[row.id] = el; }} onUploadImage={async (file) => { const form = new FormData(); form.append('file', file); form.append('altText', `Zdjęcie w opisie ${row.name}`); const result = await request('/admin/media', { method: 'POST', body: form }); return `${API_BASE}${result.url}`; }} minHeight="min-h-56" /></div></details><div className="flex flex-wrap gap-2"><Button size="sm" onClick={async () => { const currentHtml = editorRefs.current[row.id]?.innerHTML ?? String(drafts[row.id]?.description_html ?? ''); await patch('models', row.id, { name: drafts[row.id]?.name ?? row.name, category_id: drafts[row.id]?.category_id ?? row.category_id, frame_price_gross: drafts[row.id]?.frame_price_gross ?? row.frame_price_gross, assembly_price_gross: drafts[row.id]?.assembly_price_gross ?? row.assembly_price_gross, margin_percent: drafts[row.id]?.margin_percent ?? row.margin_percent, description_html: currentHtml }); }}><Save /> Zapisz model</Button><Label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium"><Upload className="size-4" /> Dodaj zdjęcie do galerii<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={(event) => void upload(row, event.target.files?.[0])} /></Label></div></div></article>; })}</div></Panel>;
}

const batteryFields: Array<[string, string, string]> = [
  ['name', 'Nazwa pakietu', 'text'],
  ['cell_format', 'Format ogniwa', 'text'],
  ['series_count', 'Ogniwa szeregowo (S)', 'number'],
  ['parallel_count', 'Gałęzie równolegle (P)', 'number'],
  ['cell_capacity_ah', 'Pojemność ogniwa (Ah)', 'number'],
  ['nominal_voltage_v', 'Napięcie nominalne (V)', 'number'],
  ['charge_voltage_v', 'Napięcie ładowania (V)', 'number'],
  ['gross_price', 'Cena brutto', 'number'],
];

const emptyBattery: Row = { id: 0, code: '', name: '', cell_format: '21700', series_count: 14, parallel_count: 4, cell_capacity_ah: 5, nominal_voltage_v: 50.4, charge_voltage_v: 58.8, gross_price: 0, sort_order: 10, is_default: false, is_active: true };

/** Pojemność i energia pakietu są policzone, nie wpisywane ręcznie. */
function batteryMath(row: Row) {
  const capacity = Number(row.parallel_count ?? 0) * Number(row.cell_capacity_ah ?? 0);
  return { capacity, energy: capacity * Number(row.nominal_voltage_v ?? 0) };
}

function BatteriesEditor({ batteries, models, request, reload, setMessage }: { batteries: Row[]; models: Row[]; request: (path: string, options?: RequestInit) => Promise<any>; reload: () => Promise<void>; setMessage: (value: string) => void }) {
  const [drafts, setDrafts] = useState<Record<number, Row>>(() => Object.fromEntries(batteries.map((row) => [row.id, { ...row }])));
  const [newRows, setNewRows] = useState<Record<number, Row>>({});

  useEffect(() => {
    setDrafts(Object.fromEntries(batteries.map((row) => [row.id, { ...row }])));
  }, [batteries]);

  async function save(id: number) {
    setMessage('Zapisuję baterię…');
    try { await request(`/admin/batteries/${id}`, { method: 'PATCH', body: JSON.stringify(drafts[id]) }); await reload(); setMessage('Bateria zapisana.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Nie udało się zapisać baterii.'); }
  }

  async function create(modelId: number) {
    const draft = newRows[modelId] ?? emptyBattery;
    setMessage('Dodaję baterię…');
    try {
      await request('/admin/batteries', { method: 'POST', body: JSON.stringify({ ...draft, model_id: modelId }) });
      setNewRows({ ...newRows, [modelId]: { ...emptyBattery } });
      await reload();
      setMessage('Bateria dodana do modelu.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Nie udało się dodać baterii.'); }
  }

  return <Panel title="Baterie per model" description="Każdy model ma własną listę pakietów. Pakiet domyślny wyznacza cenę bazową, pozostałe pokazują się w konfiguratorze jako dopłata lub upust.">
    <div className="grid gap-5">{models.map((model) => {
      const rows = batteries.filter((row) => Number(row.model_id) === Number(model.id));
      const draftNew = newRows[Number(model.id)] ?? emptyBattery;
      return <article key={model.id} className="rounded-2xl border border-line p-4">
        <h3 className="text-lg font-semibold tracking-tight">{String(model.name)}</h3>
        {rows.length === 0 && <p className="mt-2 text-sm text-ink-muted">Ten model nie ma jeszcze żadnego pakietu baterii.</p>}
        <div className="mt-4 grid gap-4">{rows.map((row) => { const draft = drafts[row.id] ?? row; const math = batteryMath(draft); return <div key={row.id} className="rounded-xl bg-ink-wash p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-mono text-xs text-ink-subtle">{String(row.code)}</span><span className="text-sm tabular-nums text-ink-muted">{math.capacity.toFixed(2)} Ah · {math.energy.toFixed(1)} Wh</span></div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{batteryFields.map(([field, label, type]) => <label key={field} className="grid gap-1.5 text-sm">
            <span className="text-ink-muted">{label}</span>
            <Input type={type} step={type === 'number' ? '0.01' : undefined} value={String(draft[field] ?? '')} onChange={(event) => setDrafts({ ...drafts, [row.id]: { ...draft, [field]: event.target.value } })} />
          </label>)}</div>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm"><Switch checked={Boolean(draft.is_default)} onCheckedChange={(checked) => setDrafts({ ...drafts, [row.id]: { ...draft, is_default: checked } })} /> Domyślna</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={Boolean(draft.is_active)} onCheckedChange={(checked) => setDrafts({ ...drafts, [row.id]: { ...draft, is_active: checked } })} /> Widoczna w konfiguratorze</label>
            <Button size="sm" onClick={() => save(row.id)}><Save /> Zapisz</Button>
          </div>
        </div>; })}</div>

        <details className="mt-4 rounded-xl border border-line p-4">
          <summary className="cursor-pointer text-sm font-semibold">Dodaj pakiet do modelu {String(model.name)}</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="grid gap-1.5 text-sm"><span className="text-ink-muted">Kod (np. e82-982wh)</span><Input value={String(draftNew.code ?? '')} onChange={(event) => setNewRows({ ...newRows, [Number(model.id)]: { ...draftNew, code: event.target.value } })} /></label>
            {batteryFields.map(([field, label, type]) => <label key={field} className="grid gap-1.5 text-sm">
              <span className="text-ink-muted">{label}</span>
              <Input type={type} step={type === 'number' ? '0.01' : undefined} value={String(draftNew[field] ?? '')} onChange={(event) => setNewRows({ ...newRows, [Number(model.id)]: { ...draftNew, [field]: event.target.value } })} />
            </label>)}
          </div>
          <Button size="sm" className="mt-3" onClick={() => create(Number(model.id))}><Save /> Dodaj baterię</Button>
        </details>
      </article>;
    })}</div>
  </Panel>;
}

function PageEditor({ page, patch, request }: { page?: Row; patch: (resource: string, id: number, fields: Record<string, unknown>) => Promise<void>; request: (path: string, options?: RequestInit) => Promise<any> }) {
  const [title, setTitle] = useState(String(page?.title ?? 'Serwis'));
  const [contentHtml, setContentHtml] = useState(String(page?.content_html ?? ''));
  const [published, setPublished] = useState(Boolean(page?.is_published));

  useEffect(() => {
    if (page) {
      setTitle(String(page.title ?? 'Serwis'));
      setContentHtml(String(page.content_html ?? ''));
      setPublished(Boolean(page.is_published));
    }
  }, [page]);

  if (!page) return <Panel title="Serwis" description="Brak strony w bazie."><p>Uruchom preseed danych.</p></Panel>;

  return <Panel title="Strona Serwis" description="Edytor WYSIWYG zapisuje formatowanie oraz obrazy w treści."><div className="grid gap-4"><div className="grid gap-1.5"><Label>Tytuł</Label><Input className="h-11" value={title} onChange={(event) => setTitle(event.target.value)} /></div><div className="grid gap-1.5"><Label>Treść</Label><WysiwygEditor value={contentHtml} onChange={setContentHtml} minHeight="min-h-80" onUploadImage={async (file) => { const form = new FormData(); form.append('file', file); form.append('altText', 'Zdjęcie w treści serwisu'); const result = await request('/admin/media', { method: 'POST', body: form }); return `${API_BASE}${result.url}`; }} /></div><div className="flex items-center justify-between"><label className="flex items-center gap-2 text-sm"><Switch checked={published} onCheckedChange={setPublished} /> Opublikowana</label><Button onClick={() => patch('pages', page.id, { title, content_html: contentHtml, is_published: published })}><Save /> Zapisz stronę</Button></div></div></Panel>;
}

function ThemeEditor({ theme, request, reload, setMessage }: { theme: Record<string, string>; request: (path: string, options?: RequestInit) => Promise<any>; reload: () => Promise<void>; setMessage: (value: string) => void }) {
  const [draft, setDraft] = useState(theme);
  const labels: Record<string, string> = { background: 'Tło strony', foreground: 'Tekst', surface: 'Karty', muted: 'Tło pomocnicze', accent: 'Akcent', accentForeground: 'Tekst akcentu', border: 'Obramowania' };

  useEffect(() => {
    setDraft(theme);
  }, [theme]);
  async function save() { try { await request('/admin/settings/theme', { method: 'PATCH', body: JSON.stringify(draft) }); await reload(); setMessage('Kolory zapisane w bazie. Odśwież stronę publiczną, aby zobaczyć zmianę.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Nie udało się zapisać motywu.'); } }
  return <Panel title="Kolorystyka serwisu" description="Jeden motyw dla strony publicznej i konfiguratora, przechowywany w bazie."><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(labels).map(([key, label]) => <label key={key} className="flex items-center gap-3 rounded-2xl border p-3"><input type="color" value={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} className="size-10 cursor-pointer rounded-lg border-0 bg-transparent" /><span><strong className="block text-sm">{label}</strong><span className="font-mono text-xs text-ink-subtle">{draft[key]}</span></span></label>)}</div><Button onClick={save} className="mt-6"><Save /> Zapisz motyw</Button></Panel>;
}

const inquiryColumns: string[][] = [['public_id', 'Projekt'], ['customer_name', 'Klient'], ['customer_email', 'E-mail'], ['gross_total', 'Cena brutto'], ['status', 'Status'], ['created_at', 'Data']];

function InquiriesTable({ rows }: { rows: Row[] }) {
  return <Panel title="Zapytania klientów" description="Konfiguracje zapisane przez formularz końcowy."><Table><TableHeader><TableRow>{inquiryColumns.map(([, label]) => <TableHead key={label}>{label}</TableHead>)}<TableHead className="w-28">Akcja</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}>{inquiryColumns.map(([field]) => <TableCell key={field}>{String(row[field] ?? '—')}</TableCell>)}<TableCell><Button size="sm" variant="outline" render={<a href={`/admin/konfiguracje/${row.public_id}`} target="_blank" rel="noopener noreferrer" />}><ExternalLink /> Szczegóły</Button></TableCell></TableRow>)}</TableBody></Table></Panel>;
}

const selectionModeLabels: Array<[string, string]> = [
  ['fixed', 'Element stały modelu'],
  ['select_one', 'Klient wybiera jedną pozycję'],
  ['optional', 'Dodatek opcjonalny'],
];

const parseJson = (value: unknown): Record<string, unknown> | null => {
  if (typeof value !== 'string' || value === '') return null;
  try { return JSON.parse(value) as Record<string, unknown>; } catch { return null; }
};

/**
 * Zgodność części z modelem liczona tak samo jak w API: część jest zgodna,
 * dopóki nie deklaruje atrybutu, który model deklaruje inaczej. Brak atrybutu
 * znaczy „do potwierdzenia” i nie blokuje przypisania.
 */
function fitStatus(partAttributes: unknown, requirements: Record<string, unknown> | null): 'fits' | 'unknown' | 'conflict' {
  const attributes = parseJson(partAttributes);
  if (!attributes || !requirements) return 'unknown';
  let matched = 0;
  for (const [key, partValue] of Object.entries(attributes)) {
    if (!(key in requirements) || partValue === null || requirements[key] === null) continue;
    const allowed = Array.isArray(requirements[key]) ? (requirements[key] as unknown[]) : [requirements[key]];
    if (allowed.some((candidate) => String(candidate) === String(partValue) || Number(candidate) === Number(partValue))) matched += 1;
    else return 'conflict';
  }
  return matched > 0 ? 'fits' : 'unknown';
}

const fitBadges: Record<string, [string, string]> = {
  fits: ['Zgodna', 'bg-emerald-50 text-emerald-700'],
  unknown: ['Do potwierdzenia', 'bg-ink-wash text-ink-muted'],
  conflict: ['Niezgodna z wymaganiami', 'bg-red-50 text-red-700'],
};

/**
 * Osprzęt definiujemy na poziomie modelu, bo zgodność wynika z ramy i silnika,
 * a nie z kategorii. Żeby to nie było żmudne, lista kandydatów jest zawężona
 * do części pasujących do wymagań modelu, a nowy model może skopiować osprzęt
 * z istniejącego.
 */
function ModelEquipmentEditor({ catalog, patch, request, reload, setMessage }: { catalog: Catalog; patch: (resource: string, id: number, fields: Record<string, unknown>) => Promise<void>; request: (path: string, options?: RequestInit) => Promise<any>; reload: () => Promise<void>; setMessage: (value: string) => void }) {
  const [modelId, setModelId] = useState<number>(Number(catalog.models[0]?.id ?? 0));
  const [showIncompatible, setShowIncompatible] = useState(false);
  const [copySource, setCopySource] = useState('');
  const model = catalog.models.find((row) => Number(row.id) === modelId) ?? catalog.models[0];
  const requirements = parseJson(model?.fit_requirements);
  const pricing = catalog.modelPricing?.[String(modelId)];
  const assigned = catalog.modelParts.filter((row) => Number(row.model_id) === modelId);
  const assignedByPart = new Map(assigned.map((row) => [Number(row.part_id), row]));
  const settingsByGroup = new Map(catalog.modelGroupSettings.filter((row) => Number(row.model_id) === modelId).map((row) => [Number(row.group_id), row]));

  async function saveModelPart(body: Record<string, unknown>) {
    setMessage('Zapisuję osprzęt…');
    try { await request('/admin/model-parts', { method: 'POST', body: JSON.stringify({ model_id: modelId, ...body }) }); await reload(); setMessage('Osprzęt zapisany, cena przeliczona.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Nie udało się zapisać osprzętu.'); }
  }

  async function saveGroup(groupId: number, body: Record<string, unknown>) {
    const current = settingsByGroup.get(groupId);
    setMessage('Zapisuję ustawienia grupy…');
    try {
      await request('/admin/model-group-settings', { method: 'POST', body: JSON.stringify({
        model_id: modelId,
        group_id: groupId,
        selection_mode: current?.selection_mode ?? 'select_one',
        customer_part_allowed: Boolean(Number(current?.customer_part_allowed ?? 0)),
        customer_part_gross_price: Number(current?.customer_part_gross_price ?? 0),
        customer_part_label: current?.customer_part_label ?? 'Dostarczam własną część',
        helper_text: current?.helper_text ?? '',
        ...body,
      }) });
      await reload();
      setMessage('Ustawienia grupy zapisane.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Nie udało się zapisać ustawień grupy.'); }
  }

  async function copyParts() {
    if (copySource === '') return;
    if (!window.confirm('Osprzęt tego modelu zostanie zastąpiony osprzętem wybranego modelu. Kontynuować?')) return;
    setMessage('Kopiuję osprzęt…');
    try { await request(`/admin/models/${modelId}/copy-parts`, { method: 'POST', body: JSON.stringify({ source_model_id: Number(copySource) }) }); await reload(); setMessage('Osprzęt skopiowany.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Nie udało się skopiować osprzętu.'); }
  }

  return <div className="grid min-w-0 gap-5">
    <Panel title="Osprzęt modelu i składniki ceny" description="Cena roweru jest sumą: rama, rozmiar, bateria, wybrane części, składanie i narzut. Nie ma pola z ceną końcową — zmieniasz składniki, cena przelicza się sama.">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
        <div className="grid gap-1"><Label htmlFor="equipment-model">Model</Label><NativeSelect id="equipment-model" value={String(modelId)} onChange={(event) => setModelId(Number(event.target.value))}>{catalog.models.map((row) => <NativeSelectOption key={row.id} value={row.id}>{String(row.name)}</NativeSelectOption>)}</NativeSelect></div>
        <div className="grid gap-1"><Label htmlFor="copy-source">Skopiuj osprzęt z modelu</Label><NativeSelect id="copy-source" value={copySource} onChange={(event) => setCopySource(event.target.value)}><NativeSelectOption value="">wybierz…</NativeSelectOption>{catalog.models.filter((row) => Number(row.id) !== modelId).map((row) => <NativeSelectOption key={row.id} value={row.id}>{String(row.name)}</NativeSelectOption>)}</NativeSelect></div>
        <Button variant="outline" size="sm" disabled={copySource === ''} onClick={() => void copyParts()}>Skopiuj</Button>
      </div>

      {pricing && <div className="mt-6 grid gap-3 rounded-2xl bg-ink-wash p-4 sm:grid-cols-2 lg:grid-cols-3">
        {([['Rama', pricing.framePriceGross], ['Bateria domyślna', pricing.batteryPriceGross], ['Części domyślne', pricing.componentsPriceGross], ['Składanie', pricing.assemblyPriceGross], [`Narzut ${pricing.marginPercent}%`, pricing.marginAmountGross]] as Array<[string, number]>).map(([label, value]) => <div key={label} className="flex items-baseline justify-between gap-3 rounded-xl bg-white px-3 py-2 text-sm"><span className="text-ink-muted">{label}</span><strong className="tabular-nums">{value.toFixed(2)} zł</strong></div>)}
        <div className="flex items-baseline justify-between gap-3 rounded-xl bg-ink px-3 py-2 text-sm text-white"><span>Cena „od”</span><strong className="tabular-nums">{pricing.issues.length > 0 ? 'wycena' : `${pricing.grossTotal.toFixed(2)} zł`}</strong></div>
        {pricing.issues.length > 0 && <p className="sm:col-span-2 lg:col-span-3 text-sm text-red-700">{pricing.issues.join(' ')}</p>}
        {pricing.notes.length > 0 && <p className="sm:col-span-2 lg:col-span-3 text-sm text-ink-muted">{pricing.notes.join(' ')}</p>}
      </div>}
    </Panel>

    {catalog.partGroups.map((group) => {
      const groupId = Number(group.id);
      const settings = settingsByGroup.get(groupId);
      const mode = settings?.selection_mode ?? 'select_one';
      const candidates = catalog.parts
        .filter((part) => Number(part.group_id) === groupId)
        .map((part) => ({ part, status: fitStatus(part.fit_attributes, requirements), row: assignedByPart.get(Number(part.id)) }))
        .filter((item) => showIncompatible || item.status !== 'conflict' || item.row);

      return <Panel key={group.id} title={String(group.name)} description={mode === 'fixed' ? 'Element stały: nie pokazujemy go jako wyboru, ale jego cena wchodzi do sumy.' : 'Zaznacz części oferowane w tym modelu i wskaż pozycję domyślną — to ona wyznacza cenę „od” i punkt odniesienia dla różnic.'}>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-end">
          <div className="grid gap-1"><Label htmlFor={`mode-${group.id}`}>Tryb grupy</Label><NativeSelect id={`mode-${group.id}`} value={mode} onChange={(event) => void saveGroup(groupId, { selection_mode: event.target.value })}>{selectionModeLabels.map(([value, label]) => <NativeSelectOption key={value} value={value}>{label}</NativeSelectOption>)}</NativeSelect></div>
          <div className="flex flex-wrap items-center gap-3">
            <Label className="flex items-center gap-2 text-sm"><Switch checked={Boolean(Number(settings?.customer_part_allowed ?? 0))} onCheckedChange={(checked) => void saveGroup(groupId, { customer_part_allowed: checked })} /> Klient może dostarczyć własną część</Label>
            {Boolean(Number(settings?.customer_part_allowed ?? 0)) && <div className="grid gap-1"><Label className="text-xs text-ink-muted" htmlFor={`customer-price-${group.id}`}>Wartość rozliczeniowa</Label><Input id={`customer-price-${group.id}`} type="number" step="0.01" defaultValue={String(settings?.customer_part_gross_price ?? 0)} onBlur={(event) => void saveGroup(groupId, { customer_part_gross_price: Number(event.target.value) })} className="w-32" /></div>}
          </div>
        </div>

        <Table className="mt-4">
          <TableHeader><TableRow><TableHead className="w-24">W modelu</TableHead><TableHead>Część</TableHead><TableHead className="w-36">Cena katalogowa</TableHead><TableHead className="w-40">Cena dla modelu</TableHead><TableHead className="w-28">Domyślna</TableHead></TableRow></TableHeader>
          <TableBody>
            {candidates.length === 0 && <TableRow><TableCell colSpan={5} className="text-sm text-ink-muted">Brak części w tej grupie.</TableCell></TableRow>}
            {candidates.map(({ part, status, row }) => {
              const [badge, badgeClass] = fitBadges[status];
              return <TableRow key={part.id}>
                <TableCell><Switch checked={Boolean(row)} onCheckedChange={(checked) => void saveModelPart({ part_id: Number(part.id), assigned: checked })} /></TableCell>
                <TableCell className="min-w-64"><span className="font-medium">{String(part.name)}</span><span className={`ml-2 rounded px-1.5 py-0.5 text-[0.68rem] uppercase tracking-wide ${badgeClass}`}>{badge}</span><span className="mt-0.5 block font-mono text-xs text-ink-subtle">{String(part.sku)}</span></TableCell>
                <TableCell className="tabular-nums text-sm">{part.price_status === 'quote' ? 'wycena' : `${String(part.gross_price ?? '—')} zł`}</TableCell>
                <TableCell>{row ? <Input type="number" step="0.01" placeholder="jak w katalogu" defaultValue={row.gross_price_override === null ? '' : String(row.gross_price_override)} onBlur={(event) => void saveModelPart({ part_id: Number(part.id), gross_price_override: event.target.value })} /> : <span className="text-sm text-ink-subtle">—</span>}</TableCell>
                <TableCell>{row ? <Switch checked={Boolean(Number(row.is_default))} onCheckedChange={(checked) => void saveModelPart({ part_id: Number(part.id), is_default: checked, is_customer_configurable: Boolean(Number(row.is_customer_configurable)) })} /> : <span className="text-sm text-ink-subtle">—</span>}</TableCell>
              </TableRow>;
            })}
          </TableBody>
        </Table>
      </Panel>;
    })}

    <Panel title="Rozmiary i dopłaty" description="Rozmiar może mieć własną dopłatę, jeśli rama w danym rozmiarze kosztuje więcej.">
      <Table><TableHeader><TableRow><TableHead>Rozmiar</TableHead><TableHead className="w-40">Dopłata brutto</TableHead><TableHead className="w-28">Akcja</TableHead></TableRow></TableHeader><TableBody>
        {catalog.modelSizes.filter((row) => Number(row.model_id) === modelId).map((row) => <SizeRow key={row.id} row={row} patch={patch} />)}
      </TableBody></Table>
    </Panel>

    <Label className="flex items-center gap-2 text-sm text-ink-muted"><Switch checked={showIncompatible} onCheckedChange={setShowIncompatible} /> Pokaż też części niezgodne z wymaganiami modelu</Label>
  </div>;
}

function SizeRow({ row, patch }: { row: Row; patch: (resource: string, id: number, fields: Record<string, unknown>) => Promise<void> }) {
  const [delta, setDelta] = useState(String(row.price_delta_gross ?? 0));
  return <TableRow>
    <TableCell>{String(row.label ?? row.code)}</TableCell>
    <TableCell><Input type="number" step="0.01" value={delta} onChange={(event) => setDelta(event.target.value)} /></TableCell>
    <TableCell><Button size="sm" variant="outline" onClick={() => patch('sizes', row.id, { price_delta_gross: delta })}><Save /> Zapisz</Button></TableCell>
  </TableRow>;
}
