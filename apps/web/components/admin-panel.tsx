'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Bold, ImagePlus, Italic, List, LogOut, RefreshCw, Save, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8081/api';

type Row = Record<string, string | number | boolean | null> & { id: number };
type MediaRow = { model_id: number; media_id: number; role: string; storage_path: string; alt_text: string };
type Catalog = { categories: Row[]; models: Row[]; parts: Row[]; batteries: Row[]; inquiries: Row[]; pages: Row[]; modelMedia: MediaRow[]; theme: Record<string, string> };

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
    <Tabs defaultValue="models"><TabsList className="no-scrollbar mb-6 h-auto max-w-full justify-start overflow-x-auto rounded-full bg-white p-1"><TabsTrigger value="models" className="rounded-full px-4 py-2">Modele i zdjęcia</TabsTrigger><TabsTrigger value="categories" className="rounded-full px-4 py-2">Kategorie</TabsTrigger><TabsTrigger value="parts" className="rounded-full px-4 py-2">Części i ceny</TabsTrigger><TabsTrigger value="batteries" className="rounded-full px-4 py-2">Baterie</TabsTrigger><TabsTrigger value="service" className="rounded-full px-4 py-2">Serwis</TabsTrigger><TabsTrigger value="theme" className="rounded-full px-4 py-2">Kolory</TabsTrigger><TabsTrigger value="inquiries" className="rounded-full px-4 py-2">Zapytania</TabsTrigger></TabsList>
      <TabsContent value="models"><ModelsEditor rows={catalog.models} media={catalog.modelMedia} patch={patch} request={request} reload={loadCatalog} setMessage={setMessage} /></TabsContent>
      <TabsContent value="categories"><SimpleEditor resource="categories" rows={catalog.categories} patch={patch} fields={[['name', 'Nazwa'], ['short_description', 'Krótki opis']]} /></TabsContent>
      <TabsContent value="parts"><SimpleEditor resource="parts" rows={catalog.parts} patch={patch} fields={[['name', 'Nazwa części'], ['gross_price', 'Cena brutto']]} /></TabsContent>
      <TabsContent value="batteries"><BatteriesEditor batteries={catalog.batteries ?? []} models={catalog.models} request={request} reload={loadCatalog} setMessage={setMessage} /></TabsContent>
      <TabsContent value="service"><PageEditor page={catalog.pages.find((page) => page.slug === 'serwis')} patch={patch} request={request} /></TabsContent>
      <TabsContent value="theme"><ThemeEditor theme={catalog.theme} request={request} reload={loadCatalog} setMessage={setMessage} /></TabsContent>
      <TabsContent value="inquiries"><DataTable rows={catalog.inquiries} columns={[['public_id', 'Projekt'], ['customer_name', 'Klient'], ['customer_email', 'E-mail'], ['gross_total', 'Cena brutto'], ['status', 'Status'], ['created_at', 'Data']]} /></TabsContent>
    </Tabs>
  </main></div>;
}

function Panel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) { return <section className="rounded-3xl border border-line bg-white p-5 sm:p-7"><h2 className="text-2xl font-semibold tracking-tight">{title}</h2><p className="mt-1 text-sm text-ink-muted">{description}</p><div className="mt-6">{children}</div></section>; }

function SimpleEditor({ resource, rows, patch, fields }: { resource: string; rows: Row[]; patch: (resource: string, id: number, fields: Record<string, unknown>) => Promise<void>; fields: string[][] }) {
  const [drafts, setDrafts] = useState<Record<number, Row>>(() => Object.fromEntries(rows.map((row) => [row.id, { ...row }])));
  return <Panel title={resource === 'parts' ? 'Części i ceny brutto' : 'Kategorie'} description="Zmieniaj dane bez edycji kodu. Zapis dotyczy pojedynczego wiersza."><Table><TableHeader><TableRow>{fields.map(([, label]) => <TableHead key={label}>{label}</TableHead>)}<TableHead className="w-28">Akcja</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}>{fields.map(([field]) => <TableCell key={field} className="min-w-52"><Input type={field.includes('price') ? 'number' : 'text'} step={field.includes('price') ? '0.01' : undefined} value={String(drafts[row.id]?.[field] ?? '')} onChange={(event) => setDrafts({ ...drafts, [row.id]: { ...drafts[row.id], [field]: event.target.value } })} /></TableCell>)}<TableCell><Button size="sm" variant="outline" onClick={() => patch(resource, row.id, Object.fromEntries(fields.map(([field]) => [field, drafts[row.id]?.[field]])))}><Save /> Zapisz</Button></TableCell></TableRow>)}</TableBody></Table></Panel>;
}

function ModelsEditor({ rows, media, patch, request, reload, setMessage }: { rows: Row[]; media: MediaRow[]; patch: (resource: string, id: number, fields: Record<string, unknown>) => Promise<void>; request: (path: string, options?: RequestInit) => Promise<any>; reload: () => Promise<void>; setMessage: (value: string) => void }) {
  const [drafts, setDrafts] = useState<Record<number, Row>>(() => Object.fromEntries(rows.map((row) => [row.id, { ...row }])));
  async function upload(model: Row, file?: File) { if (!file) return; const form = new FormData(); form.append('file', file); form.append('ownerType', 'model'); form.append('ownerId', String(model.id)); form.append('role', 'gallery'); form.append('altText', String(model.name)); setMessage('Wysyłam zdjęcie…'); try { const result = await request('/admin/media', { method: 'POST', body: form }); if (!model.default_image_path) await patch('models', model.id, { default_image_path: `${API_BASE}${result.url}` }); await reload(); setMessage('Zdjęcie dodane do galerii.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Nie udało się dodać zdjęcia.'); } }
  return <Panel title="Modele i galerie" description="Zdjęcia są wieloelementową galerią. Pierwszy obraz możesz ustawić jako główny, a frontend pokazuje strzałki."><div className="grid gap-5 lg:grid-cols-2">{rows.map((row) => { const modelMedia = media.filter((item) => item.model_id === row.id); return <article key={row.id} className="rounded-2xl border border-line p-4"><div className="flex gap-3 overflow-x-auto pb-3"><img src={String(row.default_image_path || '/models/e82/01.jpg')} alt="" className="h-28 w-40 shrink-0 rounded-xl bg-[var(--muted)] object-contain" />{modelMedia.map((item) => <img key={item.media_id} src={`${API_BASE}${item.storage_path}`} alt={item.alt_text} className="h-28 w-40 shrink-0 rounded-xl bg-[var(--muted)] object-contain" />)}</div><div className="mt-3 grid gap-3"><Input value={String(drafts[row.id]?.name ?? '')} onChange={(event) => setDrafts({ ...drafts, [row.id]: { ...drafts[row.id], name: event.target.value } })} /><Input type="number" step="0.01" value={String(drafts[row.id]?.base_price ?? '')} placeholder="Cena bazowa brutto" onChange={(event) => setDrafts({ ...drafts, [row.id]: { ...drafts[row.id], base_price: event.target.value } })} /><div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => patch('models', row.id, { name: drafts[row.id].name, base_price: drafts[row.id].base_price })}><Save /> Zapisz</Button><Label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium"><Upload className="size-4" /> Dodaj zdjęcie<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={(event) => void upload(row, event.target.files?.[0])} /></Label></div></div></article>; })}</div></Panel>;
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
  const editor = useRef<HTMLDivElement>(null); const [title, setTitle] = useState(String(page?.title ?? 'Serwis')); const [published, setPublished] = useState(Boolean(page?.is_published));
  if (!page) return <Panel title="Serwis" description="Brak strony w bazie."><p>Uruchom preseed danych.</p></Panel>;
  function format(command: string) { editor.current?.focus(); document.execCommand(command); }
  async function insertImage(file?: File) { if (!file) return; const form = new FormData(); form.append('file', file); form.append('altText', 'Zdjęcie w treści serwisu'); const result = await request('/admin/media', { method: 'POST', body: form }); editor.current?.focus(); document.execCommand('insertImage', false, `${API_BASE}${result.url}`); }
  return <Panel title="Strona Serwis" description="Edytor WYSIWYG zapisuje formatowanie oraz obrazy w treści."><div className="grid gap-4"><div className="grid gap-1.5"><Label>Tytuł</Label><Input className="h-11" value={title} onChange={(event) => setTitle(event.target.value)} /></div><div className="flex flex-wrap gap-1 rounded-xl border bg-[var(--muted)] p-2"><Button size="icon-sm" variant="ghost" onClick={() => format('bold')} aria-label="Pogrubienie"><Bold /></Button><Button size="icon-sm" variant="ghost" onClick={() => format('italic')} aria-label="Kursywa"><Italic /></Button><Button size="icon-sm" variant="ghost" onClick={() => format('insertUnorderedList')} aria-label="Lista"><List /></Button><Label className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg hover:bg-white" aria-label="Dodaj obraz"><ImagePlus className="size-4" /><input type="file" accept="image/*" className="sr-only" onChange={(event) => void insertImage(event.target.files?.[0])} /></Label></div><div ref={editor} contentEditable suppressContentEditableWarning className="rich-content min-h-80 rounded-2xl border bg-white p-5 outline-none focus:border-[var(--ring)] focus:ring-3 focus:ring-[var(--ring)]/30" dangerouslySetInnerHTML={{ __html: String(page.content_html ?? '') }} /><div className="flex items-center justify-between"><label className="flex items-center gap-2 text-sm"><Switch checked={published} onCheckedChange={setPublished} /> Opublikowana</label><Button onClick={() => patch('pages', page.id, { title, content_html: editor.current?.innerHTML ?? '', is_published: published })}><Save /> Zapisz stronę</Button></div></div></Panel>;
}

function ThemeEditor({ theme, request, reload, setMessage }: { theme: Record<string, string>; request: (path: string, options?: RequestInit) => Promise<any>; reload: () => Promise<void>; setMessage: (value: string) => void }) {
  const [draft, setDraft] = useState(theme); const labels: Record<string, string> = { background: 'Tło strony', foreground: 'Tekst', surface: 'Karty', muted: 'Tło pomocnicze', accent: 'Akcent', accentForeground: 'Tekst akcentu', border: 'Obramowania' };
  async function save() { try { await request('/admin/settings/theme', { method: 'PATCH', body: JSON.stringify(draft) }); await reload(); setMessage('Kolory zapisane w bazie. Odśwież stronę publiczną, aby zobaczyć zmianę.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Nie udało się zapisać motywu.'); } }
  return <Panel title="Kolorystyka serwisu" description="Jeden motyw dla strony publicznej i konfiguratora, przechowywany w bazie."><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(labels).map(([key, label]) => <label key={key} className="flex items-center gap-3 rounded-2xl border p-3"><input type="color" value={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} className="size-10 cursor-pointer rounded-lg border-0 bg-transparent" /><span><strong className="block text-sm">{label}</strong><span className="font-mono text-xs text-ink-subtle">{draft[key]}</span></span></label>)}</div><Button onClick={save} className="mt-6"><Save /> Zapisz motyw</Button></Panel>;
}

function DataTable({ rows, columns }: { rows: Row[]; columns: string[][] }) { return <Panel title="Zapytania klientów" description="Konfiguracje zapisane przez formularz końcowy."><Table><TableHeader><TableRow>{columns.map(([, label]) => <TableHead key={label}>{label}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}>{columns.map(([field]) => <TableCell key={field}>{String(row[field] ?? '—')}</TableCell>)}</TableRow>)}</TableBody></Table></Panel>; }
