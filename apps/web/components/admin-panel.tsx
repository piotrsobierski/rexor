'use client';

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from 'react';
import {
  Bike,
  Bold,
  Calculator,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  ExternalLink,
  HelpCircle,
  ImagePlus,
  Info,
  Italic,
  Layers,
  List,
  LogOut,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import {
  computeBatteryEstimates,
  detectCellSpec,
  formatWeightKg,
  formatWh,
} from '@/lib/battery';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Toaster, toast } from '@/components/ui/toast';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PaintsEditor } from '@/components/admin-paints';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { compressUploadImage } from '@/lib/image-compression';
import { isAdminTabSlug, type AdminTabSlug } from '@/lib/admin-tabs';
import { mergeCopy, type SiteCopy } from '@/lib/copy';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8081/api';

type Row = Record<string, string | number | boolean | null> & { id: number };
type MediaRow = {
  model_id: number;
  media_id: number;
  role: string;
  sort_order: number;
  storage_path: string;
  alt_text: string;
};
type FrameMediaRow = {
  frame_id: number;
  media_id: number;
  role: string;
  sort_order: number;
  storage_path: string;
  alt_text: string;
};
type ProjectMediaRow = {
  project_id: number;
  media_id: number;
  role: string;
  sort_order: number;
  storage_path: string;
  alt_text: string;
};
type ModelPartRow = {
  model_id: number;
  part_id: number;
  group_id: number;
  group_slug: string;
  is_default: number | boolean;
  is_customer_configurable: number | boolean;
  customer_supplied_allowed: number | boolean;
  customer_supplied_gross_price: string | number;
  gross_price_override: string | number | null;
  sort_order: number;
  notes: string | null;
};
type GroupSettingsRow = {
  model_id: number;
  group_id: number;
  group_slug: string;
  selection_mode: string;
  customer_part_allowed: number | boolean;
  customer_part_gross_price: string | number;
  customer_part_label: string;
  helper_text: string | null;
};
type PricingLine = {
  groupSlug: string;
  groupName: string;
  name: string;
  grossPrice: number;
};
type ModelPricing = {
  modelId: number;
  framePriceGross: number;
  batteryPriceGross: number;
  componentsPriceGross: number;
  assemblyPriceGross: number;
  marginPercent: number;
  marginAmountGross: number;
  grossTotal: number;
  issues: string[];
  notes: string[];
  lines: PricingLine[];
};
type Catalog = {
  categories: Row[];
  models: Row[];
  parts: Row[];
  partGroups: Row[];
  modelParts: ModelPartRow[];
  modelGroupSettings: GroupSettingsRow[];
  modelSizes: Row[];
  modelPricing: Record<string, ModelPricing>;
  batteries: Row[];
  inquiries: Row[];
  pages: Row[];
  modelMedia: MediaRow[];
  frames: Row[];
  frameMedia: FrameMediaRow[];
  projects: Row[];
  projectMedia: ProjectMediaRow[];
  theme: Record<string, string>;
  branding: { faviconPath: string | null } | null;
  copy: Record<string, unknown> | null;
  chatbotPrompt: {
    instructions?: string;
    extra_context?: string;
    default_instructions?: string;
  } | null;
  mailRouting: {
    order_email: string;
    contact_email: string;
    service_email: string;
  };
  configurationEmailTemplate: { subject: string; body_html: string };
  modelSpecifications: Record<
    number,
    { facts?: string[]; [key: string]: unknown }
  >;
};
type ActivityLogEntry = {
  id: number;
  event_type: string;
  actor_type: 'customer' | 'admin' | 'system';
  actor_label: string | null;
  ip_address: string | null;
  summary: string;
  details: Record<string, unknown> | null;
  created_at: string;
};

export function AdminPanel({ initialTab }: { initialTab?: string } = {}) {
  const [token, setToken] = useState('');
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [email, setEmail] = useState('admin@rexor.local');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<AdminTabSlug>(
    initialTab && isAdminTabSlug(initialTab) ? initialTab : 'models',
  );

  // Przycisk wstecz/dalej przeglądarki zmienia URL bez przeładowania strony
  // (patrz onValueChange niżej) - synchronizujemy zakładkę z tym zdarzeniem.
  useEffect(() => {
    function onPopState() {
      const match = window.location.pathname.match(/^\/admin\/([a-z-]+)\/?$/);
      setActiveTab(match && isAdminTabSlug(match[1]) ? match[1] : 'models');
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem('rexor_admin_token');
    if (saved) {
      setToken(saved);
      void loadCatalog(saved);
    }
  }, []);

  async function request(
    path: string,
    options: RequestInit = {},
    authToken = token,
  ) {
    const method = (options.method ?? 'GET').toUpperCase();
    // Toast pokazujemy dla każdego zapisu (POST/PATCH/DELETE), z wyjątkiem
    // logowania - to nie jest "zapis" z perspektywy admina.
    const isMutation = method !== 'GET' && path !== '/admin/login';
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        ...(options.body instanceof FormData
          ? {}
          : { 'Content-Type': 'application/json' }),
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...options.headers,
      },
    });
    const data = (await response.json().catch(() => ({}))) as any;
    if (!response.ok) {
      if (isMutation) {
        toast.add({
          title: 'Nie zapisano',
          description: `${data.error ?? 'Operacja nie powiodła się.'} (HTTP ${response.status})`,
          type: 'error',
        });
      }
      throw new Error(data.error ?? 'Operacja nie powiodła się.');
    }
    if (isMutation) {
      toast.add({
        title: 'Zapisano',
        description: `HTTP ${response.status}`,
        type: 'success',
      });
    }
    return data;
  }

  async function loadCatalog(authToken = token) {
    try {
      setCatalog(await request('/admin/catalog', {}, authToken));
      setMessage('');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Nie udało się pobrać danych.',
      );
      if ((error as Error).message.includes('Sesja')) logout();
    }
  }

  // Osobna funkcja zamiast zmiany sygnatury loadCatalog() - reload w edytorach
  // poniżej oczekuje () => Promise<void> i nigdy nie rzuca, a RefreshButton
  // musi dostać odrzuconą obietnicę, żeby pokazać czerwony X po błędzie.
  async function refreshCatalog() {
    try {
      setCatalog(await request('/admin/catalog'));
      setMessage('');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Nie udało się pobrać danych.',
      );
      if (error instanceof Error && error.message.includes('Sesja')) logout();
      throw error;
    }
  }

  async function login(event: FormEvent) {
    event.preventDefault();
    setMessage('Logowanie…');
    try {
      const result = await request(
        '/admin/login',
        { method: 'POST', body: JSON.stringify({ email, password }) },
        '',
      );
      sessionStorage.setItem('rexor_admin_token', result.token);
      setToken(result.token);
      setPassword('');
      await loadCatalog(result.token);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Nie udało się zalogować.',
      );
    }
  }

  function logout() {
    sessionStorage.removeItem('rexor_admin_token');
    setToken('');
    setCatalog(null);
  }

  async function patch(
    resource: string,
    id: number,
    fields: Record<string, unknown>,
  ) {
    setMessage('Zapisuję…');
    try {
      await request(`/admin/${resource}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(fields),
      });
      await loadCatalog();
      setMessage('Zmiany zapisane.');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Nie udało się zapisać.',
      );
    }
  }

  if (!token || !catalog)
    return (
      <main className="grid min-h-screen place-items-center bg-[#111] px-4">
        <Toaster />
        <form
          onSubmit={login}
          className="w-full max-w-sm rounded-3xl bg-white p-7"
        >
          <img src="/brand/rexor-logo.png" alt="Rexor" className="w-32" />
          <p className="eyebrow mt-10">Panel administracyjny</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Zaloguj się
          </h1>
          <div className="mt-6 grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="admin-email">E-mail</Label>
              <Input
                id="admin-email"
                type="email"
                required
                className="h-11"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="admin-password">Hasło</Label>
              <Input
                id="admin-password"
                type="password"
                required
                className="h-11"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <Button
              type="submit"
              className="h-11 rounded-full bg-ink text-white"
            >
              Zaloguj
            </Button>
            {message && (
              <p className="text-center text-sm text-ink-muted">{message}</p>
            )}
          </div>
        </form>
      </main>
    );

  return (
    <div className="min-h-screen bg-[#f4f5f2]">
      <Toaster />
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-18 max-w-[1500px] items-center justify-between px-4 sm:px-8">
          <a href="/">
            <img src="/brand/rexor-logo.png" alt="Rexor" className="w-28" />
          </a>
          <div className="flex items-center gap-2">
            <RefreshButton onRefresh={refreshCatalog} />
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut /> Wyloguj
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-8">
        <div className="mb-8">
          <p className="eyebrow">Rexor CMS</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">
            Treść, oferta i wygląd
          </h1>
          {message && (
            <p className="mt-3 text-sm text-ink-muted" role="status">
              {message}
            </p>
          )}
        </div>
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            const tab = String(value);
            if (isAdminTabSlug(tab)) {
              setActiveTab(tab);
              window.history.pushState(null, '', `/admin/${tab}`);
            }
          }}
        >
          <TabsList className="no-scrollbar mb-6 h-auto max-w-full justify-start overflow-x-auto rounded-full bg-white p-1">
            <TabsTrigger value="models" className="rounded-full px-4 py-2">
              Modele i zdjęcia
            </TabsTrigger>
            <TabsTrigger value="frames" className="rounded-full px-4 py-2">
              Ramy
            </TabsTrigger>
            <TabsTrigger value="categories" className="rounded-full px-4 py-2">
              Kategorie
            </TabsTrigger>
            <TabsTrigger value="equipment" className="rounded-full px-4 py-2">
              Osprzęt i cena modelu
            </TabsTrigger>
            <TabsTrigger value="parts" className="rounded-full px-4 py-2">
              Części i ceny
            </TabsTrigger>
            <TabsTrigger value="paints" className="rounded-full px-4 py-2">
              Lakiery
            </TabsTrigger>
            <TabsTrigger value="batteries" className="rounded-full px-4 py-2">
              Baterie
            </TabsTrigger>
            <TabsTrigger value="service" className="rounded-full px-4 py-2">
              Strony
            </TabsTrigger>
            <TabsTrigger value="projects" className="rounded-full px-4 py-2">
              Realizacje
            </TabsTrigger>
            <TabsTrigger value="texts" className="rounded-full px-4 py-2">
              Teksty
            </TabsTrigger>
            <TabsTrigger value="theme" className="rounded-full px-4 py-2">
              Kolory
            </TabsTrigger>
            <TabsTrigger value="chatbot" className="rounded-full px-4 py-2">
              Chatbot AI
            </TabsTrigger>
            <TabsTrigger value="mail" className="rounded-full px-4 py-2">
              Poczta
            </TabsTrigger>
            <TabsTrigger value="inquiries" className="rounded-full px-4 py-2">
              Zapytania
            </TabsTrigger>
            <TabsTrigger
              value="activity-log"
              className="rounded-full px-4 py-2"
            >
              Dziennik aktywności
            </TabsTrigger>
          </TabsList>
          <TabsContent value="models">
            <ModelsEditor
              rows={catalog.models}
              media={catalog.modelMedia}
              categories={catalog.categories}
              specifications={catalog.modelSpecifications}
              patch={patch}
              request={request}
              reload={loadCatalog}
              setMessage={setMessage}
            />
          </TabsContent>
          <TabsContent value="frames">
            <FramesEditor
              rows={catalog.frames ?? []}
              media={catalog.frameMedia ?? []}
              categories={catalog.categories}
              patch={patch}
              request={request}
              reload={loadCatalog}
              setMessage={setMessage}
            />
          </TabsContent>
          <TabsContent value="categories">
            <CategoriesEditor
              rows={catalog.categories}
              patch={patch}
              request={request}
              reload={loadCatalog}
              setMessage={setMessage}
            />
          </TabsContent>
          <TabsContent value="equipment">
            <ModelEquipmentEditor
              catalog={catalog}
              patch={patch}
              request={request}
              reload={loadCatalog}
              setMessage={setMessage}
            />
          </TabsContent>
          <TabsContent value="parts">
            <PartsEditor
              rows={catalog.parts}
              partGroups={catalog.partGroups}
              models={catalog.models}
              modelParts={catalog.modelParts}
              patch={patch}
              request={request}
              reload={loadCatalog}
              setMessage={setMessage}
            />
          </TabsContent>
          <TabsContent value="paints">
            <PaintsEditor
              token={token}
              models={(catalog.models ?? []).map((row) => ({ slug: String(row.slug), name: String(row.name) }))}
              frames={(catalog.frames ?? []).map((row) => ({ slug: String(row.slug), name: String(row.name) }))}
              request={request}
              setMessage={setMessage}
            />
          </TabsContent>
          <TabsContent value="batteries">
            <BatteriesEditor
              batteries={catalog.batteries ?? []}
              models={catalog.models}
              request={request}
              reload={loadCatalog}
              setMessage={setMessage}
            />
          </TabsContent>
          <TabsContent value="service">
            <PagesEditor
              pages={catalog.pages}
              patch={patch}
              request={request}
              reload={loadCatalog}
              setMessage={setMessage}
            />
          </TabsContent>
          <TabsContent value="projects">
            <ProjectsEditor
              rows={catalog.projects ?? []}
              media={catalog.projectMedia ?? []}
              categories={catalog.categories}
              patch={patch}
              request={request}
              reload={loadCatalog}
              setMessage={setMessage}
            />
          </TabsContent>
          <TabsContent value="texts">
            <CopyEditor
              copy={catalog.copy}
              request={request}
              reload={loadCatalog}
              setMessage={setMessage}
            />
          </TabsContent>
          <TabsContent value="theme">
            <div className="grid gap-6">
              <ThemeEditor
                theme={catalog.theme}
                request={request}
                reload={loadCatalog}
                setMessage={setMessage}
              />
              <BrandingEditor
                branding={catalog.branding}
                request={request}
                reload={loadCatalog}
                setMessage={setMessage}
              />
            </div>
          </TabsContent>
          <TabsContent value="chatbot">
            <ChatbotPromptEditor
              chatbotPrompt={catalog.chatbotPrompt}
              request={request}
              reload={loadCatalog}
              setMessage={setMessage}
            />
          </TabsContent>
          <TabsContent value="mail">
            <div className="grid gap-6">
              <MailRoutingEditor
                mailRouting={catalog.mailRouting}
                request={request}
                reload={loadCatalog}
                setMessage={setMessage}
              />
              <ConfigurationEmailTemplateEditor
                template={catalog.configurationEmailTemplate}
                request={request}
                reload={loadCatalog}
                setMessage={setMessage}
              />
            </div>
          </TabsContent>
          <TabsContent value="inquiries">
            <InquiriesTable rows={catalog.inquiries} />
          </TabsContent>
          <TabsContent value="activity-log">
            <ActivityLogPanel request={request} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function InfoTooltip({
  text,
  side = 'top',
}: {
  text: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
}) {
  return (
    <TooltipProvider delay={100}>
      <Tooltip>
        <TooltipTrigger
          type="button"
          aria-label={text}
          className="inline-flex size-4 items-center justify-center rounded-full text-ink-muted hover:text-ink hover:bg-black/5 transition-colors cursor-help shrink-0"
        >
          <Info className="size-3.5" />
        </TooltipTrigger>
        <TooltipContent
          side={side}
          className="z-50 max-w-xs rounded-xl border border-line bg-ink px-3 py-2 text-left text-xs font-normal leading-relaxed text-white shadow-xl"
        >
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-line bg-white p-5 sm:p-7">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-ink-muted">{description}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

/**
 * Przycisk "Odśwież" z wizualnym potwierdzeniem: wirująca ikona w trakcie,
 * zielony haczyk po sukcesie, czerwony X po błędzie - bez tego przycisk nie
 * dawał żadnego znaku, czy dane faktycznie się odświeżyły.
 */
function RefreshButton({
  onRefresh,
  label = 'Odśwież',
}: {
  onRefresh: () => Promise<void>;
  label?: string;
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>(
    'idle',
  );

  async function run() {
    setState('loading');
    try {
      await onRefresh();
      setState('done');
    } catch {
      setState('error');
    } finally {
      setTimeout(() => setState('idle'), 1500);
    }
  }

  const icon =
    state === 'loading' ? (
      <RefreshCw className="animate-spin" />
    ) : state === 'done' ? (
      <Check className="text-emerald-600" />
    ) : state === 'error' ? (
      <X className="text-red-600" />
    ) : (
      <RefreshCw />
    );
  const text =
    state === 'loading'
      ? 'Odświeżanie…'
      : state === 'done'
        ? 'Odświeżono'
        : state === 'error'
          ? 'Błąd'
          : label;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={run}
      disabled={state === 'loading'}
    >
      {icon} {text}
    </Button>
  );
}

function PartsEditor({
  rows,
  partGroups,
  models,
  modelParts,
  patch,
  request,
  reload,
  setMessage,
}: {
  rows: Row[];
  partGroups: Row[];
  models: Row[];
  modelParts: ModelPartRow[];
  patch: (
    resource: string,
    id: number,
    fields: Record<string, unknown>,
  ) => Promise<void>;
  request: (path: string, options?: RequestInit) => Promise<any>;
  reload: () => Promise<void>;
  setMessage: (value: string) => void;
}) {
  const [drafts, setDrafts] = useState<Record<number, Row>>(() =>
    Object.fromEntries(rows.map((row) => [row.id, { ...row }])),
  );
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [newPart, setNewPart] = useState<{
    name: string;
    group_id: string;
    gross_price: string;
  }>({ name: '', group_id: String(partGroups[0]?.id ?? ''), gross_price: '' });

  useEffect(() => {
    setDrafts(Object.fromEntries(rows.map((row) => [row.id, { ...row }])));
  }, [rows]);

  async function addPart() {
    if (!newPart.name.trim() || !newPart.group_id) {
      setMessage('Podaj nazwę i kategorię nowej części.');
      return;
    }
    setMessage('Dodaję część…');
    try {
      await request('/admin/parts', {
        method: 'POST',
        body: JSON.stringify({
          name: newPart.name.trim(),
          group_id: Number(newPart.group_id),
          gross_price: newPart.gross_price || null,
        }),
      });
      setNewPart({ name: '', group_id: newPart.group_id, gross_price: '' });
      await reload();
      setMessage('Część dodana do katalogu.');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Nie udało się dodać części.',
      );
    }
  }

  async function toggleModelPart(model: Row, part: Row, assigned: boolean) {
    setMessage('Zapisuję przypisanie…');
    try {
      await request('/admin/model-parts', {
        method: 'POST',
        body: JSON.stringify({
          model_id: model.id,
          part_id: part.id,
          assigned,
        }),
      });
      await reload();
      setMessage(
        assigned ? 'Część przypisana do modelu.' : 'Część odpięta od modelu.',
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Nie udało się zapisać przypisania.',
      );
    }
  }

  async function deletePart(part: Row) {
    if (
      !window.confirm(
        `Usunąć część „${String(part.name)}"? Tej operacji nie można cofnąć.`,
      )
    )
      return;
    setMessage('Usuwam część…');
    try {
      await request(`/admin/parts/${part.id}`, { method: 'DELETE' });
      await reload();
      setMessage('Część usunięta.');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Nie udało się usunąć części.',
      );
    }
  }

  async function uploadPartImage(part: Row, file?: File) {
    if (!file) return;
    const form = new FormData();
    form.append('file', await compressUploadImage(file));
    setMessage('Wysyłam zdjęcie…');
    try {
      const result = await request('/admin/media', {
        method: 'POST',
        body: form,
      });
      await patch('parts', part.id, { image_path: `${API_BASE}${result.url}` });
      setMessage('Zdjęcie części zapisane.');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Nie udało się dodać zdjęcia.',
      );
    }
  }

  async function removePartImage(part: Row) {
    if (!window.confirm('Usunąć zdjęcie tej części?')) return;
    await patch('parts', part.id, { image_path: null });
  }

  const [preview, setPreview] = useState<{
    src: string;
    top: number;
    left: number;
  } | null>(null);
  function showPreview(event: MouseEvent<HTMLElement>, src: string) {
    const rect = event.currentTarget.getBoundingClientRect();
    const previewSize = 256;
    const fitsRight = rect.right + 12 + previewSize <= window.innerWidth;
    setPreview({
      src,
      top: Math.min(rect.top, window.innerHeight - previewSize - 12),
      left: fitsRight ? rect.right + 12 : rect.left - previewSize - 12,
    });
  }

  const groupOrder = new Map(partGroups.map((g, idx) => [Number(g.id), idx]));

  const filtered = rows
    .filter((row) => {
      if (selectedGroup !== 'all' && String(row.group_id) !== selectedGroup)
        return false;
      if (search.trim() !== '') {
        const q = search.toLowerCase();
        const name = String(row.name ?? '').toLowerCase();
        const sku = String(row.sku ?? '').toLowerCase();
        const groupName = String(row.group_name ?? '').toLowerCase();
        if (!name.includes(q) && !sku.includes(q) && !groupName.includes(q))
          return false;
      }
      return true;
    })
    .sort((a, b) => {
      const orderA = groupOrder.get(Number(a.group_id)) ?? 999;
      const orderB = groupOrder.get(Number(b.group_id)) ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return String(a.name ?? '').localeCompare(String(b.name ?? ''));
    });

  return (
    <div className="grid min-w-0 gap-6">
      {/* 1. EDUCATIONAL CALLOUT */}
      <div className="rounded-3xl border border-line bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-500/10 text-amber-600">
              <Layers className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[0.7rem] font-semibold text-amber-700">
                  Katalog komponentów
                </span>
                <span className="text-xs text-ink-muted">
                  Cennik bazowy i kategorie części
                </span>
              </div>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-ink">
                Części pogrupowane według kategorii
              </h2>
              <p className="mt-1 text-sm text-ink-muted max-w-3xl leading-relaxed">
                Każda część należy do określonej{' '}
                <strong>Kategorii części</strong> (np.{' '}
                <em>Hamulce, Amortyzator, Napęd, Koła</em>) i posiada globalną
                cenę brutto. Poniżej możesz przeglądać części wg kategorii,
                zmieniać ich kategorię lub cenę oraz sprawdzać, w których
                modelach rowerów są aktualnie używane.
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-line/60 bg-ink-wash p-3.5 text-xs text-ink-muted lg:max-w-sm">
            <strong className="block text-ink mb-1">
              Różnica względem „Osprzęt i cena modelu”:
            </strong>
            Tutaj ustalasz globalne ceny części i ich kategorie. W zakładce{' '}
            <strong>Osprzęt i cena modelu</strong> decydujesz, które części
            wchodzą w skład danego roweru i która z nich jest pozycją bazową
            (wyznaczającą cenę „od”).
          </div>
        </div>
      </div>

      {/* 1b. ADD NEW PART */}
      <div className="rounded-3xl border border-line bg-white p-5 sm:p-6 shadow-xs">
        <h3 className="text-sm font-semibold tracking-tight text-ink">
          Dodaj nową część
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1.4fr_1fr_0.8fr_auto]">
          <Input
            placeholder="Nazwa części"
            value={newPart.name}
            onChange={(e) => setNewPart({ ...newPart, name: e.target.value })}
            className="h-9 text-sm"
          />
          <NativeSelect
            value={newPart.group_id}
            onChange={(e) =>
              setNewPart({ ...newPart, group_id: e.target.value })
            }
            className="h-9 text-xs"
          >
            {partGroups.map((g) => (
              <NativeSelectOption key={g.id} value={g.id}>
                {String(g.name)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <Input
            type="number"
            step="0.01"
            placeholder="Cena brutto"
            value={newPart.gross_price}
            onChange={(e) =>
              setNewPart({ ...newPart, gross_price: e.target.value })
            }
            className="h-9 text-sm tabular-nums"
          />
          <Button size="sm" onClick={addPart}>
            <Save /> Dodaj
          </Button>
        </div>
      </div>

      {/* 2. CATEGORY SWITCHER BAR */}
      <div className="rounded-3xl border border-line bg-white p-5 sm:p-7 shadow-xs">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-ink">
              Kategorie części
            </h3>
            <p className="text-xs text-ink-muted">
              Kliknij kategorię, aby szybko zawęzić listę ({partGroups.length}{' '}
              zdefiniowanych kategorii)
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ink-muted" />
            <Input
              placeholder="Szukaj części lub SKU…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        <div className="no-scrollbar flex flex-wrap items-center gap-2 overflow-x-auto pb-2">
          <button
            type="button"
            onClick={() => setSelectedGroup('all')}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer',
              selectedGroup === 'all'
                ? 'bg-ink text-white shadow-xs font-semibold'
                : 'bg-ink-wash text-ink-muted hover:bg-black/10 hover:text-ink',
            )}
          >
            <span>Wszystkie kategorie</span>
            <span
              className={cn(
                'rounded-full px-1.5 py-0.2 text-[0.65rem] tabular-nums',
                selectedGroup === 'all'
                  ? 'bg-white/20 text-white'
                  : 'bg-white text-ink-muted shadow-2xs',
              )}
            >
              {rows.length}
            </span>
          </button>
          {partGroups.map((g) => {
            const count = rows.filter(
              (r) => Number(r.group_id) === Number(g.id),
            ).length;
            if (count === 0) return null;
            const isSel = selectedGroup === String(g.id);
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedGroup(String(g.id))}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer',
                  isSel
                    ? 'bg-ink text-white shadow-xs font-semibold'
                    : 'bg-ink-wash text-ink-muted hover:bg-black/10 hover:text-ink',
                )}
              >
                <span>{String(g.name)}</span>
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.2 text-[0.65rem] tabular-nums',
                    isSel
                      ? 'bg-white/20 text-white'
                      : 'bg-white text-ink-muted shadow-2xs',
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 3. PARTS TABLE WITH CATEGORY HEADERS */}
        <div className="mt-6 overflow-x-auto">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow className="border-b border-line bg-ink-wash/40">
                <TableHead className="w-20">Zdjęcie</TableHead>
                <TableHead className="w-48">
                  <span className="inline-flex items-center gap-1">
                    Kategoria części
                    <InfoTooltip text="Grupa komponentu (np. Hamulce, Damper, Napęd). Możesz ją zmienić z listy, aby przenieść część do innej kategorii." />
                  </span>
                </TableHead>
                <TableHead>
                  <span className="inline-flex items-center gap-1">
                    Nazwa i opis
                    <InfoTooltip text="Nazwa i opis wyświetlane przy tej opcji w konfiguratorze (opis to np. 'Cztery tłoczki, klamka 2-palcowa')." />
                  </span>
                </TableHead>
                <TableHead className="w-32">SKU</TableHead>
                <TableHead className="w-40">
                  <span className="inline-flex items-center gap-1">
                    Cena brutto (zł)
                    <InfoTooltip text="Globalna cena katalogowa brutto. Zmiana tutaj przelicza ceny 'od' wszystkich modeli rowerów, w których ta część jest domyślna." />
                  </span>
                </TableHead>
                <TableHead className="w-48">
                  <span className="inline-flex items-center gap-1">
                    W modelach rowerów
                    <InfoTooltip text="Rowery, w których ta część jest aktualnie przypisana i dostępna w konfiguratorze." />
                  </span>
                </TableHead>
                <TableHead className="w-20 text-center">Aktywna</TableHead>
                <TableHead className="w-28 text-right">Akcja</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-12 text-center text-sm text-ink-muted"
                  >
                    Nie znaleziono części w wybranej kategorii.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((row, index) => {
                const prevRow = filtered[index - 1];
                const showGroupHeader =
                  selectedGroup === 'all' &&
                  (!prevRow || prevRow.group_id !== row.group_id);
                const assigned = models.filter((m) =>
                  modelParts.some(
                    (mp) =>
                      Number(mp.part_id) === Number(row.id) &&
                      Number(mp.model_id) === Number(m.id),
                  ),
                );

                return (
                  <TableRow
                    key={row.id}
                    className="transition-colors hover:bg-black/[0.02]"
                  >
                    <TableCell className="w-20">
                      {row.image_path ? (
                        <div className="group/thumb relative inline-block">
                          <img
                            src={String(row.image_path)}
                            alt={String(row.name)}
                            onMouseEnter={(event) =>
                              showPreview(event, String(row.image_path))
                            }
                            onMouseLeave={() => setPreview(null)}
                            className="size-12 rounded-lg border border-line bg-white object-contain cursor-zoom-in"
                          />
                          <button
                            type="button"
                            onClick={() => removePartImage(row)}
                            aria-label="Usuń zdjęcie części"
                            className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-white text-ink opacity-0 shadow border border-line transition-opacity group-hover/thumb:opacity-100 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      ) : (
                        <Label className="flex size-12 cursor-pointer items-center justify-center rounded-lg border border-dashed border-line text-ink-muted hover:border-line-strong hover:text-ink">
                          <Upload className="size-4" />
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/avif"
                            className="sr-only"
                            onChange={(event) =>
                              void uploadPartImage(row, event.target.files?.[0])
                            }
                          />
                        </Label>
                      )}
                    </TableCell>
                    <TableCell className="w-48 max-w-48">
                      <NativeSelect
                        value={String(
                          drafts[row.id]?.group_id ?? row.group_id ?? '',
                        )}
                        onChange={(e) =>
                          setDrafts({
                            ...drafts,
                            [row.id]: {
                              ...drafts[row.id],
                              group_id: e.target.value,
                            },
                          })
                        }
                        className="w-full h-9 text-xs"
                      >
                        {partGroups.map((g) => (
                          <NativeSelectOption key={g.id} value={g.id}>
                            {String(g.name)}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </TableCell>
                    <TableCell className="max-w-0 min-w-0 whitespace-normal font-medium">
                      <div className="grid gap-1.5">
                        <Input
                          value={String(drafts[row.id]?.name ?? '')}
                          onChange={(event) =>
                            setDrafts({
                              ...drafts,
                              [row.id]: {
                                ...drafts[row.id],
                                name: event.target.value,
                              },
                            })
                          }
                          className="h-9 text-sm"
                        />
                        <Input
                          placeholder="Opis widoczny w konfiguratorze (opcjonalny)"
                          value={String(drafts[row.id]?.description ?? '')}
                          onChange={(event) =>
                            setDrafts({
                              ...drafts,
                              [row.id]: {
                                ...drafts[row.id],
                                description: event.target.value,
                              },
                            })
                          }
                          className="h-8 text-xs text-ink-muted"
                        />
                      </div>
                    </TableCell>
                    <TableCell
                      className="max-w-0 truncate font-mono text-xs text-ink-subtle"
                      title={String(row.sku ?? '')}
                    >
                      {String(row.sku ?? '—')}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={String(drafts[row.id]?.gross_price ?? '')}
                        onChange={(event) =>
                          setDrafts({
                            ...drafts,
                            [row.id]: {
                              ...drafts[row.id],
                              gross_price: event.target.value,
                            },
                          })
                        }
                        className="h-9 text-sm tabular-nums"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {models.map((m) => {
                          const isAssigned = assigned.some(
                            (a) => Number(a.id) === Number(m.id),
                          );
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() =>
                                toggleModelPart(m, row, !isAssigned)
                              }
                              title={
                                isAssigned
                                  ? 'Kliknij, aby odpiąć od modelu'
                                  : 'Kliknij, aby przypisać do modelu'
                              }
                              className={cn(
                                'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[0.7rem] font-medium transition-colors cursor-pointer border',
                                isAssigned
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-ink-wash text-ink-subtle border-transparent hover:bg-black/10 hover:text-ink',
                              )}
                            >
                              <Bike className="size-3" />
                              {String(m.name).replace('Rexor ', '')}
                            </button>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={Boolean(
                          Number(
                            drafts[row.id]?.is_active ?? row.is_active ?? 1,
                          ),
                        )}
                        onCheckedChange={(checked) => {
                          setDrafts({
                            ...drafts,
                            [row.id]: { ...drafts[row.id], is_active: checked },
                          });
                          void patch('parts', row.id, { is_active: checked });
                        }}
                      />
                    </TableCell>
                    <TableCell className="max-w-28 text-right">
                      <div className="flex flex-col items-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            patch('parts', row.id, {
                              name: drafts[row.id]?.name,
                              group_id: drafts[row.id]?.group_id
                                ? Number(drafts[row.id]?.group_id)
                                : row.group_id,
                              description: drafts[row.id]?.description ?? '',
                              gross_price: drafts[row.id]?.gross_price,
                            })
                          }
                        >
                          <Save /> Zapisz
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deletePart(row)}
                          title="Usuń część"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 /> Usuń
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
      {preview && (
        <img
          src={preview.src}
          alt=""
          style={{ top: preview.top, left: preview.left }}
          className="pointer-events-none fixed z-50 size-64 rounded-xl border border-line bg-white object-contain p-2 shadow-2xl"
        />
      )}
    </div>
  );
}

/** Zdjęcie kategorii jako pojedyncze default_image_path (jak u modeli), wgrywane przez ten sam pipeline co inne zdjęcia w panelu - usuwanie tylko czyści to pole, sam plik zostaje (spójnie z tym, jak działają zdjęcia startowe modeli). */
function CategoriesEditor({
  rows,
  patch,
  request,
  reload,
  setMessage,
}: {
  rows: Row[];
  patch: (
    resource: string,
    id: number,
    fields: Record<string, unknown>,
  ) => Promise<void>;
  request: (path: string, options?: RequestInit) => Promise<any>;
  reload: () => Promise<void>;
  setMessage: (value: string) => void;
}) {
  async function deleteCategory(row: Row) {
    if (
      !window.confirm(
        `Usunąć kategorię „${String(row.name)}"? Musi być pusta - modele i ramy trzeba wcześniej przenieść gdzie indziej. Trasa /rowery/${String(row.slug)} zniknie dopiero po kolejnym buildzie strony.`,
      )
    )
      return;
    setMessage('Usuwam kategorię…');
    try {
      await request(`/admin/categories/${row.id}`, { method: 'DELETE' });
      await reload();
      setMessage('Kategoria usunięta.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Nie udało się usunąć kategorii.',
      );
    }
  }

  const [drafts, setDrafts] = useState<Record<number, Row>>(() =>
    Object.fromEntries(rows.map((row) => [row.id, { ...row }])),
  );

  useEffect(() => {
    setDrafts(Object.fromEntries(rows.map((row) => [row.id, { ...row }])));
  }, [rows]);

  function imageSrc(path: string) {
    return path.startsWith('http') ? path : `${API_BASE}${path}`;
  }

  async function uploadImage(row: Row, file?: File) {
    if (!file) return;
    const form = new FormData();
    form.append('file', await compressUploadImage(file));
    form.append('ownerType', 'category');
    form.append('ownerId', String(row.id));
    form.append('role', 'default');
    form.append('altText', String(row.name));
    setMessage('Wysyłam zdjęcie…');
    try {
      const result = await request('/admin/media', {
        method: 'POST',
        body: form,
      });
      await patch('categories', row.id, {
        default_image_path: `${API_BASE}${result.url}`,
      });
      setMessage('Zdjęcie kategorii zaktualizowane.');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Nie udało się dodać zdjęcia.',
      );
    }
  }

  async function removeImage(row: Row) {
    if (!window.confirm('Usunąć zdjęcie tej kategorii?')) return;
    await patch('categories', row.id, { default_image_path: '' });
  }

  return (
    <Panel
      title="Kategorie"
      description="Nazwa, krótki opis i zdjęcie widoczne na stronie głównej oraz na liście kategorii."
    >
      <div className="grid gap-4">
        {rows.map((row) => (
          <article
            key={row.id}
            className="grid gap-4 rounded-2xl border border-line p-5 sm:grid-cols-[160px_1fr] sm:p-6"
          >
            <div className="grid gap-2">
              <div className="aspect-[4/3] overflow-hidden rounded-xl bg-[var(--muted)]">
                {row.default_image_path ? (
                  <img
                    src={imageSrc(String(row.default_image_path))}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="grid size-full place-items-center text-center text-xs text-ink-subtle">
                    Brak zdjęcia
                  </div>
                )}
              </div>
              <div className="flex gap-1.5">
                <Label className="inline-flex h-8 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-medium">
                  <Upload className="size-3.5" /> Zmień
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    className="sr-only"
                    onChange={(event) =>
                      void uploadImage(row, event.target.files?.[0])
                    }
                  />
                </Label>
                {row.default_image_path && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 px-2"
                    onClick={() => void removeImage(row)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            </div>
            <div className="grid gap-3">
              <div className="grid gap-1">
                <Label
                  className="text-xs text-ink-muted"
                  htmlFor={`cat-name-${row.id}`}
                >
                  Nazwa
                </Label>
                <Input
                  id={`cat-name-${row.id}`}
                  value={String(drafts[row.id]?.name ?? '')}
                  onChange={(event) =>
                    setDrafts({
                      ...drafts,
                      [row.id]: { ...drafts[row.id], name: event.target.value },
                    })
                  }
                />
              </div>
              <div className="grid gap-1">
                <Label
                  className="text-xs text-ink-muted"
                  htmlFor={`cat-desc-${row.id}`}
                >
                  Krótki opis
                </Label>
                <Input
                  id={`cat-desc-${row.id}`}
                  value={String(drafts[row.id]?.short_description ?? '')}
                  onChange={(event) =>
                    setDrafts({
                      ...drafts,
                      [row.id]: {
                        ...drafts[row.id],
                        short_description: event.target.value,
                      },
                    })
                  }
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={Boolean(
                    drafts[row.id]?.is_published ?? row.is_published,
                  )}
                  onCheckedChange={(checked) => {
                    setDrafts({
                      ...drafts,
                      [row.id]: { ...drafts[row.id], is_published: checked },
                    });
                    void patch('categories', row.id, { is_published: checked });
                  }}
                />{' '}
                Widoczna na stronie głównej
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  className="w-fit"
                  onClick={() =>
                    patch('categories', row.id, {
                      name: drafts[row.id]?.name ?? row.name,
                      short_description:
                        drafts[row.id]?.short_description ??
                        row.short_description,
                    })
                  }
                >
                  <Save /> Zapisz
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-fit text-red-600"
                  onClick={() => void deleteCategory(row)}
                >
                  <Trash2 className="size-3.5" /> Usuń
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function SimpleEditor({
  resource,
  rows,
  patch,
  fields,
}: {
  resource: string;
  rows: Row[];
  patch: (
    resource: string,
    id: number,
    fields: Record<string, unknown>,
  ) => Promise<void>;
  fields: string[][];
}) {
  const [drafts, setDrafts] = useState<Record<number, Row>>(() =>
    Object.fromEntries(rows.map((row) => [row.id, { ...row }])),
  );

  useEffect(() => {
    setDrafts(Object.fromEntries(rows.map((row) => [row.id, { ...row }])));
  }, [rows]);

  return (
    <Panel
      title={resource === 'parts' ? 'Części i ceny brutto' : 'Kategorie'}
      description="Zmieniaj dane bez edycji kodu. Zapis dotyczy pojedynczego wiersza."
    >
      <Table>
        <TableHeader>
          <TableRow>
            {fields.map(([, label]) => (
              <TableHead key={label}>{label}</TableHead>
            ))}
            <TableHead className="w-28">Akcja</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              {fields.map(([field]) => (
                <TableCell key={field} className="min-w-52">
                  <Input
                    type={field.includes('price') ? 'number' : 'text'}
                    step={field.includes('price') ? '0.01' : undefined}
                    value={String(drafts[row.id]?.[field] ?? '')}
                    onChange={(event) =>
                      setDrafts({
                        ...drafts,
                        [row.id]: {
                          ...drafts[row.id],
                          [field]: event.target.value,
                        },
                      })
                    }
                  />
                </TableCell>
              ))}
              <TableCell>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    patch(
                      resource,
                      row.id,
                      Object.fromEntries(
                        fields.map(([field]) => [
                          field,
                          drafts[row.id]?.[field],
                        ]),
                      ),
                    )
                  }
                >
                  <Save /> Zapisz
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Panel>
  );
}

function WysiwygEditor({
  value,
  initialHtml,
  onChange,
  onUploadImage,
  onAiEdit,
  onRef,
  minHeight = 'min-h-48',
}: {
  value?: string;
  initialHtml?: string;
  onChange?: (html: string) => void;
  onUploadImage?: (file: File) => Promise<string | null>;
  /** Wysyła (instrukcja, aktualny HTML) do backendu AI i zwraca zaproponowany HTML całego pola. */
  onAiEdit?: (instruction: string, currentHtml: string) => Promise<string>;
  onRef?: (el: HTMLDivElement | null) => void;
  minHeight?: string;
}) {
  const localRef = useRef<HTMLDivElement | null>(null);
  const content = value ?? initialHtml ?? '';
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiInstruction, setAiInstruction] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiProposal, setAiProposal] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(
    null,
  );

  useEffect(() => {
    try {
      document.execCommand('defaultParagraphSeparator', false, 'p');
    } catch {}
  }, []);

  useEffect(() => {
    if (localRef.current && localRef.current.innerHTML !== content) {
      localRef.current.innerHTML = content;
      setSelectedImage(null);
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

  async function handleImages(files?: FileList | null) {
    for (const file of Array.from(files ?? [])) await handleImage(file);
  }

  function selectImage(img: HTMLImageElement | null) {
    setSelectedImage((prev) => {
      if (prev && prev !== img) {
        prev.style.outline = '';
        prev.style.outlineOffset = '';
      }
      if (img) {
        img.style.outline = '2px solid var(--ring)';
        img.style.outlineOffset = '2px';
      }
      return img;
    });
  }

  /** Odczytuje HTML edytora bez podglądu zaznaczenia zdjęcia, żeby obramowanie wyboru nie trafiło do zapisu. */
  function emitChange() {
    if (!localRef.current) return;
    if (selectedImage) selectedImage.style.outline = '';
    const html = localRef.current.innerHTML;
    if (selectedImage) {
      selectedImage.style.outline = '2px solid var(--ring)';
      selectedImage.style.outlineOffset = '2px';
    }
    onChange?.(html);
  }

  function setSelectedImageWidth(percent: number | null) {
    if (!selectedImage) return;
    if (percent === null) {
      selectedImage.style.removeProperty('width');
      selectedImage.style.removeProperty('height');
    } else {
      selectedImage.style.width = `${percent}%`;
      selectedImage.style.height = 'auto';
    }
    emitChange();
  }

  async function generateAiProposal() {
    if (!onAiEdit || !aiInstruction.trim()) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const currentHtml = localRef.current?.innerHTML ?? content;
      const proposal = await onAiEdit(aiInstruction.trim(), currentHtml);
      setAiProposal(proposal);
    } catch (error) {
      setAiError(
        error instanceof Error
          ? error.message
          : 'Nie udało się wygenerować propozycji AI.',
      );
    } finally {
      setAiLoading(false);
    }
  }

  function applyAiProposal() {
    if (aiProposal === null || !localRef.current) return;
    localRef.current.innerHTML = aiProposal;
    onChange?.(aiProposal);
    setAiProposal(null);
    setAiInstruction('');
    setAiPanelOpen(false);
  }

  function discardAiProposal() {
    setAiProposal(null);
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-1 rounded-xl border bg-[var(--muted)] p-1.5">
        <Button
          size="icon-sm"
          variant="ghost"
          type="button"
          onClick={() => format('bold')}
          aria-label="Pogrubienie"
          title="Pogrubienie"
        >
          <Bold className="size-4" />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          type="button"
          onClick={() => format('italic')}
          aria-label="Kursywa"
          title="Kursywa"
        >
          <Italic className="size-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          type="button"
          className="h-8 px-2 text-xs font-semibold"
          onClick={() => format('formatBlock', '<h3>')}
          title="Nagłówek H3"
        >
          H3
        </Button>
        <Button
          size="sm"
          variant="ghost"
          type="button"
          className="h-8 px-2 text-xs"
          onClick={() => format('formatBlock', '<p>')}
          title="Akapit"
        >
          P
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          type="button"
          onClick={() => format('insertUnorderedList')}
          aria-label="Lista punktowana"
          title="Lista"
        >
          <List className="size-4" />
        </Button>
        {onUploadImage && (
          <Label
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg hover:bg-white"
            aria-label="Wstaw zdjęcia"
            title="Wstaw jedno lub wiele zdjęć"
          >
            <ImagePlus className="size-4" />
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => void handleImages(e.target.files)}
            />
          </Label>
        )}
        {onAiEdit && (
          <Button
            size="sm"
            type="button"
            variant={aiPanelOpen ? 'default' : 'outline'}
            className={cn(
              'ml-auto h-8 gap-1.5 px-3 text-xs font-semibold',
              !aiPanelOpen &&
                'border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100',
            )}
            onClick={() => setAiPanelOpen((open) => !open)}
          >
            <Sparkles className="size-3.5" /> Edytuj promptem AI
          </Button>
        )}
      </div>

      {onAiEdit && aiPanelOpen && (
        <div className="grid gap-2 rounded-2xl border border-violet-200 bg-violet-50/60 p-3">
          <Label className="flex items-center gap-1.5 text-xs font-semibold text-violet-900">
            <Sparkles className="size-3.5" /> Co ma zrobić asystent z treścią
            tego pola?
          </Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={aiInstruction}
              onChange={(event) => setAiInstruction(event.target.value)}
              placeholder="np. „zrób z tych punktów tabelę” albo „dodaj wiersz z szacowaną prędkością”"
              className="bg-white"
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void generateAiProposal();
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              className="shrink-0 gap-1.5 bg-violet-600 hover:bg-violet-700"
              disabled={aiLoading || !aiInstruction.trim()}
              onClick={() => void generateAiProposal()}
            >
              <Sparkles className="size-3.5" />{' '}
              {aiLoading ? 'Generuję…' : 'Generuj'}
            </Button>
          </div>
          {aiError && (
            <p className="text-xs font-medium text-red-700">{aiError}</p>
          )}
          <p className="text-xs text-violet-800/80">
            Asystent zaproponuje nową treść pola — nic nie zmieni się w
            edytorze, dopóki nie zatwierdzisz propozycji poniżej, i nic nie
            zapisze się na serwerze, dopóki nie klikniesz „Zapisz”.
          </p>
        </div>
      )}

      {selectedImage && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border bg-[var(--muted)] p-1.5 text-xs">
          <span className="px-1.5 font-medium text-ink-muted">
            Rozmiar zaznaczonego zdjęcia:
          </span>
          {[25, 50, 75, 100].map((percent) => (
            <Button
              key={percent}
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => setSelectedImageWidth(percent)}
            >
              {percent}%
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => setSelectedImageWidth(null)}
          >
            Oryginalny
          </Button>
        </div>
      )}

      {aiProposal !== null && (
        <div className="grid gap-2 rounded-2xl border-2 border-violet-300 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-1.5 text-xs font-semibold text-violet-900">
              <Sparkles className="size-3.5" /> Propozycja AI — sprawdź przed
              zastosowaniem
            </Label>
          </div>
          <div
            className="rich-content max-h-72 overflow-y-auto rounded-xl border border-violet-200 bg-violet-50/40 p-3 text-sm"
            dangerouslySetInnerHTML={{ __html: aiProposal }}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              className="gap-1.5 bg-violet-600 hover:bg-violet-700"
              onClick={applyAiProposal}
            >
              Zastosuj do edytora
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={discardAiProposal}
            >
              Odrzuć
            </Button>
          </div>
        </div>
      )}

      <div
        ref={setRef}
        contentEditable
        suppressContentEditableWarning
        className={`rich-content ${minHeight} max-h-[460px] overflow-y-auto rounded-2xl border bg-white p-4 text-sm outline-none focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/20`}
        onInput={() => emitChange()}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.tagName === 'IMG') {
            selectImage(target as HTMLImageElement);
          } else if (selectedImage) {
            selectImage(null);
          }
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

function ModelsEditor({
  rows,
  media,
  categories,
  specifications,
  patch,
  request,
  reload,
  setMessage,
}: {
  rows: Row[];
  media: MediaRow[];
  categories: Row[];
  specifications: Record<number, { facts?: string[]; [key: string]: unknown }>;
  patch: (
    resource: string,
    id: number,
    fields: Record<string, unknown>,
  ) => Promise<void>;
  request: (path: string, options?: RequestInit) => Promise<any>;
  reload: () => Promise<void>;
  setMessage: (value: string) => void;
}) {
  const [drafts, setDrafts] = useState<Record<number, Row>>(() =>
    Object.fromEntries(
      rows.map((row) => [
        row.id,
        {
          ...row,
          facts_text: (specifications[row.id]?.facts ?? []).join('\n'),
        },
      ]),
    ),
  );
  const editorRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        rows.map((row) => [
          row.id,
          {
            ...row,
            facts_text: (specifications[row.id]?.facts ?? []).join('\n'),
          },
        ]),
      ),
    );
  }, [rows, specifications]);

  async function upload(model: Row, files?: FileList | null) {
    const selected = Array.from(files ?? []);
    if (selected.length === 0) return;
    let defaultImagePath = String(model.default_image_path ?? '');
    setMessage(`Wysyłam zdjęcia (0/${selected.length})…`);
    try {
      for (const [index, file] of selected.entries()) {
        const form = new FormData();
        form.append('file', await compressUploadImage(file));
        form.append('ownerType', 'model');
        form.append('ownerId', String(model.id));
        form.append('role', 'gallery');
        form.append('altText', String(model.name));
        const result = await request('/admin/media', {
          method: 'POST',
          body: form,
        });
        if (!defaultImagePath) {
          defaultImagePath = `${API_BASE}${result.url}`;
          await request(`/admin/models/${model.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ default_image_path: defaultImagePath }),
          });
        }
        setMessage(`Wysyłam zdjęcia (${index + 1}/${selected.length})…`);
      }
      await reload();
      setMessage(
        selected.length === 1
          ? 'Zdjęcie dodane do galerii.'
          : `Dodano ${selected.length} zdjęć do galerii.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Nie udało się dodać zdjęć.',
      );
    }
  }
  async function removePhoto(model: Row, mediaId: number) {
    if (!window.confirm('Usunąć to zdjęcie z galerii modelu?')) return;
    setMessage('Usuwam zdjęcie…');
    try {
      await request(`/admin/models/${model.id}/media/${mediaId}`, {
        method: 'DELETE',
      });
      await reload();
      setMessage('Zdjęcie usunięte.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Nie udało się usunąć zdjęcia.',
      );
    }
  }
  async function moveMedia(
    model: Row,
    orderedIds: number[],
    mediaId: number,
    direction: -1 | 1,
  ) {
    const index = orderedIds.indexOf(mediaId);
    const targetIndex = index + direction;
    if (index === -1 || targetIndex < 0 || targetIndex >= orderedIds.length)
      return;
    const reordered = [...orderedIds];
    [reordered[index], reordered[targetIndex]] = [
      reordered[targetIndex],
      reordered[index],
    ];
    setMessage('Zapisuję kolejność…');
    try {
      await request(`/admin/models/${model.id}/media/reorder`, {
        method: 'PATCH',
        body: JSON.stringify({ mediaIds: reordered }),
      });
      await reload();
      setMessage('Kolejność zdjęć zapisana.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Nie udało się zapisać kolejności.',
      );
    }
  }
  function imageSrc(path: string) {
    return path.startsWith('http') ? path : `${API_BASE}${path}`;
  }
  const [newModel, setNewModel] = useState<{
    name: string;
    category_id: string;
    short_description: string;
  }>({
    name: '',
    category_id: String(categories[0]?.id ?? ''),
    short_description: '',
  });
  async function deleteModel(model: Row) {
    if (
      !window.confirm(
        `Usunąć model „${String(model.name)}"? Znikną razem z nim rozmiary, baterie, przypisany osprzęt i galeria. Tej operacji nie można cofnąć.`,
      )
    )
      return;
    setMessage('Usuwam model…');
    try {
      await request(`/admin/models/${model.id}`, { method: 'DELETE' });
      await reload();
      setMessage('Model usunięty.');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Nie udało się usunąć modelu.',
      );
    }
  }

  async function addModel() {
    if (!newModel.name.trim() || !newModel.category_id) {
      setMessage('Podaj nazwę i kategorię nowego modelu.');
      return;
    }
    setMessage('Dodaję model…');
    try {
      await request('/admin/models', {
        method: 'POST',
        body: JSON.stringify({
          name: newModel.name.trim(),
          category_id: Number(newModel.category_id),
          short_description: newModel.short_description.trim() || null,
        }),
      });
      setNewModel({
        name: '',
        category_id: newModel.category_id,
        short_description: '',
      });
      await reload();
      setMessage(
        'Model dodany. Uzupełnij ramę, cenę i osprzęt w edytorze poniżej.',
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Nie udało się dodać modelu.',
      );
    }
  }
  return (
    <Panel
      title="Modele i galerie"
      description="Zdjęcia są wieloelementową galerią. Możesz wybrać wiele plików naraz; zachowają kolejność wyboru."
    >
      <div className="mb-6 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h3 className="text-sm font-semibold tracking-tight text-ink">
          Dodaj nowy model
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr]">
          <Input
            placeholder="Nazwa modelu (np. Rexor E70)"
            value={newModel.name}
            onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
            className="h-9 text-sm"
          />
          <NativeSelect
            value={newModel.category_id}
            onChange={(e) =>
              setNewModel({ ...newModel, category_id: e.target.value })
            }
            className="h-9 text-xs"
          >
            {categories.map((category) => (
              <NativeSelectOption key={category.id} value={category.id}>
                {String(category.name)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <Input
          placeholder="Krótki opis (widoczny na liście rowerów)"
          value={newModel.short_description}
          onChange={(e) =>
            setNewModel({ ...newModel, short_description: e.target.value })
          }
          className="mt-3 h-9 text-sm"
        />
        <Button size="sm" className="mt-3" onClick={addModel}>
          <Save /> Dodaj model
        </Button>
      </div>
      <div className="grid gap-6">
        {rows.map((row) => {
          const modelMedia = media.filter((item) => item.model_id === row.id);
          return (
            <article
              key={row.id}
              className="min-w-0 rounded-2xl border border-line p-5 sm:p-6"
            >
              <div className="flex gap-3 overflow-x-auto pb-3">
                {modelMedia.length === 0 && (
                  <img
                    src={String(row.default_image_path || '/models/e82/01.jpg')}
                    alt=""
                    className="h-28 w-40 shrink-0 rounded-xl bg-[var(--muted)] object-contain"
                  />
                )}
                {modelMedia.map((item, itemIdx) => {
                  const orderedIds = modelMedia.map((m) => m.media_id);
                  return (
                    <div
                      key={item.media_id}
                      className="group/photo relative h-28 w-40 shrink-0"
                    >
                      <a
                        href={imageSrc(item.storage_path)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          src={imageSrc(item.storage_path)}
                          alt={item.alt_text}
                          className="size-full rounded-xl bg-[var(--muted)] object-contain"
                        />
                      </a>
                      <button
                        type="button"
                        onClick={() => removePhoto(row, item.media_id)}
                        aria-label="Usuń zdjęcie"
                        className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-white/90 text-ink opacity-0 shadow transition-opacity group-hover/photo:opacity-100 hover:bg-white"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                      <div className="absolute inset-x-1 bottom-1 flex items-center justify-between opacity-0 transition-opacity group-hover/photo:opacity-100">
                        <button
                          type="button"
                          onClick={() =>
                            moveMedia(row, orderedIds, item.media_id, -1)
                          }
                          disabled={itemIdx === 0}
                          aria-label="Przesuń zdjęcie w lewo"
                          className="grid size-6 place-items-center rounded-full bg-white/90 text-ink shadow hover:bg-white disabled:pointer-events-none disabled:opacity-30"
                        >
                          <ChevronLeft className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            moveMedia(row, orderedIds, item.media_id, 1)
                          }
                          disabled={itemIdx === modelMedia.length - 1}
                          aria-label="Przesuń zdjęcie w prawo"
                          className="grid size-6 place-items-center rounded-full bg-white/90 text-ink shadow hover:bg-white disabled:pointer-events-none disabled:opacity-30"
                        >
                          <ChevronRight className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 grid gap-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1">
                    <Label
                      className="text-xs text-ink-muted"
                      htmlFor={`model-name-${row.id}`}
                    >
                      Nazwa modelu
                    </Label>
                    <Input
                      id={`model-name-${row.id}`}
                      value={String(drafts[row.id]?.name ?? '')}
                      onChange={(event) =>
                        setDrafts({
                          ...drafts,
                          [row.id]: {
                            ...drafts[row.id],
                            name: event.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label
                      className="text-xs text-ink-muted"
                      htmlFor={`model-cat-${row.id}`}
                    >
                      Kategoria
                    </Label>
                    <NativeSelect
                      id={`model-cat-${row.id}`}
                      value={String(drafts[row.id]?.category_id ?? '')}
                      onChange={(event) =>
                        setDrafts({
                          ...drafts,
                          [row.id]: {
                            ...drafts[row.id],
                            category_id: event.target.value,
                          },
                        })
                      }
                      className="w-full"
                    >
                      {categories.map((category) => (
                        <NativeSelectOption
                          key={category.id}
                          value={category.id}
                        >
                          {String(category.name)}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="grid gap-1">
                    <Label
                      className="text-xs text-ink-muted"
                      htmlFor={`model-status-${row.id}`}
                    >
                      Status
                    </Label>
                    <NativeSelect
                      id={`model-status-${row.id}`}
                      value={String(drafts[row.id]?.status ?? 'draft')}
                      onChange={(event) =>
                        setDrafts({
                          ...drafts,
                          [row.id]: {
                            ...drafts[row.id],
                            status: event.target.value,
                          },
                        })
                      }
                      className="w-full"
                    >
                      <NativeSelectOption value="draft">
                        Roboczy
                      </NativeSelectOption>
                      <NativeSelectOption value="published">
                        Opublikowany
                      </NativeSelectOption>
                      <NativeSelectOption value="archived">
                        Zarchiwizowany (ukryty z katalogu)
                      </NativeSelectOption>
                    </NativeSelect>
                  </div>
                </div>
                <div className="grid gap-1">
                  <Label
                    className="text-xs text-ink-muted"
                    htmlFor={`model-short-${row.id}`}
                  >
                    Krótki opis (widoczny na liście rowerów i karcie modelu)
                  </Label>
                  <Input
                    id={`model-short-${row.id}`}
                    value={String(drafts[row.id]?.short_description ?? '')}
                    onChange={(event) =>
                      setDrafts({
                        ...drafts,
                        [row.id]: {
                          ...drafts[row.id],
                          short_description: event.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="grid gap-1">
                  <Label
                    className="text-xs text-ink-muted"
                    htmlFor={`model-facts-${row.id}`}
                  >
                    Fakty o ramie (tabliczki na stronie /ramy) - jedna linia =
                    jedna tabliczka
                  </Label>
                  <Textarea
                    id={`model-facts-${row.id}`}
                    className="min-h-20"
                    value={String(drafts[row.id]?.facts_text ?? '')}
                    onChange={(event) =>
                      setDrafts({
                        ...drafts,
                        [row.id]: {
                          ...drafts[row.id],
                          facts_text: event.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {(
                    [
                      ['frame_price_gross', 'Cena ramy brutto'],
                      ['assembly_price_gross', 'Cena składania brutto'],
                      ['margin_percent', 'Narzut %'],
                    ] as const
                  ).map(([field, label]) => (
                    <div key={field} className="grid gap-1">
                      <Label
                        className="text-xs text-ink-muted"
                        htmlFor={`${field}-${row.id}`}
                      >
                        {label}
                      </Label>
                      <Input
                        id={`${field}-${row.id}`}
                        type="number"
                        step="0.01"
                        value={String(drafts[row.id]?.[field] ?? '')}
                        onChange={(event) =>
                          setDrafts({
                            ...drafts,
                            [row.id]: {
                              ...drafts[row.id],
                              [field]: event.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
                <p className="rounded-xl bg-ink-wash px-3 py-2 text-sm text-ink-muted">
                  Cena „od”{' '}
                  {row.computed_base_price_gross ? (
                    <strong className="tabular-nums text-ink">
                      {String(row.computed_base_price_gross)} zł
                    </strong>
                  ) : (
                    <strong>wymaga wyceny</strong>
                  )}{' '}
                  — wyliczona z ramy, baterii, części domyślnych i składania.
                  Nie wpisuje się jej ręcznie.
                </p>
                <details className="rounded-xl border border-line p-3" open>
                  <summary className="cursor-pointer text-sm font-semibold text-ink">
                    Opis modelu (edytor WYSIWYG / strona produktu)
                  </summary>
                  <div className="mt-3">
                    <WysiwygEditor
                      value={String(drafts[row.id]?.description_html ?? '')}
                      onRef={(el) => {
                        editorRefs.current[row.id] = el;
                      }}
                      onUploadImage={async (file) => {
                        const form = new FormData();
                        form.append('file', await compressUploadImage(file));
                        form.append('altText', `Zdjęcie w opisie ${row.name}`);
                        const result = await request('/admin/media', {
                          method: 'POST',
                          body: form,
                        });
                        return `${API_BASE}${result.url}`;
                      }}
                      onAiEdit={async (instruction, html) => {
                        const result = await request('/admin/ai/rich-content', {
                          method: 'POST',
                          body: JSON.stringify({ html, instruction }),
                        });
                        return String(result.html ?? '');
                      }}
                      minHeight="min-h-56"
                    />
                  </div>
                </details>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={async () => {
                      const currentHtml =
                        editorRefs.current[row.id]?.innerHTML ??
                        String(drafts[row.id]?.description_html ?? '');
                      const facts = String(drafts[row.id]?.facts_text ?? '')
                        .split('\n')
                        .map((line) => line.trim())
                        .filter(Boolean);
                      await patch('models', row.id, {
                        name: drafts[row.id]?.name ?? row.name,
                        category_id:
                          drafts[row.id]?.category_id ?? row.category_id,
                        status: drafts[row.id]?.status ?? row.status,
                        short_description:
                          drafts[row.id]?.short_description ??
                          row.short_description,
                        frame_price_gross:
                          drafts[row.id]?.frame_price_gross ??
                          row.frame_price_gross,
                        assembly_price_gross:
                          drafts[row.id]?.assembly_price_gross ??
                          row.assembly_price_gross,
                        margin_percent:
                          drafts[row.id]?.margin_percent ?? row.margin_percent,
                        description_html: currentHtml,
                        specifications: { ...specifications[row.id], facts },
                      });
                    }}
                  >
                    <Save /> Zapisz model
                  </Button>
                  <Label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium">
                    <Upload className="size-4" /> Dodaj zdjęcia do galerii
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      multiple
                      className="sr-only"
                      onChange={(event) => void upload(row, event.target.files)}
                    />
                  </Label>
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-auto text-red-600"
                    onClick={() => void deleteModel(row)}
                  >
                    <Trash2 className="size-4" /> Usuń model
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </Panel>
  );
}

/**
 * Kolumny JSON (`frames.specifications`, `projects.specification`) potrafią
 * przyjść z API raz jako tekst, raz jako gotowa struktura - w obu przypadkach
 * panel chce tej samej postaci, więc parsujemy w jednym miejscu.
 */
function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

/** Puste pole ceny znaczy „wymaga wyceny”, a nie zero - dlatego nie rzutujemy na Number(''). */
function optionalNumber(value: unknown): number | null {
  const text = String(value ?? '')
    .trim()
    .replace(',', '.');
  if (text === '') return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function optionalText(value: unknown): string | null {
  const text = String(value ?? '').trim();
  return text === '' ? null : text;
}

function frameDrafts(rows: Row[]): Record<number, Row> {
  return Object.fromEntries(
    rows.map((row) => [
      row.id,
      {
        ...row,
        facts_text: (
          parseJsonField<{ facts?: string[] }>(row.specifications, {}).facts ??
          []
        ).join('\n'),
      },
    ]),
  );
}

function FramesEditor({
  rows,
  media,
  categories,
  patch,
  request,
  reload,
  setMessage,
}: {
  rows: Row[];
  media: FrameMediaRow[];
  categories: Row[];
  patch: (
    resource: string,
    id: number,
    fields: Record<string, unknown>,
  ) => Promise<void>;
  request: (path: string, options?: RequestInit) => Promise<any>;
  reload: () => Promise<void>;
  setMessage: (value: string) => void;
}) {
  const [drafts, setDrafts] = useState<Record<number, Row>>(() =>
    frameDrafts(rows),
  );
  const descriptionRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const geometryRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [newFrame, setNewFrame] = useState<{
    name: string;
    category_id: string;
    manufacturer: string;
  }>({
    name: '',
    category_id: String(categories[0]?.id ?? ''),
    manufacturer: '',
  });

  useEffect(() => {
    setDrafts(frameDrafts(rows));
  }, [rows]);

  function imageSrc(path: string) {
    return path.startsWith('http') ? path : `${API_BASE}${path}`;
  }

  // Wgranie pliku i przypięcie go do ramy to dwa wywołania (tak jak w kontrakcie
  // w docs/PLAN_RAMY_REALIZACJE.md): /admin/media zwraca id, a rola ('gallery'
  // albo 'geometry') ustala się dopiero przy przypisaniu.
  async function upload(
    frame: Row,
    files: File | FileList | null | undefined,
    role: 'gallery' | 'geometry',
  ) {
    const selected = files instanceof File ? [files] : Array.from(files ?? []);
    if (selected.length === 0) return;
    let defaultImagePath = String(frame.default_image_path ?? '');
    setMessage(`Wysyłam zdjęcia (0/${selected.length})…`);
    try {
      for (const [index, file] of selected.entries()) {
        const form = new FormData();
        form.append('file', await compressUploadImage(file));
        form.append(
          'altText',
          role === 'geometry'
            ? `Tabela geometrii ${String(frame.name)}`
            : String(frame.name),
        );
        const result = await request('/admin/media', {
          method: 'POST',
          body: form,
        });
        await request(`/admin/frames/${frame.id}/media`, {
          method: 'POST',
          body: JSON.stringify({ mediaId: Number(result.id), role }),
        });
        if (role === 'gallery' && !defaultImagePath) {
          defaultImagePath = `${API_BASE}${result.url}`;
          await request(`/admin/frames/${frame.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ default_image_path: defaultImagePath }),
          });
        }
        setMessage(`Wysyłam zdjęcia (${index + 1}/${selected.length})…`);
      }
      await reload();
      const target =
        role === 'geometry' ? 'grafiki geometrii' : 'zdjęć do galerii';
      setMessage(
        selected.length === 1
          ? `${role === 'geometry' ? 'Grafika geometrii dodana.' : 'Zdjęcie dodane do galerii.'}`
          : `Dodano ${selected.length} ${target}.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Nie udało się dodać zdjęć.',
      );
    }
  }

  async function removePhoto(frame: Row, mediaId: number) {
    if (!window.confirm('Usunąć to zdjęcie z ramy?')) return;
    setMessage('Usuwam zdjęcie…');
    try {
      await request(`/admin/frames/${frame.id}/media/${mediaId}`, {
        method: 'DELETE',
      });
      await reload();
      setMessage('Zdjęcie usunięte.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Nie udało się usunąć zdjęcia.',
      );
    }
  }

  async function moveMedia(
    frame: Row,
    orderedIds: number[],
    mediaId: number,
    direction: -1 | 1,
  ) {
    const index = orderedIds.indexOf(mediaId);
    const targetIndex = index + direction;
    if (index === -1 || targetIndex < 0 || targetIndex >= orderedIds.length)
      return;
    const reordered = [...orderedIds];
    [reordered[index], reordered[targetIndex]] = [
      reordered[targetIndex],
      reordered[index],
    ];
    setMessage('Zapisuję kolejność…');
    try {
      await request(`/admin/frames/${frame.id}/media/reorder`, {
        method: 'PATCH',
        body: JSON.stringify({ mediaIds: reordered }),
      });
      await reload();
      setMessage('Kolejność zdjęć zapisana.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Nie udało się zapisać kolejności.',
      );
    }
  }

  async function addFrame() {
    if (!newFrame.name.trim() || !newFrame.category_id) {
      setMessage('Podaj nazwę i kategorię nowej ramy.');
      return;
    }
    setMessage('Dodaję ramę…');
    try {
      await request('/admin/frames', {
        method: 'POST',
        body: JSON.stringify({
          name: newFrame.name.trim(),
          category_id: Number(newFrame.category_id),
          manufacturer: newFrame.manufacturer.trim() || null,
        }),
      });
      setNewFrame({
        name: '',
        category_id: newFrame.category_id,
        manufacturer: '',
      });
      await reload();
      setMessage(
        'Rama dodana. Uzupełnij opis, cenę i zdjęcia w edytorze poniżej.',
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Nie udało się dodać ramy.',
      );
    }
  }

  async function deleteFrame(frame: Row) {
    if (
      !window.confirm(
        `Usunąć ramę „${String(frame.name)}"? Tej operacji nie można cofnąć.`,
      )
    )
      return;
    setMessage('Usuwam ramę…');
    try {
      await request(`/admin/frames/${frame.id}`, { method: 'DELETE' });
      await reload();
      setMessage('Rama usunięta.');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Nie udało się usunąć ramy.',
      );
    }
  }

  async function saveFrame(row: Row) {
    const draft = drafts[row.id] ?? row;
    const facts = String(draft.facts_text ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    await patch('frames', row.id, {
      name: draft.name ?? row.name,
      manufacturer: optionalText(draft.manufacturer),
      category_id: Number(draft.category_id ?? row.category_id),
      status: draft.status ?? row.status,
      short_description: optionalText(draft.short_description),
      price_gross: optionalNumber(draft.price_gross),
      paint_available: Boolean(draft.paint_available),
      is_recommended: Boolean(draft.is_recommended),
      source_url: optionalText(draft.source_url),
      sort_order: Number(draft.sort_order ?? row.sort_order ?? 0),
      description_html:
        descriptionRefs.current[row.id]?.innerHTML ??
        String(draft.description_html ?? ''),
      geometry_html:
        geometryRefs.current[row.id]?.innerHTML ??
        String(draft.geometry_html ?? ''),
      specifications: {
        ...parseJsonField<Record<string, unknown>>(row.specifications, {}),
        facts,
      },
    });
  }

  async function uploadInlineImage(frame: Row, file: File) {
    const form = new FormData();
    form.append('file', await compressUploadImage(file));
    form.append('altText', `Zdjęcie w opisie ramy ${String(frame.name)}`);
    const result = await request('/admin/media', {
      method: 'POST',
      body: form,
    });
    return `${API_BASE}${result.url}`;
  }

  async function aiEdit(instruction: string, html: string) {
    const result = await request('/admin/ai/rich-content', {
      method: 'POST',
      body: JSON.stringify({ html, instruction }),
    });
    return String(result.html ?? '');
  }

  return (
    <Panel
      title="Ramy"
      description="Ramy sprzedawane osobno, bez konfiguratora. Kategorie są wspólne z rowerami, więc filtr na /ramy i /rowery pokazuje tę samą listę."
    >
      <div className="mb-6 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h3 className="text-sm font-semibold tracking-tight text-ink">
          Dodaj nową ramę
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1.2fr_1fr_1fr]">
          <Input
            placeholder="Nazwa ramy (np. Carbonda CFR-707)"
            value={newFrame.name}
            onChange={(e) => setNewFrame({ ...newFrame, name: e.target.value })}
            className="h-9 text-sm"
          />
          <Input
            placeholder="Producent (np. Carbonda)"
            value={newFrame.manufacturer}
            onChange={(e) =>
              setNewFrame({ ...newFrame, manufacturer: e.target.value })
            }
            className="h-9 text-sm"
          />
          <NativeSelect
            value={newFrame.category_id}
            onChange={(e) =>
              setNewFrame({ ...newFrame, category_id: e.target.value })
            }
            className="h-9 text-xs"
          >
            {categories.map((category) => (
              <NativeSelectOption key={category.id} value={category.id}>
                {String(category.name)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <Button size="sm" className="mt-3" onClick={addFrame}>
          <Plus /> Dodaj ramę
        </Button>
      </div>
      {rows.length === 0 && (
        <p className="text-sm text-ink-muted">
          Nie ma jeszcze żadnej ramy. Dodaj pierwszą powyżej.
        </p>
      )}
      <div className="grid gap-6">
        {rows.map((row) => {
          const frameMedia = media.filter((item) => item.frame_id === row.id);
          const gallery = frameMedia.filter((item) => item.role !== 'geometry');
          const geometryImages = frameMedia.filter(
            (item) => item.role === 'geometry',
          );
          const galleryIds = gallery.map((item) => item.media_id);
          const draft = drafts[row.id] ?? row;
          return (
            <article
              key={row.id}
              className="min-w-0 rounded-2xl border border-line p-5 sm:p-6"
            >
              <div className="flex gap-3 overflow-x-auto pb-3">
                {gallery.length === 0 && (
                  <div className="grid h-28 w-40 shrink-0 place-items-center rounded-xl bg-[var(--muted)] text-center text-xs text-ink-subtle">
                    Brak zdjęć
                  </div>
                )}
                {gallery.map((item, itemIdx) => (
                  <div
                    key={item.media_id}
                    className="group/photo relative h-28 w-40 shrink-0"
                  >
                    <a
                      href={imageSrc(item.storage_path)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src={imageSrc(item.storage_path)}
                        alt={item.alt_text}
                        className="size-full rounded-xl bg-[var(--muted)] object-contain"
                      />
                    </a>
                    <button
                      type="button"
                      onClick={() => removePhoto(row, item.media_id)}
                      aria-label="Usuń zdjęcie"
                      className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-white/90 text-ink opacity-0 shadow transition-opacity group-hover/photo:opacity-100 hover:bg-white"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                    <div className="absolute inset-x-1 bottom-1 flex items-center justify-between opacity-0 transition-opacity group-hover/photo:opacity-100">
                      <button
                        type="button"
                        onClick={() =>
                          moveMedia(row, galleryIds, item.media_id, -1)
                        }
                        disabled={itemIdx === 0}
                        aria-label="Przesuń zdjęcie w lewo"
                        className="grid size-6 place-items-center rounded-full bg-white/90 text-ink shadow hover:bg-white disabled:pointer-events-none disabled:opacity-30"
                      >
                        <ChevronLeft className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          moveMedia(row, galleryIds, item.media_id, 1)
                        }
                        disabled={itemIdx === gallery.length - 1}
                        aria-label="Przesuń zdjęcie w prawo"
                        className="grid size-6 place-items-center rounded-full bg-white/90 text-ink shadow hover:bg-white disabled:pointer-events-none disabled:opacity-30"
                      >
                        <ChevronRight className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="grid gap-1">
                    <Label
                      className="text-xs text-ink-muted"
                      htmlFor={`frame-name-${row.id}`}
                    >
                      Nazwa ramy
                    </Label>
                    <Input
                      id={`frame-name-${row.id}`}
                      value={String(draft.name ?? '')}
                      onChange={(event) =>
                        setDrafts({
                          ...drafts,
                          [row.id]: { ...draft, name: event.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label
                      className="flex items-center gap-1.5 text-xs text-ink-muted"
                      htmlFor={`frame-slug-${row.id}`}
                    >
                      Adres strony{' '}
                      <InfoTooltip text="Adres powstaje automatycznie z nazwy przy dodaniu ramy i celowo nie zmienia się później - dzięki temu raz opublikowany link nie przestaje działać." />
                    </Label>
                    <div className="flex h-9 items-center gap-1.5 overflow-hidden rounded-lg border bg-[var(--muted)] px-3 text-sm text-ink-muted">
                      <span id={`frame-slug-${row.id}`} className="truncate">
                        /ramy/{String(row.slug ?? '')}
                      </span>
                      {row.status === 'published' && (
                        <a
                          href={`/ramy/${String(row.slug ?? '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Otwórz stronę ramy"
                          className="ml-auto text-ink hover:text-ink-muted"
                        >
                          <ExternalLink className="size-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-1">
                    <Label
                      className="text-xs text-ink-muted"
                      htmlFor={`frame-manufacturer-${row.id}`}
                    >
                      Producent
                    </Label>
                    <Input
                      id={`frame-manufacturer-${row.id}`}
                      value={String(draft.manufacturer ?? '')}
                      onChange={(event) =>
                        setDrafts({
                          ...drafts,
                          [row.id]: {
                            ...draft,
                            manufacturer: event.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label
                      className="text-xs text-ink-muted"
                      htmlFor={`frame-cat-${row.id}`}
                    >
                      Kategoria
                    </Label>
                    <NativeSelect
                      id={`frame-cat-${row.id}`}
                      value={String(draft.category_id ?? '')}
                      onChange={(event) =>
                        setDrafts({
                          ...drafts,
                          [row.id]: {
                            ...draft,
                            category_id: event.target.value,
                          },
                        })
                      }
                      className="w-full"
                    >
                      {categories.map((category) => (
                        <NativeSelectOption
                          key={category.id}
                          value={category.id}
                        >
                          {String(category.name)}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="grid gap-1">
                    <Label
                      className="text-xs text-ink-muted"
                      htmlFor={`frame-status-${row.id}`}
                    >
                      Status
                    </Label>
                    <NativeSelect
                      id={`frame-status-${row.id}`}
                      value={String(draft.status ?? 'draft')}
                      onChange={(event) =>
                        setDrafts({
                          ...drafts,
                          [row.id]: { ...draft, status: event.target.value },
                        })
                      }
                      className="w-full"
                    >
                      <NativeSelectOption value="draft">
                        Roboczy
                      </NativeSelectOption>
                      <NativeSelectOption value="published">
                        Opublikowany
                      </NativeSelectOption>
                      <NativeSelectOption value="archived">
                        Zarchiwizowany (ukryty z katalogu)
                      </NativeSelectOption>
                    </NativeSelect>
                  </div>
                  <div className="grid gap-1">
                    <Label
                      className="flex items-center gap-1.5 text-xs text-ink-muted"
                      htmlFor={`frame-price-${row.id}`}
                    >
                      Cena brutto (zł){' '}
                      <InfoTooltip text="Zostaw puste, a na stronie ramy zamiast ceny pojawi się „wymaga wyceny” i formularz zapytania. Wpisana cena jest ceną samej ramy, bez osprzętu." />
                    </Label>
                    <Input
                      id={`frame-price-${row.id}`}
                      inputMode="decimal"
                      placeholder="puste = wymaga wyceny"
                      value={String(draft.price_gross ?? '')}
                      onChange={(event) =>
                        setDrafts({
                          ...drafts,
                          [row.id]: {
                            ...draft,
                            price_gross: event.target.value,
                          },
                        })
                      }
                      className="tabular-nums"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label
                      className="flex items-center gap-1.5 text-xs text-ink-muted"
                      htmlFor={`frame-source-${row.id}`}
                    >
                      Link źródłowy{' '}
                      <InfoTooltip text="Adres oferty producenta (np. carbonda.com), z której wzięliśmy dane ramy. Widoczny tylko w panelu - służy do sprawdzenia specyfikacji i ceny zakupu." />
                    </Label>
                    <Input
                      id={`frame-source-${row.id}`}
                      type="url"
                      placeholder="https://…"
                      value={String(draft.source_url ?? '')}
                      onChange={(event) =>
                        setDrafts({
                          ...drafts,
                          [row.id]: {
                            ...draft,
                            source_url: event.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label
                      className="flex items-center gap-1.5 text-xs text-ink-muted"
                      htmlFor={`frame-order-${row.id}`}
                    >
                      Kolejność{' '}
                      <InfoTooltip text="Mniejsza liczba = wyżej na liście ram. Przy równych wartościach decyduje nazwa." />
                    </Label>
                    <Input
                      id={`frame-order-${row.id}`}
                      type="number"
                      value={String(draft.sort_order ?? 0)}
                      onChange={(event) =>
                        setDrafts({
                          ...drafts,
                          [row.id]: {
                            ...draft,
                            sort_order: event.target.value,
                          },
                        })
                      }
                      className="tabular-nums"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-3">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={Boolean(Number(draft.paint_available ?? 1))}
                      onCheckedChange={(checked) =>
                        setDrafts({
                          ...drafts,
                          [row.id]: { ...draft, paint_available: checked },
                        })
                      }
                    />{' '}
                    Możliwe malowanie wg projektu
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={Boolean(Number(draft.is_recommended ?? 0))}
                      onCheckedChange={(checked) =>
                        setDrafts({
                          ...drafts,
                          [row.id]: { ...draft, is_recommended: checked },
                        })
                      }
                    />{' '}
                    Nasza rekomendacja{' '}
                    <InfoTooltip text="Wyróżnia ramę odznaką „Nasza rekomendacja” na liście ram." />
                  </label>
                </div>
                <div className="grid gap-1">
                  <Label
                    className="text-xs text-ink-muted"
                    htmlFor={`frame-short-${row.id}`}
                  >
                    Krótki opis (widoczny na liście ram)
                  </Label>
                  <Input
                    id={`frame-short-${row.id}`}
                    value={String(draft.short_description ?? '')}
                    onChange={(event) =>
                      setDrafts({
                        ...drafts,
                        [row.id]: {
                          ...draft,
                          short_description: event.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="grid gap-1">
                  <Label
                    className="text-xs text-ink-muted"
                    htmlFor={`frame-facts-${row.id}`}
                  >
                    Fakty o ramie (tabliczki na stronie ramy) - jedna linia =
                    jedna tabliczka
                  </Label>
                  <Textarea
                    id={`frame-facts-${row.id}`}
                    className="min-h-20"
                    value={String(draft.facts_text ?? '')}
                    onChange={(event) =>
                      setDrafts({
                        ...drafts,
                        [row.id]: { ...draft, facts_text: event.target.value },
                      })
                    }
                  />
                </div>
                <details className="rounded-xl border border-line p-3" open>
                  <summary className="cursor-pointer text-sm font-semibold text-ink">
                    Opis ramy (edytor WYSIWYG / strona ramy)
                  </summary>
                  <div className="mt-3">
                    <WysiwygEditor
                      value={String(draft.description_html ?? '')}
                      onRef={(el) => {
                        descriptionRefs.current[row.id] = el;
                      }}
                      onUploadImage={(file) => uploadInlineImage(row, file)}
                      onAiEdit={aiEdit}
                      minHeight="min-h-56"
                    />
                  </div>
                </details>
                <details className="rounded-xl border border-line p-3">
                  <summary className="cursor-pointer text-sm font-semibold text-ink">
                    Geometria ramy
                  </summary>
                  <p className="mt-2 text-xs text-ink-muted">
                    Geometrię możesz podać na dwa sposoby, dowolnie je łącząc:
                    wgrać zdjęcie tabeli od producenta albo sformatować ją
                    samodzielnie w edytorze poniżej.
                  </p>
                  <div className="mt-3 grid gap-2">
                    <Label className="flex items-center gap-1.5 text-xs text-ink-muted">
                      Zdjęcia tabeli geometrii{' '}
                      <InfoTooltip text="Zdjęcia w tej roli nie trafiają do zwykłej galerii ramy - pokazują się w sekcji „Geometria” na stronie ramy. Zwykle jest to zrzut tabeli z katalogu producenta." />
                    </Label>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {geometryImages.length === 0 && (
                        <div className="grid h-24 w-40 shrink-0 place-items-center rounded-xl bg-[var(--muted)] text-center text-xs text-ink-subtle">
                          Brak grafiki
                        </div>
                      )}
                      {geometryImages.map((item) => (
                        <div
                          key={item.media_id}
                          className="group/geo relative h-24 w-40 shrink-0"
                        >
                          <a
                            href={imageSrc(item.storage_path)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <img
                              src={imageSrc(item.storage_path)}
                              alt={item.alt_text}
                              className="size-full rounded-xl bg-[var(--muted)] object-contain"
                            />
                          </a>
                          <button
                            type="button"
                            onClick={() => removePhoto(row, item.media_id)}
                            aria-label="Usuń grafikę geometrii"
                            className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-white/90 text-ink opacity-0 shadow transition-opacity group-hover/geo:opacity-100 hover:bg-white"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <Label className="inline-flex h-8 w-fit cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium">
                      <Upload className="size-4" /> Wgraj tabelę geometrii
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        className="sr-only"
                        multiple
                        onChange={(event) =>
                          void upload(row, event.target.files, 'geometry')
                        }
                      />
                    </Label>
                  </div>
                  <div className="mt-4 grid gap-2">
                    <Label className="text-xs text-ink-muted">
                      Geometria opisana tekstem
                    </Label>
                    <WysiwygEditor
                      value={String(draft.geometry_html ?? '')}
                      onRef={(el) => {
                        geometryRefs.current[row.id] = el;
                      }}
                      onUploadImage={(file) => uploadInlineImage(row, file)}
                      onAiEdit={aiEdit}
                      minHeight="min-h-40"
                    />
                  </div>
                </details>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => void saveFrame(row)}>
                    <Save /> Zapisz ramę
                  </Button>
                  <Label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium">
                    <Upload className="size-4" /> Dodaj zdjęcia do galerii
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      multiple
                      className="sr-only"
                      onChange={(event) =>
                        void upload(row, event.target.files, 'gallery')
                      }
                    />
                  </Label>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => void deleteFrame(row)}
                  >
                    <Trash2 /> Usuń ramę
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </Panel>
  );
}

type SpecificationRow = { label: string; value: string };

function projectSpecifications(
  rows: Row[],
): Record<number, SpecificationRow[]> {
  return Object.fromEntries(
    rows.map((row) => [
      row.id,
      parseJsonField<SpecificationRow[]>(row.specification, []).map((item) => ({
        label: String(item?.label ?? ''),
        value: String(item?.value ?? ''),
      })),
    ]),
  );
}

function ProjectsEditor({
  rows,
  media,
  categories,
  patch,
  request,
  reload,
  setMessage,
}: {
  rows: Row[];
  media: ProjectMediaRow[];
  categories: Row[];
  patch: (
    resource: string,
    id: number,
    fields: Record<string, unknown>,
  ) => Promise<void>;
  request: (path: string, options?: RequestInit) => Promise<any>;
  reload: () => Promise<void>;
  setMessage: (value: string) => void;
}) {
  const [drafts, setDrafts] = useState<Record<number, Row>>(() =>
    Object.fromEntries(rows.map((row) => [row.id, { ...row }])),
  );
  // Spis komponentów to lista par, a nie pojedyncza wartość - nie mieści się
  // w `Row` (same skalary), więc trzymamy go w osobnym stanie obok draftów.
  const [specs, setSpecs] = useState<Record<number, SpecificationRow[]>>(() =>
    projectSpecifications(rows),
  );
  const contentRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [newProject, setNewProject] = useState<{
    title: string;
    short_description: string;
  }>({ title: '', short_description: '' });

  useEffect(() => {
    setDrafts(Object.fromEntries(rows.map((row) => [row.id, { ...row }])));
    setSpecs(projectSpecifications(rows));
  }, [rows]);

  function imageSrc(path: string) {
    return path.startsWith('http') ? path : `${API_BASE}${path}`;
  }

  async function upload(
    project: Row,
    files: File | FileList | null | undefined,
    role: 'cover' | 'gallery',
  ) {
    const selected = files instanceof File ? [files] : Array.from(files ?? []);
    if (selected.length === 0) return;
    setMessage(`Wysyłam zdjęcia (0/${selected.length})…`);
    try {
      for (const [index, file] of selected.entries()) {
        const form = new FormData();
        form.append('file', await compressUploadImage(file));
        form.append('altText', String(project.title));
        const result = await request('/admin/media', {
          method: 'POST',
          body: form,
        });
        await request(`/admin/projects/${project.id}/media`, {
          method: 'POST',
          body: JSON.stringify({ mediaId: Number(result.id), role }),
        });
        if (role === 'cover')
          await request(`/admin/projects/${project.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              cover_image_path: `${API_BASE}${result.url}`,
            }),
          });
        setMessage(`Wysyłam zdjęcia (${index + 1}/${selected.length})…`);
      }
      await reload();
      setMessage(
        selected.length === 1
          ? role === 'cover'
            ? 'Zdjęcie główne zapisane.'
            : 'Zdjęcie dodane do galerii.'
          : `Dodano ${selected.length} zdjęć do galerii.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Nie udało się dodać zdjęć.',
      );
    }
  }

  async function removePhoto(project: Row, mediaId: number) {
    if (!window.confirm('Usunąć to zdjęcie z realizacji?')) return;
    setMessage('Usuwam zdjęcie…');
    try {
      await request(`/admin/projects/${project.id}/media/${mediaId}`, {
        method: 'DELETE',
      });
      await reload();
      setMessage('Zdjęcie usunięte.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Nie udało się usunąć zdjęcia.',
      );
    }
  }

  async function moveMedia(
    project: Row,
    orderedIds: number[],
    mediaId: number,
    direction: -1 | 1,
  ) {
    const index = orderedIds.indexOf(mediaId);
    const targetIndex = index + direction;
    if (index === -1 || targetIndex < 0 || targetIndex >= orderedIds.length)
      return;
    const reordered = [...orderedIds];
    [reordered[index], reordered[targetIndex]] = [
      reordered[targetIndex],
      reordered[index],
    ];
    setMessage('Zapisuję kolejność…');
    try {
      await request(`/admin/projects/${project.id}/media/reorder`, {
        method: 'PATCH',
        body: JSON.stringify({ mediaIds: reordered }),
      });
      await reload();
      setMessage('Kolejność zdjęć zapisana.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Nie udało się zapisać kolejności.',
      );
    }
  }

  async function addProject() {
    if (!newProject.title.trim()) {
      setMessage('Podaj tytuł nowej realizacji.');
      return;
    }
    setMessage('Dodaję realizację…');
    try {
      await request('/admin/projects', {
        method: 'POST',
        body: JSON.stringify({
          title: newProject.title.trim(),
          short_description: newProject.short_description.trim() || null,
        }),
      });
      setNewProject({ title: '', short_description: '' });
      await reload();
      setMessage(
        'Realizacja dodana. Uzupełnij treść, zdjęcia i spis komponentów poniżej.',
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Nie udało się dodać realizacji.',
      );
    }
  }

  async function deleteProject(project: Row) {
    if (
      !window.confirm(
        `Usunąć realizację „${String(project.title)}"? Tej operacji nie można cofnąć.`,
      )
    )
      return;
    setMessage('Usuwam realizację…');
    try {
      await request(`/admin/projects/${project.id}`, { method: 'DELETE' });
      await reload();
      setMessage('Realizacja usunięta.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Nie udało się usunąć realizacji.',
      );
    }
  }

  function setSpecRows(id: number, next: SpecificationRow[]) {
    setSpecs({ ...specs, [id]: next });
  }

  function moveSpecRow(id: number, index: number, direction: -1 | 1) {
    const current = specs[id] ?? [];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= current.length) return;
    const next = [...current];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    setSpecRows(id, next);
  }

  async function saveProject(row: Row) {
    const draft = drafts[row.id] ?? row;
    const specification = (specs[row.id] ?? [])
      .map((item) => ({ label: item.label.trim(), value: item.value.trim() }))
      .filter((item) => item.label !== '' || item.value !== '');
    await patch('projects', row.id, {
      title: draft.title ?? row.title,
      short_description: optionalText(draft.short_description),
      category_id:
        String(draft.category_id ?? '') === ''
          ? null
          : Number(draft.category_id),
      completed_at: optionalText(draft.completed_at),
      is_published: Boolean(draft.is_published),
      sort_order: Number(draft.sort_order ?? row.sort_order ?? 0),
      content_html:
        contentRefs.current[row.id]?.innerHTML ??
        String(draft.content_html ?? ''),
      specification,
    });
  }

  return (
    <Panel
      title="Realizacje"
      description="Rowery i pojazdy zbudowane przez Rexor: redagowana strona ze zdjęciami i spisem użytych komponentów. Zdjęcia mają być prawdziwe, nie rendery."
    >
      <div className="mb-6 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h3 className="text-sm font-semibold tracking-tight text-ink">
          Dodaj nową realizację
        </h3>
        <Input
          placeholder="Tytuł (np. E82 dla klienta z Gdańska)"
          value={newProject.title}
          onChange={(e) =>
            setNewProject({ ...newProject, title: e.target.value })
          }
          className="mt-3 h-9 text-sm"
        />
        <Input
          placeholder="Krótki opis (widoczny na liście realizacji)"
          value={newProject.short_description}
          onChange={(e) =>
            setNewProject({ ...newProject, short_description: e.target.value })
          }
          className="mt-3 h-9 text-sm"
        />
        <Button size="sm" className="mt-3" onClick={addProject}>
          <Plus /> Dodaj realizację
        </Button>
      </div>
      {rows.length === 0 && (
        <p className="text-sm text-ink-muted">
          Nie ma jeszcze żadnej realizacji. Dodaj pierwszą powyżej.
        </p>
      )}
      <div className="grid gap-6">
        {rows.map((row) => {
          const projectMedia = media.filter(
            (item) => item.project_id === row.id,
          );
          const cover = projectMedia.find((item) => item.role === 'cover');
          const gallery = projectMedia.filter((item) => item.role !== 'cover');
          const galleryIds = gallery.map((item) => item.media_id);
          const draft = drafts[row.id] ?? row;
          const specRows = specs[row.id] ?? [];
          return (
            <article
              key={row.id}
              className="min-w-0 rounded-2xl border border-line p-5 sm:p-6"
            >
              <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
                <div className="grid gap-2">
                  <Label className="flex items-center gap-1.5 text-xs text-ink-muted">
                    Zdjęcie główne{' '}
                    <InfoTooltip text="Kafelek realizacji na liście /realizacje i obraz otwierający jej stronę." />
                  </Label>
                  <div className="aspect-[4/3] overflow-hidden rounded-xl bg-[var(--muted)]">
                    {cover ? (
                      <img
                        src={imageSrc(cover.storage_path)}
                        alt={cover.alt_text}
                        className="size-full object-cover"
                      />
                    ) : row.cover_image_path ? (
                      <img
                        src={imageSrc(String(row.cover_image_path))}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="grid size-full place-items-center text-center text-xs text-ink-subtle">
                        Brak zdjęcia
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <Label className="inline-flex h-8 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-medium">
                      <Upload className="size-3.5" /> Zmień
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        className="sr-only"
                        onChange={(event) =>
                          void upload(row, event.target.files?.[0], 'cover')
                        }
                      />
                    </Label>
                    {cover && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 px-2"
                        onClick={() => void removePhoto(row, cover.media_id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="grid min-w-0 gap-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1">
                      <Label
                        className="text-xs text-ink-muted"
                        htmlFor={`project-title-${row.id}`}
                      >
                        Tytuł
                      </Label>
                      <Input
                        id={`project-title-${row.id}`}
                        value={String(draft.title ?? '')}
                        onChange={(event) =>
                          setDrafts({
                            ...drafts,
                            [row.id]: { ...draft, title: event.target.value },
                          })
                        }
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label
                        className="flex items-center gap-1.5 text-xs text-ink-muted"
                        htmlFor={`project-slug-${row.id}`}
                      >
                        Adres strony{' '}
                        <InfoTooltip text="Adres powstaje automatycznie z tytułu przy dodaniu realizacji i celowo nie zmienia się później - dzięki temu raz opublikowany link nie przestaje działać." />
                      </Label>
                      <div className="flex h-9 items-center gap-1.5 overflow-hidden rounded-lg border bg-[var(--muted)] px-3 text-sm text-ink-muted">
                        <span
                          id={`project-slug-${row.id}`}
                          className="truncate"
                        >
                          /realizacje/{String(row.slug ?? '')}
                        </span>
                        {Boolean(Number(row.is_published ?? 0)) && (
                          <a
                            href={`/realizacje/${String(row.slug ?? '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Otwórz stronę realizacji"
                            className="ml-auto text-ink hover:text-ink-muted"
                          >
                            <ExternalLink className="size-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="grid gap-1">
                      <Label
                        className="flex items-center gap-1.5 text-xs text-ink-muted"
                        htmlFor={`project-cat-${row.id}`}
                      >
                        Kategoria{' '}
                        <InfoTooltip text="Opcjonalna. Gdy ustawiona, realizacja wpada pod ten sam filtr kategorii co rowery i ramy." />
                      </Label>
                      <NativeSelect
                        id={`project-cat-${row.id}`}
                        value={String(draft.category_id ?? '')}
                        onChange={(event) =>
                          setDrafts({
                            ...drafts,
                            [row.id]: {
                              ...draft,
                              category_id: event.target.value,
                            },
                          })
                        }
                        className="w-full"
                      >
                        <NativeSelectOption value="">
                          Bez kategorii
                        </NativeSelectOption>
                        {categories.map((category) => (
                          <NativeSelectOption
                            key={category.id}
                            value={category.id}
                          >
                            {String(category.name)}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </div>
                    <div className="grid gap-1">
                      <Label
                        className="text-xs text-ink-muted"
                        htmlFor={`project-date-${row.id}`}
                      >
                        Data ukończenia
                      </Label>
                      <Input
                        id={`project-date-${row.id}`}
                        type="date"
                        value={String(draft.completed_at ?? '').slice(0, 10)}
                        onChange={(event) =>
                          setDrafts({
                            ...drafts,
                            [row.id]: {
                              ...draft,
                              completed_at: event.target.value,
                            },
                          })
                        }
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label
                        className="flex items-center gap-1.5 text-xs text-ink-muted"
                        htmlFor={`project-order-${row.id}`}
                      >
                        Kolejność{' '}
                        <InfoTooltip text="Mniejsza liczba = wyżej na liście realizacji. Przy równych wartościach decyduje tytuł." />
                      </Label>
                      <Input
                        id={`project-order-${row.id}`}
                        type="number"
                        value={String(draft.sort_order ?? 0)}
                        onChange={(event) =>
                          setDrafts({
                            ...drafts,
                            [row.id]: {
                              ...draft,
                              sort_order: event.target.value,
                            },
                          })
                        }
                        className="tabular-nums"
                      />
                    </div>
                  </div>
                  <div className="grid gap-1">
                    <Label
                      className="text-xs text-ink-muted"
                      htmlFor={`project-short-${row.id}`}
                    >
                      Krótki opis (widoczny na liście realizacji)
                    </Label>
                    <Input
                      id={`project-short-${row.id}`}
                      value={String(draft.short_description ?? '')}
                      onChange={(event) =>
                        setDrafts({
                          ...drafts,
                          [row.id]: {
                            ...draft,
                            short_description: event.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <label className="flex w-fit items-center gap-2 text-sm">
                    <Switch
                      checked={Boolean(Number(draft.is_published ?? 0))}
                      onCheckedChange={(checked) =>
                        setDrafts({
                          ...drafts,
                          [row.id]: { ...draft, is_published: checked },
                        })
                      }
                    />{' '}
                    Opublikowana
                  </label>
                </div>
              </div>
              <div className="mt-4 grid gap-4">
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {gallery.length === 0 && (
                    <div className="grid h-28 w-40 shrink-0 place-items-center rounded-xl bg-[var(--muted)] text-center text-xs text-ink-subtle">
                      Galeria pusta
                    </div>
                  )}
                  {gallery.map((item, itemIdx) => (
                    <div
                      key={item.media_id}
                      className="group/photo relative h-28 w-40 shrink-0"
                    >
                      <a
                        href={imageSrc(item.storage_path)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          src={imageSrc(item.storage_path)}
                          alt={item.alt_text}
                          className="size-full rounded-xl bg-[var(--muted)] object-contain"
                        />
                      </a>
                      <button
                        type="button"
                        onClick={() => removePhoto(row, item.media_id)}
                        aria-label="Usuń zdjęcie"
                        className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-white/90 text-ink opacity-0 shadow transition-opacity group-hover/photo:opacity-100 hover:bg-white"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                      <div className="absolute inset-x-1 bottom-1 flex items-center justify-between opacity-0 transition-opacity group-hover/photo:opacity-100">
                        <button
                          type="button"
                          onClick={() =>
                            moveMedia(row, galleryIds, item.media_id, -1)
                          }
                          disabled={itemIdx === 0}
                          aria-label="Przesuń zdjęcie w lewo"
                          className="grid size-6 place-items-center rounded-full bg-white/90 text-ink shadow hover:bg-white disabled:pointer-events-none disabled:opacity-30"
                        >
                          <ChevronLeft className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            moveMedia(row, galleryIds, item.media_id, 1)
                          }
                          disabled={itemIdx === gallery.length - 1}
                          aria-label="Przesuń zdjęcie w prawo"
                          className="grid size-6 place-items-center rounded-full bg-white/90 text-ink shadow hover:bg-white disabled:pointer-events-none disabled:opacity-30"
                        >
                          <ChevronRight className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <details className="rounded-xl border border-line p-3" open>
                  <summary className="cursor-pointer text-sm font-semibold text-ink">
                    Treść strony realizacji (edytor WYSIWYG)
                  </summary>
                  <div className="mt-3">
                    <WysiwygEditor
                      value={String(draft.content_html ?? '')}
                      onRef={(el) => {
                        contentRefs.current[row.id] = el;
                      }}
                      onUploadImage={async (file) => {
                        const form = new FormData();
                        form.append('file', await compressUploadImage(file));
                        form.append(
                          'altText',
                          `Zdjęcie w opisie realizacji ${String(row.title)}`,
                        );
                        const result = await request('/admin/media', {
                          method: 'POST',
                          body: form,
                        });
                        return `${API_BASE}${result.url}`;
                      }}
                      onAiEdit={async (instruction, html) => {
                        const result = await request('/admin/ai/rich-content', {
                          method: 'POST',
                          body: JSON.stringify({ html, instruction }),
                        });
                        return String(result.html ?? '');
                      }}
                      minHeight="min-h-56"
                    />
                  </div>
                </details>
                <div className="rounded-xl border border-line p-3">
                  <Label className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                    Spis komponentów{' '}
                    <InfoTooltip text="Lista par „etykieta - wartość”, np. silnik / M620 CAN. Celowo nie jest to swobodny tekst: dzięki temu każda realizacja wyświetla tabelkę w tym samym układzie." />
                  </Label>
                  <div className="mt-3 grid gap-2">
                    {specRows.length === 0 && (
                      <p className="text-xs text-ink-muted">
                        Brak pozycji. Dodaj pierwszą poniżej.
                      </p>
                    )}
                    {specRows.map((item, index) => (
                      <div
                        key={index}
                        className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]"
                      >
                        <Input
                          placeholder="Etykieta (np. silnik)"
                          value={item.label}
                          onChange={(event) =>
                            setSpecRows(
                              row.id,
                              specRows.map((entry, entryIdx) =>
                                entryIdx === index
                                  ? { ...entry, label: event.target.value }
                                  : entry,
                              ),
                            )
                          }
                          className="h-9 text-sm"
                        />
                        <Input
                          placeholder="Wartość (np. Bafang M620 CAN)"
                          value={item.value}
                          onChange={(event) =>
                            setSpecRows(
                              row.id,
                              specRows.map((entry, entryIdx) =>
                                entryIdx === index
                                  ? { ...entry, value: event.target.value }
                                  : entry,
                              ),
                            )
                          }
                          className="h-9 text-sm"
                        />
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="outline"
                            aria-label="Przesuń w górę"
                            disabled={index === 0}
                            onClick={() => moveSpecRow(row.id, index, -1)}
                          >
                            <ChevronUp className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="outline"
                            aria-label="Przesuń w dół"
                            disabled={index === specRows.length - 1}
                            onClick={() => moveSpecRow(row.id, index, 1)}
                          >
                            <ChevronDown className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            aria-label="Usuń wiersz"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() =>
                              setSpecRows(
                                row.id,
                                specRows.filter(
                                  (_, entryIdx) => entryIdx !== index,
                                ),
                              )
                            }
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="w-fit"
                      onClick={() =>
                        setSpecRows(row.id, [
                          ...specRows,
                          { label: '', value: '' },
                        ])
                      }
                    >
                      <Plus /> Dodaj wiersz
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => void saveProject(row)}>
                    <Save /> Zapisz realizację
                  </Button>
                  <Label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium">
                    <Upload className="size-4" /> Dodaj zdjęcia do galerii
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      multiple
                      className="sr-only"
                      onChange={(event) =>
                        void upload(row, event.target.files, 'gallery')
                      }
                    />
                  </Label>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => void deleteProject(row)}
                  >
                    <Trash2 /> Usuń realizację
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </Panel>
  );
}

const batteryFields: Array<[string, string, string, string]> = [
  ['name', 'Nazwa pakietu', 'text', 'np. Samsung 35E 14S4P'],
  ['cell_format', 'Format ogniwa', 'text', 'np. 18650 lub 21700'],
  ['series_count', 'Ogniwa szeregowo (S)', 'number', 'np. 14'],
  ['parallel_count', 'Gałęzie równolegle (P)', 'number', 'np. 4'],
  ['cell_capacity_ah', 'Pojemność ogniwa (Ah)', 'text', 'np. 3.5'],
  ['gross_price', 'Cena brutto (zł)', 'text', '0 = w cenie bazowej'],
];

const emptyBattery: Row = {
  id: 0,
  code: '',
  name: '',
  cell_format: '18650',
  series_count: 14,
  parallel_count: 4,
  cell_capacity_ah: 3.5,
  gross_price: 0,
  sort_order: 10,
  is_default: false,
  is_active: true,
};

function cleanBatteryPayload(draft: Row): Record<string, unknown> {
  const parseNum = (v: unknown) => {
    if (typeof v === 'number') return v;
    const s = String(v ?? '')
      .trim()
      .replace(',', '.');
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  };
  const seriesCount = Math.max(1, Math.round(parseNum(draft.series_count)));
  // Napięcie ogniwa (nominalne i ładowania) jest stałą chemii/formatu ogniwa,
  // nie osobną wartością do wpisania - pakiet ma tyle woltów, ile wynika z
  // liczby ogniw połączonych szeregowo. Liczymy je zawsze na nowo z (S) i
  // formatu, żeby nie dało się zapisać niespójnej kombinacji.
  const cellSpec = detectCellSpec(draft.cell_format);
  return {
    ...draft,
    series_count: seriesCount,
    parallel_count: Math.max(1, Math.round(parseNum(draft.parallel_count))),
    cell_capacity_ah: parseNum(draft.cell_capacity_ah),
    nominal_voltage_v:
      Math.round(seriesCount * cellSpec.nominalCellVoltage * 100) / 100,
    charge_voltage_v:
      Math.round(seriesCount * cellSpec.maxCellVoltage * 100) / 100,
    gross_price: parseNum(draft.gross_price),
    is_default: Boolean(draft.is_default),
    is_active: draft.is_active !== undefined ? Boolean(draft.is_active) : true,
  };
}

function BatteryLiveMetrics({
  draft,
  modelSlug,
  onApplyUpdate,
}: {
  draft: Row;
  modelSlug?: string;
  onApplyUpdate?: (patch: Partial<Row>) => void;
}) {
  const est = computeBatteryEstimates(draft, modelSlug);

  return (
    <div className="rounded-xl border border-line bg-white p-3.5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
            <Zap className="size-4 text-amber-700" />
          </span>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">
              Estymacja w locie
            </span>
            <div className="flex items-baseline gap-2">
              <strong className="text-xl font-bold tabular-nums text-ink">
                {est.energyWh > 0 ? `${est.energyWh.toFixed(1)} Wh` : '0 Wh'}
              </strong>
              {est.energyWh >= 1000 && (
                <span className="text-xs font-medium text-ink-muted">
                  ({(est.energyWh / 1000).toFixed(2)} kWh)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {onApplyUpdate &&
            draft.code !== est.suggestedCode &&
            est.energyWh > 0 && (
              <button
                type="button"
                onClick={() => onApplyUpdate({ code: est.suggestedCode })}
                className="inline-flex items-center gap-1 rounded-lg border border-line bg-ink-wash px-2.5 py-1 font-mono text-ink transition hover:border-ink/40 hover:bg-white"
                title={`Ustaw sugerowany kod: ${est.suggestedCode}`}
              >
                <Sparkles className="size-3 text-ink-muted" /> Kod:{' '}
                <strong>{est.suggestedCode}</strong>
              </button>
            )}

          {onApplyUpdate && est.cellSpec.suggestedFormat && (
            <button
              type="button"
              onClick={() =>
                onApplyUpdate({ cell_format: est.cellSpec.suggestedFormat })
              }
              className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 font-medium text-amber-900 transition hover:bg-amber-100"
              title="Popraw literówkę formatu ogniwa"
            >
              Popraw na <strong>{est.cellSpec.suggestedFormat}</strong>
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
        <div className="rounded-lg bg-ink-wash p-2.5">
          <span className="text-ink-subtle">Pojemność pakietu</span>
          <strong className="mt-0.5 block text-sm font-semibold tabular-nums text-ink">
            {est.packCapacityAh > 0
              ? `${est.packCapacityAh.toFixed(2)} Ah`
              : '—'}
          </strong>
          <span className="text-[11px] text-ink-muted">
            {est.parallel}P × {est.cellCapacityAh || 0} Ah
          </span>
        </div>

        <div className="rounded-lg bg-ink-wash p-2.5">
          <span className="text-ink-subtle">Liczba ogniw</span>
          <strong className="mt-0.5 block text-sm font-semibold tabular-nums text-ink">
            {est.cellCount > 0 ? `${est.cellCount} szt.` : '—'}
          </strong>
          <span className="text-[11px] text-ink-muted">
            {est.series}S {est.parallel}P ({est.cellSpec.format})
          </span>
        </div>

        <div className="rounded-lg bg-ink-wash p-2.5">
          <span className="text-ink-subtle">Masa ogniw (est.)</span>
          <strong className="mt-0.5 block text-sm font-semibold tabular-nums text-ink">
            {est.cellsWeightKg > 0 ? formatWeightKg(est.cellsWeightKg) : '—'}
          </strong>
          <span className="text-[11px] text-ink-muted">
            ~{est.cellSpec.cellWeightGrams} g / ogniwo
          </span>
        </div>

        <div className="rounded-lg bg-ink-wash p-2.5">
          <span className="text-ink-subtle">Masa pakietu (est.)</span>
          <strong className="mt-0.5 block text-sm font-semibold tabular-nums text-ink">
            {est.estimatedTotalPackWeightKg > 0
              ? formatWeightKg(est.estimatedTotalPackWeightKg)
              : '—'}
          </strong>
          <span
            className="text-[11px] text-ink-muted"
            title="Z BMS-em, taśmami niklowymi, przewodami zasilającymi i obudową"
          >
            z BMS, niklem i obudową
          </span>
        </div>
      </div>

      {est.series > 0 && est.nominalVoltageV > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-2 text-[11px] text-ink-muted">
          <span>
            Napięcie na ogniwo (stałe dla formatu {est.cellSpec.format}):{' '}
            <strong className="font-semibold text-ink">
              {est.cellNominalV.toFixed(2)} V
            </strong>{' '}
            nom. ·{' '}
            <strong className="font-semibold text-ink">
              {est.cellChargeV.toFixed(2)} V
            </strong>{' '}
            max
          </span>
          <span className="text-ink-subtle">{est.cellSpec.note}</span>
        </div>
      )}
    </div>
  );
}

function BatteriesEditor({
  batteries,
  models,
  request,
  reload,
  setMessage,
}: {
  batteries: Row[];
  models: Row[];
  request: (path: string, options?: RequestInit) => Promise<any>;
  reload: () => Promise<void>;
  setMessage: (value: string) => void;
}) {
  const [drafts, setDrafts] = useState<Record<number, Row>>(() =>
    Object.fromEntries(batteries.map((row) => [row.id, { ...row }])),
  );
  const [newRows, setNewRows] = useState<Record<number, Row>>({});

  useEffect(() => {
    setDrafts(Object.fromEntries(batteries.map((row) => [row.id, { ...row }])));
  }, [batteries]);

  async function remove(row: Row) {
    if (
      !window.confirm(
        `Usunąć pakiet „${String(row.name)}"? Zapisane konfiguracje klientów zachowają swoją treść, ale stracą powiązanie z tym pakietem.`,
      )
    )
      return;
    setMessage('Usuwam pakiet…');
    try {
      await request(`/admin/batteries/${row.id}`, { method: 'DELETE' });
      await reload();
      setMessage('Pakiet usunięty.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Nie udało się usunąć pakietu.',
      );
    }
  }

  async function save(id: number) {
    setMessage('Zapisuję baterię…');
    try {
      const payload = cleanBatteryPayload(drafts[id]);
      await request(`/admin/batteries/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      await reload();
      setMessage('Bateria zapisana.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Nie udało się zapisać baterii.',
      );
    }
  }

  async function create(modelId: number, modelSlug = 'e82') {
    const draft = newRows[modelId] ?? emptyBattery;
    const est = computeBatteryEstimates(draft, modelSlug);
    const resolvedCode = String(draft.code || '').trim() || est.suggestedCode;

    if (!resolvedCode) {
      setMessage('Podaj kod pakietu.');
      return;
    }

    setMessage('Dodaję baterię…');
    try {
      const payload = {
        ...cleanBatteryPayload(draft),
        code: resolvedCode,
        model_id: modelId,
      };
      await request('/admin/batteries', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setNewRows({ ...newRows, [modelId]: { ...emptyBattery } });
      await reload();
      setMessage('Bateria dodana do modelu.');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Nie udało się dodać baterii.',
      );
    }
  }

  return (
    <Panel
      title="Baterie per model"
      description="Każdy model ma własną listę pakietów. Pakiet domyślny wyznacza cenę bazową, pozostałe pokazują się w konfiguratorze jako dopłata lub upust. Watogodziny oraz szacowana masa pakietu i ogniw liczą się automatycznie w locie."
    >
      <div className="grid gap-5">
        {models.map((model) => {
          const rows = batteries.filter(
            (row) => Number(row.model_id) === Number(model.id),
          );
          const modelSlug = String(model.slug || model.name || 'e82')
            .toLowerCase()
            .includes('e55')
            ? 'e55'
            : 'e82';
          const draftNew = newRows[Number(model.id)] ?? { ...emptyBattery };

          return (
            <article
              key={model.id}
              className="rounded-2xl border border-line p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight">
                    {String(model.name)}
                  </h3>
                  <p className="text-xs text-ink-muted">
                    Pakiety skonfigurowane dla tego modelu: {rows.length}
                  </p>
                </div>
              </div>

              {rows.length === 0 && (
                <p className="mt-3 text-sm text-ink-muted">
                  Ten model nie ma jeszcze żadnego pakietu baterii.
                </p>
              )}

              <div className="mt-4 grid gap-4">
                {rows.map((row) => {
                  const draft = drafts[row.id] ?? row;

                  return (
                    <div
                      key={row.id}
                      className="rounded-2xl bg-ink-wash p-4 sm:p-5"
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-ink-subtle">
                            {String(row.code)}
                          </span>
                          {Boolean(draft.is_default) && (
                            <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                              Domyślna w modelu
                            </span>
                          )}
                          {!draft.is_active && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900">
                              Ukryta
                            </span>
                          )}
                        </div>
                      </div>

                      <BatteryLiveMetrics
                        draft={draft}
                        modelSlug={modelSlug}
                        onApplyUpdate={(patch) =>
                          setDrafts({
                            ...drafts,
                            [row.id]: { ...draft, ...patch } as Row,
                          })
                        }
                      />

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {batteryFields.map(
                          ([field, label, type, placeholder]) => (
                            <label key={field} className="grid gap-1.5 text-sm">
                              <span className="text-xs font-medium text-ink-muted">
                                {label}
                              </span>
                              <Input
                                type={type}
                                placeholder={placeholder}
                                value={String(draft[field] ?? '')}
                                onChange={(event) =>
                                  setDrafts({
                                    ...drafts,
                                    [row.id]: {
                                      ...draft,
                                      [field]: event.target.value,
                                    },
                                  })
                                }
                              />
                            </label>
                          ),
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-line/60 pt-3">
                        <div className="flex flex-wrap items-center gap-4">
                          <label className="flex items-center gap-2 text-sm font-medium">
                            <Switch
                              checked={Boolean(draft.is_default)}
                              onCheckedChange={(checked) =>
                                setDrafts({
                                  ...drafts,
                                  [row.id]: { ...draft, is_default: checked },
                                })
                              }
                            />
                            Domyślna
                          </label>
                          <label className="flex items-center gap-2 text-sm font-medium">
                            <Switch
                              checked={
                                draft.is_active !== undefined
                                  ? Boolean(draft.is_active)
                                  : true
                              }
                              onCheckedChange={(checked) =>
                                setDrafts({
                                  ...drafts,
                                  [row.id]: { ...draft, is_active: checked },
                                })
                              }
                            />
                            Widoczna w konfiguratorze
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={() => save(row.id)}>
                            <Save /> Zapisz pakiet
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600"
                            aria-label={`Usuń pakiet ${String(row.name)}`}
                            onClick={() => void remove(row)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <details
                className="mt-5 rounded-2xl border border-line bg-white p-4 sm:p-5"
                open={rows.length === 0}
              >
                <summary className="cursor-pointer text-sm font-semibold tracking-tight text-ink hover:text-ink/80">
                  Dodaj pakiet do modelu {String(model.name)}
                </summary>

                <div className="mt-4 grid gap-4">
                  <BatteryLiveMetrics
                    draft={draftNew}
                    modelSlug={modelSlug}
                    onApplyUpdate={(patch) =>
                      setNewRows({
                        ...newRows,
                        [Number(model.id)]: { ...draftNew, ...patch } as Row,
                      })
                    }
                  />

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="grid gap-1.5 text-sm">
                      <span className="text-xs font-medium text-ink-muted">
                        Kod (np. e82-982wh)
                      </span>
                      <Input
                        placeholder="np. e82-706wh"
                        value={String(draftNew.code ?? '')}
                        onChange={(event) =>
                          setNewRows({
                            ...newRows,
                            [Number(model.id)]: {
                              ...draftNew,
                              code: event.target.value,
                            },
                          })
                        }
                      />
                    </label>
                    {batteryFields.map(([field, label, type, placeholder]) => (
                      <label key={field} className="grid gap-1.5 text-sm">
                        <span className="text-xs font-medium text-ink-muted">
                          {label}
                        </span>
                        <Input
                          type={type}
                          placeholder={placeholder}
                          value={String(draftNew[field] ?? '')}
                          onChange={(event) =>
                            setNewRows({
                              ...newRows,
                              [Number(model.id)]: {
                                ...draftNew,
                                [field]: event.target.value,
                              },
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line/60 pt-3">
                    <div className="flex flex-wrap items-center gap-4">
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <Switch
                          checked={
                            draftNew.is_active !== undefined
                              ? Boolean(draftNew.is_active)
                              : true
                          }
                          onCheckedChange={(checked) =>
                            setNewRows({
                              ...newRows,
                              [Number(model.id)]: {
                                ...draftNew,
                                is_active: checked,
                              },
                            })
                          }
                        />
                        Widoczna w konfiguratorze
                      </label>
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <Switch
                          checked={Boolean(draftNew.is_default)}
                          onCheckedChange={(checked) =>
                            setNewRows({
                              ...newRows,
                              [Number(model.id)]: {
                                ...draftNew,
                                is_default: checked,
                              },
                            })
                          }
                        />
                        Domyślna dla modelu
                      </label>

                      {modelSlug === 'e82' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() =>
                            setNewRows({
                              ...newRows,
                              [Number(model.id)]: {
                                ...draftNew,
                                code: 'e82-706wh',
                                name: 'Samsung 35E 14S4P · 705,6 Wh',
                                cell_format: '18650',
                                series_count: 14,
                                parallel_count: 4,
                                cell_capacity_ah: 3.5,
                                gross_price: 1950,
                                is_active: true,
                                is_default: false,
                              },
                            })
                          }
                        >
                          Wstaw wzorzec 14S4P (705,6 Wh)
                        </Button>
                      )}
                    </div>

                    <Button
                      size="sm"
                      onClick={() => create(Number(model.id), modelSlug)}
                    >
                      <Save /> Dodaj baterię do modelu
                    </Button>
                  </div>
                </div>
              </details>
            </article>
          );
        })}
      </div>
    </Panel>
  );
}

/**
 * Strony wpisane w nawigację i stopkę mają własne trasy w kodzie frontendu -
 * usunięcie wiersza zostawiłoby martwy link, więc dla nich nie pokazujemy
 * przycisku (API blokuje to samo po swojej stronie). Lustro systemPageSlugs()
 * z apps/api/src/AdminService.php.
 */
const systemPageSlugs = new Set([
  'regulamin',
  'polityka-prywatnosci',
  'serwis',
  'kontakt',
]);

function PageEditor({
  page,
  patch,
  request,
  reload,
  setMessage,
}: {
  page?: Row;
  patch: (
    resource: string,
    id: number,
    fields: Record<string, unknown>,
  ) => Promise<void>;
  request: (path: string, options?: RequestInit) => Promise<any>;
  reload: () => Promise<void>;
  setMessage: (value: string) => void;
}) {
  const [title, setTitle] = useState(String(page?.title ?? ''));
  const [contentHtml, setContentHtml] = useState(
    String(page?.content_html ?? ''),
  );
  const [published, setPublished] = useState(Boolean(page?.is_published));

  useEffect(() => {
    if (page) {
      setTitle(String(page.title ?? ''));
      setContentHtml(String(page.content_html ?? ''));
      setPublished(Boolean(page.is_published));
    }
  }, [page]);

  if (!page)
    return (
      <Panel title="Strona" description="Brak strony w bazie.">
        <p>Uruchom preseed danych.</p>
      </Panel>
    );

  return (
    <Panel
      title={`Strona: ${String(page.navigation_label ?? page.title ?? '')}`}
      description="Edytor WYSIWYG zapisuje formatowanie oraz obrazy w treści."
    >
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label>Tytuł</Label>
          <Input
            className="h-11"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Treść</Label>
          <WysiwygEditor
            value={contentHtml}
            onChange={setContentHtml}
            minHeight="min-h-80"
            onUploadImage={async (file) => {
              const form = new FormData();
              form.append('file', await compressUploadImage(file));
              form.append('altText', `Zdjęcie w treści: ${title}`);
              const result = await request('/admin/media', {
                method: 'POST',
                body: form,
              });
              return `${API_BASE}${result.url}`;
            }}
            onAiEdit={async (instruction, html) => {
              const result = await request('/admin/ai/rich-content', {
                method: 'POST',
                body: JSON.stringify({ html, instruction }),
              });
              return String(result.html ?? '');
            }}
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={published} onCheckedChange={setPublished} />{' '}
            Opublikowana
          </label>
          <div className="flex items-center gap-2">
            <Button
              onClick={() =>
                patch('pages', page.id, {
                  title,
                  content_html: contentHtml,
                  is_published: published,
                })
              }
            >
              <Save /> Zapisz stronę
            </Button>
            {!systemPageSlugs.has(String(page.slug)) && (
              <Button
                variant="outline"
                className="text-red-600"
                onClick={async () => {
                  if (
                    !window.confirm(
                      `Usunąć stronę „${title}"? Tej operacji nie można cofnąć.`,
                    )
                  )
                    return;
                  setMessage('Usuwam stronę…');
                  try {
                    await request(`/admin/pages/${page.id}`, {
                      method: 'DELETE',
                    });
                    await reload();
                    setMessage('Strona usunięta.');
                  } catch (error) {
                    setMessage(
                      error instanceof Error
                        ? error.message
                        : 'Nie udało się usunąć strony.',
                    );
                  }
                }}
              >
                <Trash2 className="size-4" /> Usuń stronę
              </Button>
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}

/** Wszystkie strony CMS (Serwis, Regulamin, Polityka prywatności, Kontakt, ...) w jednym miejscu - wybór zakładką, edycja tym samym WYSIWYG co dotąd tylko Serwis. */
function PagesEditor({
  pages,
  patch,
  request,
  reload,
  setMessage,
}: {
  pages: Row[];
  patch: (
    resource: string,
    id: number,
    fields: Record<string, unknown>,
  ) => Promise<void>;
  request: (path: string, options?: RequestInit) => Promise<any>;
  reload: () => Promise<void>;
  setMessage: (value: string) => void;
}) {
  const [selectedSlug, setSelectedSlug] = useState<string>(
    String(pages[0]?.slug ?? ''),
  );

  useEffect(() => {
    if (pages.length > 0 && !pages.some((p) => String(p.slug) === selectedSlug))
      setSelectedSlug(String(pages[0].slug));
  }, [pages, selectedSlug]);

  const page = pages.find((p) => String(p.slug) === selectedSlug);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        {pages.map((p) => (
          <Button
            key={p.id}
            type="button"
            size="sm"
            variant={String(p.slug) === selectedSlug ? undefined : 'outline'}
            onClick={() => setSelectedSlug(String(p.slug))}
            className="rounded-full"
          >
            {String(p.navigation_label ?? p.title)}
          </Button>
        ))}
      </div>
      <PageEditor
        page={page}
        patch={patch}
        request={request}
        reload={reload}
        setMessage={setMessage}
      />
    </div>
  );
}

// Struktura drzewa jest zdefiniowana w apps/web/lib/copy.ts (defaultCopy), więc
// edytor renderuje się z niej samej: string -> pole tekstowe, string[] -> pole
// wieloliniowe (jedna wartość na linię), obiekt -> zagnieżdżona sekcja. Nie
// trzeba więc dopisywać UI, gdy ktoś dorzuci nowy literal do copy.ts.
function copyFieldLabel(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
}

function CopyFieldNode({
  node,
  path,
  label,
  setValue,
}: {
  node: unknown;
  path: string[];
  label: string;
  setValue: (path: string[], value: unknown) => void;
}) {
  const fieldId = path.join('.');
  if (typeof node === 'string') {
    return (
      <div className="grid gap-1.5">
        <Label htmlFor={fieldId}>{label}</Label>
        <Input
          id={fieldId}
          value={node}
          onChange={(event) => setValue(path, event.target.value)}
        />
      </div>
    );
  }
  if (Array.isArray(node) && node.every((item) => typeof item === 'string')) {
    return (
      <div className="grid gap-1.5">
        <Label htmlFor={fieldId}>{label}</Label>
        <Textarea
          id={fieldId}
          className="min-h-24"
          value={(node as string[]).join('\n')}
          onChange={(event) => setValue(path, event.target.value.split('\n'))}
        />
      </div>
    );
  }
  if (Array.isArray(node)) {
    return (
      <div className="grid gap-3">
        <strong className="text-sm">{label}</strong>
        {node.map((item, index) => (
          <CopyFieldNode
            key={index}
            node={item}
            path={[...path, String(index)]}
            label={`${label} ${index + 1}`}
            setValue={setValue}
          />
        ))}
      </div>
    );
  }
  const entries = Object.entries(node as Record<string, unknown>);
  return (
    <div className="grid gap-3 rounded-2xl border border-line p-4">
      <strong className="text-sm">{label}</strong>
      <div className="grid gap-3 sm:grid-cols-2">
        {entries.map(([key, value]) => (
          <CopyFieldNode
            key={key}
            node={value}
            path={[...path, key]}
            label={copyFieldLabel(key)}
            setValue={setValue}
          />
        ))}
      </div>
    </div>
  );
}

function CopyEditor({
  copy,
  request,
  reload,
  setMessage,
}: {
  copy: Record<string, unknown> | null;
  request: (path: string, options?: RequestInit) => Promise<any>;
  reload: () => Promise<void>;
  setMessage: (value: string) => void;
}) {
  const [draft, setDraft] = useState<SiteCopy>(() => mergeCopy(copy as never));

  useEffect(() => {
    setDraft(mergeCopy(copy as never));
  }, [copy]);

  function setValue(path: string[], value: unknown) {
    setDraft((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      let node: any = next;
      for (const key of path.slice(0, -1)) node = node[key];
      node[path[path.length - 1]] = value;
      return next;
    });
  }

  async function save() {
    try {
      await request('/admin/settings/copy', {
        method: 'PATCH',
        body: JSON.stringify(draft),
      });
      await reload();
      setMessage(
        'Teksty zapisane w bazie. Odśwież stronę publiczną, aby zobaczyć zmianę.',
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Nie udało się zapisać tekstów.',
      );
    }
  }

  return (
    <Panel
      title="Teksty strony"
      description="Każdy statyczny napis na stronie publicznej (nawigacja, nagłówki, przyciski, mikroteksty) - edytowane tu wartości nadpisują domyślne z kodu."
    >
      <div className="grid gap-4">
        {Object.entries(draft).map(([section, value]) => (
          <CopyFieldNode
            key={section}
            node={value}
            path={[section]}
            label={copyFieldLabel(section)}
            setValue={setValue}
          />
        ))}
      </div>
      <Button onClick={save} className="mt-6">
        <Save /> Zapisz teksty
      </Button>
    </Panel>
  );
}

function ThemeEditor({
  theme,
  request,
  reload,
  setMessage,
}: {
  theme: Record<string, string>;
  request: (path: string, options?: RequestInit) => Promise<any>;
  reload: () => Promise<void>;
  setMessage: (value: string) => void;
}) {
  const [draft, setDraft] = useState(theme);
  const labels: Record<string, string> = {
    background: 'Tło strony',
    foreground: 'Tekst',
    surface: 'Karty',
    muted: 'Tło pomocnicze',
    accent: 'Akcent',
    accentForeground: 'Tekst akcentu',
    border: 'Obramowania',
  };

  useEffect(() => {
    setDraft(theme);
  }, [theme]);
  async function save() {
    try {
      await request('/admin/settings/theme', {
        method: 'PATCH',
        body: JSON.stringify(draft),
      });
      await reload();
      setMessage(
        'Kolory zapisane w bazie. Odśwież stronę publiczną, aby zobaczyć zmianę.',
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Nie udało się zapisać motywu.',
      );
    }
  }
  return (
    <Panel
      title="Kolorystyka serwisu"
      description="Jeden motyw dla strony publicznej i konfiguratora, przechowywany w bazie."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(labels).map(([key, label]) => (
          <label
            key={key}
            className="flex items-center gap-3 rounded-2xl border p-3"
          >
            <input
              type="color"
              value={draft[key]}
              onChange={(event) =>
                setDraft({ ...draft, [key]: event.target.value })
              }
              className="size-10 cursor-pointer rounded-lg border-0 bg-transparent"
            />
            <span>
              <strong className="block text-sm">{label}</strong>
              <span className="font-mono text-xs text-ink-subtle">
                {draft[key]}
              </span>
            </span>
          </label>
        ))}
      </div>
      <Button onClick={save} className="mt-6">
        <Save /> Zapisz motyw
      </Button>
    </Panel>
  );
}

/**
 * Ikona strony (favicona). Domyślnie serwujemy pliki wygenerowane z logo
 * (apps/web/scripts/build-favicon.py); tu admin może wgrać własny obrazek.
 * "Przywróć domyślną" czyści wpis i wraca do ikony z kodu.
 */
function BrandingEditor({
  branding,
  request,
  reload,
  setMessage,
}: {
  branding: { faviconPath: string | null } | null;
  request: (path: string, options?: RequestInit) => Promise<any>;
  reload: () => Promise<void>;
  setMessage: (value: string) => void;
}) {
  const [faviconPath, setFaviconPath] = useState(branding?.faviconPath ?? '');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setFaviconPath(branding?.faviconPath ?? '');
  }, [branding]);

  async function save(path: string) {
    try {
      await request('/admin/settings/branding', {
        method: 'PATCH',
        body: JSON.stringify({ faviconPath: path }),
      });
      await reload();
      setMessage(
        path
          ? 'Ikona zapisana. Przeglądarki trzymają favicony w pamięci - odśwież kartę z Ctrl+Shift+R.'
          : 'Przywrócono domyślną ikonę wygenerowaną z logo.',
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Nie udało się zapisać ikony.',
      );
    }
  }

  async function upload(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('altText', 'Ikona strony');
      const result = await request('/admin/media', {
        method: 'POST',
        body: form,
      });
      setFaviconPath(result.url);
      await save(result.url);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Nie udało się wgrać ikony.',
      );
    } finally {
      setUploading(false);
    }
  }

  const previewUrl = faviconPath ? `${API_BASE}${faviconPath}` : '/icon.png';
  return (
    <Panel
      title="Ikona strony (favicon)"
      description="Obrazek w karcie przeglądarki i na ekranie startowym telefonu. Kwadrat, najlepiej 512x512 px - bez własnego pliku używamy znaku R wyciętego z logo Rexor."
    >
      <div className="flex flex-wrap items-center gap-4">
        <img
          src={previewUrl}
          alt="Podgląd ikony strony"
          className="size-16 rounded-2xl border object-contain"
        />
        <div className="grid gap-1">
          <span className="text-sm font-medium">
            {faviconPath ? 'Ikona własna' : 'Ikona domyślna (z logo)'}
          </span>
          <span className="font-mono text-xs text-ink-subtle">
            {faviconPath || '/icon.png'}
          </span>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium">
            <input
              type="file"
              accept="image/png,image/webp,image/avif,image/jpeg"
              className="hidden"
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) void upload(file);
              }}
            />
            {uploading ? 'Wgrywam…' : 'Wgraj ikonę'}
          </label>
          {faviconPath && (
            <Button
              variant="outline"
              onClick={() => {
                setFaviconPath('');
                void save('');
              }}
            >
              Przywróć domyślną
            </Button>
          )}
        </div>
      </div>
    </Panel>
  );
}

/**
 * System prompt chatbota jest normalnie w pełni generowany po stronie PHP
 * (ChatService.php) z danych katalogu. Tu admin może opcjonalnie nadpisać
 * stały blok instrukcji i dopisać dodatkowy kontekst bez zmiany kodu i
 * redeployu - puste pola oznaczają, że używany jest domyślny prompt z kodu.
 */
function ChatbotPromptEditor({
  chatbotPrompt,
  request,
  reload,
  setMessage,
}: {
  chatbotPrompt: {
    instructions?: string;
    extra_context?: string;
    default_instructions?: string;
  } | null;
  request: (path: string, options?: RequestInit) => Promise<any>;
  reload: () => Promise<void>;
  setMessage: (value: string) => void;
}) {
  // Pole startuje z domyślnymi instrukcjami z kodu, żeby admin od razu widział,
  // co faktycznie wysyłamy dziś, zamiast pustego pola bez punktu odniesienia.
  const [instructions, setInstructions] = useState(
    chatbotPrompt?.instructions || chatbotPrompt?.default_instructions || '',
  );
  const [extraContext, setExtraContext] = useState(
    chatbotPrompt?.extra_context ?? '',
  );

  useEffect(() => {
    setInstructions(
      chatbotPrompt?.instructions || chatbotPrompt?.default_instructions || '',
    );
    setExtraContext(chatbotPrompt?.extra_context ?? '');
  }, [chatbotPrompt]);

  async function save() {
    try {
      await request('/admin/settings/chatbot-prompt', {
        method: 'PATCH',
        body: JSON.stringify({ instructions, extra_context: extraContext }),
      });
      await reload();
      setMessage(
        'Prompt chatbota zapisany w bazie. Zmiana obowiązuje od razu, bez redeployu.',
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Nie udało się zapisać promptu chatbota.',
      );
    }
  }

  return (
    <Panel
      title="Chatbot AI (Rexor AI Advisor)"
      description="Katalog, ceny i baterie chatbot pobiera zawsze automatycznie z bazy. Poniżej widać faktyczne instrukcje zachowania, które dziś wysyłamy - edytuj je swobodnie albo dopisz dodatkowy kontekst (np. promocje, wyjątki, aktualności), bez zmiany kodu."
    >
      <div className="grid gap-6">
        <div className="grid gap-1.5">
          <Label htmlFor="chatbot-instructions">Instrukcje zachowania</Label>
          <Textarea
            id="chatbot-instructions"
            className="min-h-56 font-mono text-xs"
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
          />
          {chatbotPrompt?.default_instructions && (
            <p className="text-xs text-ink-subtle">
              Wyczyść pole i zapisz, aby wrócić do domyślnych instrukcji z kodu.
            </p>
          )}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="chatbot-context">
            Dodatkowy kontekst (dopisywany do promptu, np. promocje,
            aktualności, wyjątki)
          </Label>
          <Textarea
            id="chatbot-context"
            className="min-h-40"
            placeholder="Np. Do końca miesiąca trwa promocja -5% na model E82."
            value={extraContext}
            onChange={(event) => setExtraContext(event.target.value)}
          />
        </div>
        <Button onClick={save}>
          <Save /> Zapisz prompt chatbota
        </Button>
      </div>
    </Panel>
  );
}

/**
 * Które zgłoszenie leci na jaki adres: zapytanie ofertowe z konfiguratora,
 * formularz kontaktowy (/kontakt) i zgłoszenie serwisowe (/serwis). Puste
 * pole = wartość domyślna z .env (QUOTE_RECIPIENT / skrzynka serwis@).
 */
function MailRoutingEditor({
  mailRouting,
  request,
  reload,
  setMessage,
}: {
  mailRouting: {
    order_email: string;
    contact_email: string;
    service_email: string;
  };
  request: (path: string, options?: RequestInit) => Promise<any>;
  reload: () => Promise<void>;
  setMessage: (value: string) => void;
}) {
  const [draft, setDraft] = useState(mailRouting);
  const fields: Array<[keyof typeof mailRouting, string, string]> = [
    [
      'order_email',
      'Zapytania ofertowe (konfigurator)',
      'Kto dostaje powiadomienie o nowym zamówieniu z konfiguratora, obok potwierdzenia do klienta.',
    ],
    [
      'contact_email',
      'Formularz kontaktowy (/kontakt)',
      'Adres, na który trafiają wiadomości z formularza kontaktowego.',
    ],
    [
      'service_email',
      'Zgłoszenia serwisowe (/serwis)',
      'Adres, na który trafiają zgłoszenia serwisowe.',
    ],
  ];

  useEffect(() => {
    setDraft(mailRouting);
  }, [mailRouting]);

  async function save() {
    try {
      await request('/admin/settings/mail-routing', {
        method: 'PATCH',
        body: JSON.stringify(draft),
      });
      await reload();
      setMessage('Adresy e-mail zapisane w bazie.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Nie udało się zapisać adresów e-mail.',
      );
    }
  }

  return (
    <Panel
      title="Poczta - adresaci zgłoszeń"
      description="Katalog i cennik chatbot AI pobiera zawsze z bazy; tu ustala się, na jaki adres trafiają zapytania ofertowe, wiadomości kontaktowe i zgłoszenia serwisowe."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map(([key, label, helper]) => (
          <div key={key} className="grid gap-1.5">
            <Label htmlFor={`mail-${key}`}>{label}</Label>
            <Input
              id={`mail-${key}`}
              type="email"
              placeholder="np. biuro@rexorbikes.com"
              value={draft[key]}
              onChange={(event) =>
                setDraft({ ...draft, [key]: event.target.value })
              }
            />
            <p className="text-xs text-ink-subtle">{helper}</p>
          </div>
        ))}
      </div>
      <Button onClick={save} className="mt-6">
        <Save /> Zapisz adresy
      </Button>
    </Panel>
  );
}

const configurationEmailPlaceholders: Array<[string, string]> = [
  ['{{customerName}}', 'Imię i nazwisko klienta'],
  ['{{modelName}}', 'Nazwa modelu roweru'],
  ['{{price}}', 'Cena konfiguracji (sformatowana, np. "15 000 zł brutto")'],
  ['{{shareUrl}}', 'Link do podglądu zapisanej konfiguracji'],
  ['{{resumeUrl}}', 'Link powrotu do konfiguratora'],
  ['{{publicId}}', 'Publiczny identyfikator zamówienia'],
];

/**
 * Mail wysyłany klientowi zaraz po zapisaniu konfiguracji w konfiguratorze -
 * treść w prostym Markdown (# nagłówek, **pogrubienie**, [link](url)),
 * żeby admin mógł edytować tekst bez znajomości HTML.
 */
function ConfigurationEmailTemplateEditor({
  template,
  request,
  reload,
  setMessage,
}: {
  template: { subject: string; body_html: string };
  request: (path: string, options?: RequestInit) => Promise<any>;
  reload: () => Promise<void>;
  setMessage: (value: string) => void;
}) {
  const [subject, setSubject] = useState(template.subject);
  const [bodyHtml, setBodyHtml] = useState(template.body_html);

  useEffect(() => {
    setSubject(template.subject);
    setBodyHtml(template.body_html);
  }, [template]);

  async function save() {
    try {
      await request('/admin/settings/configuration-email-template', {
        method: 'PATCH',
        body: JSON.stringify({ subject, body_html: bodyHtml }),
      });
      await reload();
      setMessage('Szablon e-maila zapisany w bazie.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Nie udało się zapisać szablonu e-maila.',
      );
    }
  }

  return (
    <Panel
      title="E-mail potwierdzenia konfiguracji"
      description="Wysyłany do klienta zaraz po zapisaniu konfiguracji w konfiguratorze, razem z linkiem do podsumowania. Edytor WYSIWYG zapisuje formatowanie tak samo jak strony CMS."
    >
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="config-mail-subject">Temat</Label>
          <Input
            id="config-mail-subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Treść</Label>
          <WysiwygEditor
            value={bodyHtml}
            onChange={setBodyHtml}
            minHeight="min-h-56"
            onUploadImage={async (file) => {
              const form = new FormData();
              form.append('file', await compressUploadImage(file));
              form.append(
                'altText',
                'Zdjęcie w mailu potwierdzenia konfiguracji',
              );
              const result = await request('/admin/media', {
                method: 'POST',
                body: form,
              });
              return `${API_BASE}${result.url}`;
            }}
            onAiEdit={async (instruction, html) => {
              const result = await request('/admin/ai/rich-content', {
                method: 'POST',
                body: JSON.stringify({ html, instruction }),
              });
              return String(result.html ?? '');
            }}
          />
        </div>
        <div className="rounded-xl bg-ink-wash px-3 py-2 text-xs text-ink-muted">
          <strong className="text-ink">
            Dostępne placeholdery (wpisz jako zwykły tekst lub jako adres
            linku):
          </strong>{' '}
          {configurationEmailPlaceholders.map(([token, label]) => (
            <span key={token} className="mr-3 inline-block">
              <code className="rounded bg-white px-1 py-0.5">{token}</code> —{' '}
              {label}
            </span>
          ))}
        </div>
      </div>
      <Button onClick={save} className="mt-6">
        <Save /> Zapisz szablon
      </Button>
    </Panel>
  );
}

const inquiryColumns: string[][] = [
  ['public_id', 'Projekt'],
  ['customer_name', 'Klient'],
  ['customer_email', 'E-mail'],
  ['gross_total', 'Cena brutto'],
  ['status', 'Status'],
  ['created_at', 'Data'],
];

function InquiriesTable({ rows }: { rows: Row[] }) {
  return (
    <Panel
      title="Zapytania klientów"
      description="Konfiguracje zapisane przez formularz końcowy."
    >
      <Table>
        <TableHeader>
          <TableRow>
            {inquiryColumns.map(([, label]) => (
              <TableHead key={label}>{label}</TableHead>
            ))}
            <TableHead className="w-28">Akcja</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              {inquiryColumns.map(([field]) => (
                <TableCell key={field}>{String(row[field] ?? '—')}</TableCell>
              ))}
              <TableCell>
                <Button
                  size="sm"
                  variant="outline"
                  render={
                    <a
                      href={`/admin/konfiguracje/${row.public_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                >
                  <ExternalLink /> Szczegóły
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Panel>
  );
}

const activityEventLabels: Record<string, string> = {
  record_updated: 'Edycja rekordu',
  model_created: 'Nowy model',
  part_created: 'Nowa część',
  part_deleted: 'Usunięcie części',
  battery_saved: 'Zapis baterii',
  theme_updated: 'Zmiana kolorów',
  copy_updated: 'Zmiana tekstów strony',
  chatbot_prompt_updated: 'Zmiana promptu chatbota',
  mail_routing_updated: 'Zmiana adresów e-mail',
  configuration_email_template_updated: 'Zmiana szablonu e-maila konfiguracji',
  contact_message: 'Wiadomość z formularza kontaktowego',
  service_message: 'Zgłoszenie serwisowe',
  media_uploaded: 'Wgranie zdjęcia',
  media_deleted: 'Usunięcie zdjęcia',
  model_part_saved: 'Osprzęt modelu',
  model_group_settings_saved: 'Ustawienia grupy',
  model_parts_copied: 'Kopiowanie osprzętu',
  configuration_created: 'Nowa konfiguracja',
  configurator_change: 'Zmiana w konfiguratorze',
  chat_message: 'Wiadomość czatbota',
};

const activityActorLabels: Record<ActivityLogEntry['actor_type'], string> = {
  admin: 'Admin',
  customer: 'Klient',
  system: 'System',
};

function ActivityLogRow({ entry }: { entry: ActivityLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const who =
    entry.actor_label ??
    (entry.ip_address
      ? `${activityActorLabels[entry.actor_type]} (${entry.ip_address})`
      : activityActorLabels[entry.actor_type]);
  const when = new Date(
    entry.created_at.replace(' ', 'T') + 'Z',
  ).toLocaleString('pl-PL');
  return (
    <>
      <TableRow
        className={cn(entry.details && 'cursor-pointer')}
        onClick={() => entry.details && setExpanded((value) => !value)}
      >
        <TableCell className="whitespace-nowrap text-xs text-ink-subtle">
          {when}
        </TableCell>
        <TableCell>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
            {activityEventLabels[entry.event_type] ?? entry.event_type}
          </span>
        </TableCell>
        <TableCell className="text-sm">{who}</TableCell>
        <TableCell className="text-sm">{entry.summary}</TableCell>
        <TableCell className="w-10 text-center">
          {entry.details &&
            (expanded ? (
              <ChevronLeft className="mx-auto rotate-90" />
            ) : (
              <ChevronRight className="mx-auto rotate-90" />
            ))}
        </TableCell>
      </TableRow>
      {expanded && entry.details && (
        <TableRow>
          <TableCell colSpan={5} className="bg-muted/40">
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all text-xs">
              {JSON.stringify(entry.details, null, 2)}
            </pre>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

/**
 * Kto/co/kiedy dla całego panelu: konfiguracje klientów, edycje w panelu
 * admina i każda wymiana z chatbotem. Stronicowanie po malejącym id (kursor
 * beforeId), bo dziennik rośnie ciągle i strona nie może ładować wszystkiego.
 */
function ActivityLogPanel({
  request,
}: {
  request: (path: string, options?: RequestInit) => Promise<any>;
}) {
  const [items, setItems] = useState<ActivityLogEntry[]>([]);
  const [eventType, setEventType] = useState('');
  const [nextBeforeId, setNextBeforeId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function load(reset: boolean): Promise<boolean> {
    setLoading(true);
    let ok = true;
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (eventType) params.set('eventType', eventType);
      if (!reset && nextBeforeId) params.set('beforeId', String(nextBeforeId));
      const result = await request(`/admin/activity-log?${params.toString()}`);
      setItems((current) =>
        reset ? result.items : [...current, ...result.items],
      );
      setNextBeforeId(result.nextBeforeId);
      setError('');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Nie udało się pobrać dziennika.',
      );
      ok = false;
    } finally {
      setLoading(false);
    }
    return ok;
  }

  async function refresh() {
    if (!(await load(true))) throw new Error('refresh failed');
  }

  useEffect(() => {
    void load(true);
  }, [eventType]);

  return (
    <Panel
      title="Dziennik aktywności"
      description="Kto, co i kiedy zrobił: konfiguracje klientów, zmiany w panelu admina i rozmowy z chatbotem."
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Label htmlFor="activity-filter" className="text-xs text-ink-subtle">
          Typ zdarzenia
        </Label>
        <NativeSelect
          id="activity-filter"
          value={eventType}
          onChange={(event) => setEventType(event.target.value)}
          className="h-9 w-auto text-xs"
        >
          <NativeSelectOption value="">Wszystkie</NativeSelectOption>
          {Object.entries(activityEventLabels).map(([value, label]) => (
            <NativeSelectOption key={value} value={value}>
              {label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <RefreshButton onRefresh={refresh} />
      </div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kiedy</TableHead>
            <TableHead>Co</TableHead>
            <TableHead>Kto</TableHead>
            <TableHead>Szczegóły</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((entry) => (
            <ActivityLogRow key={entry.id} entry={entry} />
          ))}
        </TableBody>
      </Table>
      {items.length === 0 && !loading && (
        <p className="py-6 text-center text-sm text-ink-subtle">
          Brak zdarzeń.
        </p>
      )}
      {nextBeforeId && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => load(false)}
          >
            {loading ? 'Wczytuję…' : 'Wczytaj więcej'}
          </Button>
        </div>
      )}
    </Panel>
  );
}

const selectionModeLabels: Array<[string, string]> = [
  ['fixed', 'Element stały modelu'],
  ['select_one', 'Klient wybiera jedną pozycję'],
  ['optional', 'Dodatek opcjonalny'],
];

/**
 * Osprzęt definiujemy na poziomie modelu, bo zgodność wynika z ramy i silnika,
 * a nie z kategorii. Żeby to nie było żmudne, lista kandydatów jest zawężona
 * do części pasujących do wymagań modelu, a nowy model może skopiować osprzęt
 * z istniejącego.
 */
function ModelEquipmentEditor({
  catalog,
  patch,
  request,
  reload,
  setMessage,
}: {
  catalog: Catalog;
  patch: (
    resource: string,
    id: number,
    fields: Record<string, unknown>,
  ) => Promise<void>;
  request: (path: string, options?: RequestInit) => Promise<any>;
  reload: () => Promise<void>;
  setMessage: (value: string) => void;
}) {
  const [modelId, setModelId] = useState<number>(
    Number(catalog.models[0]?.id ?? 0),
  );
  const [copySource, setCopySource] = useState('');
  const model =
    catalog.models.find((row) => Number(row.id) === modelId) ??
    catalog.models[0];
  const pricing = catalog.modelPricing?.[String(modelId)];
  const assigned = catalog.modelParts.filter(
    (row) => Number(row.model_id) === modelId,
  );
  const assignedByPart = new Map(
    assigned.map((row) => [Number(row.part_id), row]),
  );
  const settingsByGroup = new Map(
    catalog.modelGroupSettings
      .filter((row) => Number(row.model_id) === modelId)
      .map((row) => [Number(row.group_id), row]),
  );

  const [newSize, setNewSize] = useState({
    code: '',
    label: '',
    price_delta_gross: '0',
  });

  async function addSize() {
    if (!newSize.code.trim() || !newSize.label.trim()) {
      setMessage('Podaj kod i nazwę rozmiaru.');
      return;
    }
    setMessage('Dodaję rozmiar…');
    try {
      await request('/admin/sizes', {
        method: 'POST',
        body: JSON.stringify({
          model_id: modelId,
          code: newSize.code.trim(),
          label: newSize.label.trim(),
          price_delta_gross: Number(newSize.price_delta_gross || 0),
          sort_order:
            catalog.modelSizes.filter((row) => Number(row.model_id) === modelId)
              .length * 10 + 10,
        }),
      });
      setNewSize({ code: '', label: '', price_delta_gross: '0' });
      await reload();
      setMessage('Rozmiar dodany.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Nie udało się dodać rozmiaru.',
      );
    }
  }

  async function saveModelPart(body: Record<string, unknown>) {
    setMessage('Zapisuję osprzęt…');
    try {
      await request('/admin/model-parts', {
        method: 'POST',
        body: JSON.stringify({ model_id: modelId, ...body }),
      });
      await reload();
      setMessage('Osprzęt zapisany, cena przeliczona.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Nie udało się zapisać osprzętu.',
      );
    }
  }

  async function saveGroup(groupId: number, body: Record<string, unknown>) {
    const current = settingsByGroup.get(groupId);
    setMessage('Zapisuję ustawienia grupy…');
    try {
      await request('/admin/model-group-settings', {
        method: 'POST',
        body: JSON.stringify({
          model_id: modelId,
          group_id: groupId,
          selection_mode: current?.selection_mode ?? 'select_one',
          customer_part_allowed: Boolean(
            Number(current?.customer_part_allowed ?? 0),
          ),
          customer_part_gross_price: Number(
            current?.customer_part_gross_price ?? 0,
          ),
          customer_part_label:
            current?.customer_part_label ?? 'Dostarczam własną część',
          helper_text: current?.helper_text ?? '',
          ...body,
        }),
      });
      await reload();
      setMessage('Ustawienia grupy zapisane.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Nie udało się zapisać ustawień grupy.',
      );
    }
  }

  async function copyParts() {
    if (copySource === '') return;
    if (
      !window.confirm(
        'Osprzęt tego modelu zostanie zastąpiony osprzętem wybranego modelu. Kontynuować?',
      )
    )
      return;
    setMessage('Kopiuję osprzęt…');
    try {
      await request(`/admin/models/${modelId}/copy-parts`, {
        method: 'POST',
        body: JSON.stringify({ source_model_id: Number(copySource) }),
      });
      await reload();
      setMessage('Osprzęt skopiowany.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Nie udało się skopiować osprzętu.',
      );
    }
  }

  return (
    <div className="grid min-w-0 gap-6">
      {/* 1. MASTER MODEL SELECTOR - Command Header Bar */}
      <div className="rounded-3xl border border-line bg-gradient-to-br from-[#1b1c19] via-[#141513] to-[#0c0d0b] p-6 text-white shadow-md">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Edytujesz model
              </span>
              <span className="text-xs text-white/60">
                Wybierz rower, aby dostosować jego specyfikację i ceny
              </span>
            </div>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <Bike className="size-7 text-emerald-400 shrink-0" />
              <span>{String(model?.name ?? 'Model')}</span>
            </h2>
          </div>

          {/* Quick Model Selector Pills */}
          <div className="flex flex-wrap items-center gap-2.5">
            {catalog.models.map((m) => {
              const isSelected = Number(m.id) === modelId;
              const mPricing = catalog.modelPricing?.[String(m.id)];
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setModelId(Number(m.id));
                    setCopySource('');
                  }}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all cursor-pointer',
                    isSelected
                      ? 'bg-white text-ink shadow-lg ring-2 ring-white/30'
                      : 'bg-white/10 text-white/80 hover:bg-white/15 hover:text-white border border-white/10',
                  )}
                >
                  <div
                    className={cn(
                      'grid size-8 shrink-0 place-items-center rounded-xl transition-colors',
                      isSelected
                        ? 'bg-ink text-white'
                        : 'bg-white/10 text-white/70 group-hover:text-white',
                    )}
                  >
                    <Bike className="size-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold leading-tight">
                      {String(m.name)}
                    </div>
                    <div
                      className={cn(
                        'text-xs font-medium mt-0.5',
                        isSelected ? 'text-ink-muted' : 'text-white/50',
                      )}
                    >
                      {mPricing && mPricing.issues.length === 0
                        ? `od ${mPricing.grossTotal.toFixed(0)} zł`
                        : 'Wycena'}
                    </div>
                  </div>
                  {isSelected && (
                    <span className="ml-1 size-2 rounded-full bg-emerald-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Model Action Toolbar: Copy Parts & Quick Context */}
        <div className="mt-6 flex flex-col gap-3 pt-5 border-t border-white/10 sm:flex-row sm:items-center sm:justify-between text-xs text-white/70">
          <div className="flex flex-wrap items-center gap-2">
            <InfoTooltip text="Skopiowanie osprzętu z innego modelu przenosi kompletną konfigurację części, wybory domyślne oraz ewentualne nadpisania cen. Przydatne przy tworzeniu nowego wariantu roweru." />
            <span>Skopiuj bazowy osprzęt z innego modelu:</span>
            <div className="flex items-center gap-2">
              <NativeSelect
                id="copy-source"
                value={copySource}
                onChange={(event) => setCopySource(event.target.value)}
                className="h-8 bg-white/10 border-white/20 text-white text-xs w-48"
              >
                <NativeSelectOption value="" className="text-ink">
                  wybierz model źródłowy…
                </NativeSelectOption>
                {catalog.models
                  .filter((row) => Number(row.id) !== modelId)
                  .map((row) => (
                    <NativeSelectOption
                      key={row.id}
                      value={row.id}
                      className="text-ink"
                    >
                      {String(row.name)}
                    </NativeSelectOption>
                  ))}
              </NativeSelect>
              <Button
                variant="outline"
                size="sm"
                disabled={copySource === ''}
                onClick={() => void copyParts()}
                className="h-8 border-white/20 bg-white/10 text-white hover:bg-white hover:text-ink text-xs"
              >
                <Copy className="size-3.5" /> Skopiuj
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <span className="text-white/60 text-xs">
              Przypisanych części w tym modelu:{' '}
              <strong className="text-white font-semibold">
                {assigned.length}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* 2. PRICING BREAKDOWN CALCULATOR */}
      {pricing && (
        <section className="rounded-3xl border border-line bg-white p-5 sm:p-7 shadow-xs">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Calculator className="size-5 text-ink-muted" />
                <h3 className="text-xl font-semibold tracking-tight text-ink">
                  Kalkulator ceny bazowej („od”)
                </h3>
              </div>
              <p className="mt-1 text-sm text-ink-muted leading-relaxed">
                Cena roweru nie jest wpisywana ręcznie — wynika bezpośrednio ze
                składników:{' '}
                <strong>
                  Rama + Bateria domyślna + Części domyślne + Składanie + Narzut
                </strong>
                .
              </p>
            </div>
            <span className="text-xs text-ink-muted">
              Model: <strong>{String(model?.name)}</strong>
            </span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="flex flex-col justify-between rounded-2xl border border-line/70 bg-[#fafbfa] p-4 text-sm">
              <div className="flex items-center justify-between text-ink-muted">
                <span>Rama</span>
                <InfoTooltip text="Cena surowej ramy zdefiniowana dla tego modelu w zakładce 'Modele i zdjęcia'." />
              </div>
              <div className="mt-2 text-lg font-semibold tabular-nums text-ink">
                {pricing.framePriceGross.toFixed(2)} zł
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border border-line/70 bg-[#fafbfa] p-4 text-sm">
              <div className="flex items-center justify-between text-ink-muted">
                <span>Bateria domyślna</span>
                <InfoTooltip text="Koszt pakietu baterii oznaczonego jako domyślny dla tego modelu w zakładce 'Baterie'." />
              </div>
              <div className="mt-2 text-lg font-semibold tabular-nums text-ink">
                {pricing.batteryPriceGross.toFixed(2)} zł
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border border-line/70 bg-[#fafbfa] p-4 text-sm">
              <div className="flex items-center justify-between text-ink-muted">
                <span>Części domyślne</span>
                <InfoTooltip text="Suma cen wszystkich części oznaczonych jako 'Domyślna' w grupach osprzętu poniżej." />
              </div>
              <div className="mt-2 text-lg font-semibold tabular-nums text-ink">
                {pricing.componentsPriceGross.toFixed(2)} zł
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border border-line/70 bg-[#fafbfa] p-4 text-sm">
              <div className="flex items-center justify-between text-ink-muted">
                <span>Składanie</span>
                <InfoTooltip text="Koszt montażu roweru zdefiniowany dla tego modelu w zakładce 'Modele i zdjęcia'." />
              </div>
              <div className="mt-2 text-lg font-semibold tabular-nums text-ink">
                {pricing.assemblyPriceGross.toFixed(2)} zł
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border border-line/70 bg-[#fafbfa] p-4 text-sm">
              <div className="flex items-center justify-between text-ink-muted">
                <span>Narzut {pricing.marginPercent}%</span>
                <InfoTooltip text="Procentowa marża handlowa wyliczana od sumy składników bazowych." />
              </div>
              <div className="mt-2 text-lg font-semibold tabular-nums text-ink">
                {pricing.marginAmountGross.toFixed(2)} zł
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl bg-ink p-4 text-sm text-white shadow-sm">
              <div className="flex items-center justify-between text-white/80">
                <span className="font-medium">Cena „od”</span>
                <InfoTooltip text="Końcowa cena bazowa pokazywana w ofercie i konfiguratorze przed zmianami klienta." />
              </div>
              <div className="mt-2 text-xl font-bold tabular-nums text-white">
                {pricing.issues.length > 0
                  ? 'Wycena'
                  : `${pricing.grossTotal.toFixed(2)} zł`}
              </div>
            </div>
          </div>

          {pricing.issues.length > 0 && (
            <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-800 flex items-center gap-2">
              <Info className="size-4 shrink-0 text-red-600" />
              <span>{pricing.issues.join(' ')}</span>
            </div>
          )}
          {pricing.notes.length > 0 && (
            <p className="mt-3 text-xs text-ink-muted">
              {pricing.notes.join(' ')}
            </p>
          )}
        </section>
      )}

      {/* 3. PART GROUPS CONFIGURATION */}
      {catalog.partGroups.map((group) => {
        const groupId = Number(group.id);
        const settings = settingsByGroup.get(groupId);
        const mode = settings?.selection_mode ?? 'select_one';
        const allInGroup = catalog.parts.filter(
          (part) => Number(part.group_id) === groupId,
        );
        const candidates = allInGroup.map((part) => ({
          part,
          row: assignedByPart.get(Number(part.id)),
        }));

        return (
          <Panel
            key={group.id}
            title={String(group.name)}
            description={
              mode === 'fixed'
                ? 'Element stały: montowany fabrycznie jeden element wliczony w cenę bazową (niewidoczny dla klienta jako wybór w konfiguratorze).'
                : 'Zaznacz części oferowane w tym modelu i wskaż pozycję domyślną — to ona wyznacza cenę „od” i punkt odniesienia dla różnic.'
            }
          >
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-end">
              <div className="grid gap-1">
                <Label
                  htmlFor={`mode-${group.id}`}
                  className="flex items-center gap-1.5 text-xs text-ink-muted"
                >
                  Tryb grupy
                  <InfoTooltip text="Element stały: montowany zawsze (niewidoczny w konfiguratorze jako wybór, ale jego koszt wchodzi w sumę 'od'). Wybór jednej pozycji: klient wybiera jedną z zaznaczonych opcji. Dodatek opcjonalny: klient może wybrać tę część lub z niej zrezygnować." />
                </Label>
                <NativeSelect
                  id={`mode-${group.id}`}
                  value={mode}
                  onChange={(event) =>
                    void saveGroup(groupId, {
                      selection_mode: event.target.value,
                    })
                  }
                >
                  {selectionModeLabels.map(([value, label]) => (
                    <NativeSelectOption key={value} value={value}>
                      {label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Switch
                    checked={Boolean(
                      Number(settings?.customer_part_allowed ?? 0),
                    )}
                    onCheckedChange={(checked) =>
                      void saveGroup(groupId, {
                        customer_part_allowed: checked,
                      })
                    }
                  />
                  <span className="flex items-center gap-1">
                    Klient może dostarczyć własną część
                    <InfoTooltip text="Włącza w konfiguratorze opcję 'Dostarczam własną część' z określoną wartością rozliczeniową." />
                  </span>
                </Label>
                {Boolean(Number(settings?.customer_part_allowed ?? 0)) && (
                  <div className="grid gap-1">
                    <Label
                      className="text-xs text-ink-muted"
                      htmlFor={`customer-price-${group.id}`}
                    >
                      Wartość rozliczeniowa (zł)
                    </Label>
                    <Input
                      id={`customer-price-${group.id}`}
                      type="number"
                      step="0.01"
                      defaultValue={String(
                        settings?.customer_part_gross_price ?? 0,
                      )}
                      onBlur={(event) =>
                        void saveGroup(groupId, {
                          customer_part_gross_price: Number(event.target.value),
                        })
                      }
                      className="w-32"
                    />
                  </div>
                )}
              </div>
              {mode !== 'fixed' && (
                <div className="grid gap-1 sm:col-span-2">
                  <Label
                    className="flex items-center gap-1.5 text-xs text-ink-muted"
                    htmlFor={`helper-${group.id}`}
                  >
                    Tekst pomocniczy pod nagłówkiem grupy (widoczny w
                    konfiguratorze)
                    <InfoTooltip text="Krótkie zdanie wyświetlane klientowi pod nazwą grupy, np. 'Dostępne wyświetlacze zależą od silnika'. Puste pole ukrywa ten wiersz." />
                  </Label>
                  <Input
                    key={`${groupId}-${settings?.helper_text ?? ''}`}
                    id={`helper-${group.id}`}
                    defaultValue={String(settings?.helper_text ?? '')}
                    onBlur={(event) =>
                      void saveGroup(groupId, {
                        helper_text: event.target.value,
                      })
                    }
                    placeholder="np. Dostępne wyświetlacze zależą od silnika i instalacji ramy."
                  />
                </div>
              )}
            </div>

            {mode === 'fixed' && (
              <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-[#fafbfa] p-3.5 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-ink">
                    Element montowany w modelu ({String(group.name)}):
                  </span>
                  <NativeSelect
                    value={String(
                      candidates.find((c) => c.row?.is_default)?.part.id ??
                        candidates.find((c) => c.row)?.part.id ??
                        '',
                    )}
                    onChange={(e) => {
                      const newPartId = Number(e.target.value);
                      if (newPartId) {
                        void saveModelPart({
                          part_id: newPartId,
                          assigned: true,
                          is_default: true,
                        });
                      }
                    }}
                    className="h-8 text-xs font-semibold bg-white border-line min-w-64"
                  >
                    <NativeSelectOption value="">
                      Wybierz część…
                    </NativeSelectOption>
                    {allInGroup.map((p) => (
                      <NativeSelectOption key={p.id} value={p.id}>
                        {String(p.name)} ({String(p.gross_price)} zł)
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>
                <div className="flex items-center gap-2 text-ink-muted">
                  <span>
                    Chcesz udostępnić klientowi wybór{' '}
                    {String(group.name).toLowerCase()} w konfiguratorze?
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 px-2.5 text-xs font-medium"
                    onClick={() =>
                      void saveGroup(groupId, { selection_mode: 'select_one' })
                    }
                  >
                    Włącz wybór w konfiguratorze
                  </Button>
                </div>
              </div>
            )}

            <Table className="mt-4">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">
                    <span className="inline-flex items-center gap-1">
                      W modelu
                      <InfoTooltip text="Włącza tę część w ofercie tego modelu. Wyłączone części nie będą widoczne w konfiguratorze tego roweru." />
                    </span>
                  </TableHead>
                  <TableHead>
                    <span className="inline-flex items-center gap-1">
                      Część
                      <InfoTooltip text="Nazwa i SKU części." />
                    </span>
                  </TableHead>
                  <TableHead className="w-36">
                    <span className="inline-flex items-center gap-1">
                      Cena katalogowa
                      <InfoTooltip text="Standardowa cena z globalnego cennika 'Części i ceny'. Zmiana w cenniku ogólnym zaktualizuje tę pozycję." />
                    </span>
                  </TableHead>
                  <TableHead className="w-44">
                    <span className="inline-flex items-center gap-1">
                      Cena dla modelu
                      <InfoTooltip text="Opcjonalne nadpisanie ceny wyłącznie dla tego modelu. Jeśli puste, używana jest cena katalogowa." />
                    </span>
                  </TableHead>
                  <TableHead className="w-28">
                    <span className="inline-flex items-center gap-1">
                      Domyślna
                      <InfoTooltip text="Pozycja bazowa wliczona w cenę 'od'. W konfiguratorze inne części pokazują dopłatę (+X zł) lub upust (-X zł) względem tej pozycji." />
                    </span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-sm text-ink-muted">
                      Brak części w tej grupie.
                    </TableCell>
                  </TableRow>
                )}
                {candidates.map(({ part, row }) => {
                  return (
                    <TableRow key={part.id}>
                      <TableCell>
                        <Switch
                          checked={Boolean(row)}
                          onCheckedChange={(checked) =>
                            void saveModelPart({
                              part_id: Number(part.id),
                              assigned: checked,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell className="min-w-64">
                        <span className="font-medium">{String(part.name)}</span>
                        <span className="mt-0.5 block font-mono text-xs text-ink-subtle">
                          {String(part.sku)}
                        </span>
                      </TableCell>
                      <TableCell className="tabular-nums text-sm">
                        {part.price_status === 'quote'
                          ? 'wycena'
                          : `${String(part.gross_price ?? '—')} zł`}
                      </TableCell>
                      <TableCell>
                        {row ? (
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="jak w katalogu"
                            defaultValue={
                              row.gross_price_override === null
                                ? ''
                                : String(row.gross_price_override)
                            }
                            onBlur={(event) =>
                              void saveModelPart({
                                part_id: Number(part.id),
                                gross_price_override: event.target.value,
                              })
                            }
                          />
                        ) : (
                          <span className="text-sm text-ink-subtle">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {row ? (
                          <Switch
                            checked={Boolean(Number(row.is_default))}
                            onCheckedChange={(checked) =>
                              void saveModelPart({
                                part_id: Number(part.id),
                                is_default: checked,
                                is_customer_configurable: Boolean(
                                  Number(row.is_customer_configurable),
                                ),
                              })
                            }
                          />
                        ) : (
                          <span className="text-sm text-ink-subtle">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Panel>
        );
      })}

      {/* 4. SIZES & DISCOUNTS */}
      <Panel
        title="Rozmiary i dopłaty"
        description="Rozmiar może mieć własną dopłatę, jeśli rama w danym rozmiarze kosztuje więcej."
      >
        <div className="mb-5 rounded-2xl border border-line bg-white p-4 sm:p-5">
          <h3 className="text-sm font-semibold tracking-tight text-ink">
            Dodaj rozmiar
          </h3>
          <p className="mt-1 text-xs text-ink-subtle">
            Geometrię uzupełnia się w danych modelu - nowy rozmiar pojawi się
            w konfiguratorze od razu, a w tabeli geometrii dopiero z wymiarami.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-[110px_1fr_160px_auto]">
            <Input
              placeholder="Kod (M)"
              value={newSize.code}
              onChange={(event) =>
                setNewSize({ ...newSize, code: event.target.value })
              }
              className="h-9 text-sm"
            />
            <Input
              placeholder="Nazwa dla klienta (M / 17 cali)"
              value={newSize.label}
              onChange={(event) =>
                setNewSize({ ...newSize, label: event.target.value })
              }
              className="h-9 text-sm"
            />
            <Input
              type="number"
              step="0.01"
              placeholder="Dopłata brutto"
              value={newSize.price_delta_gross}
              onChange={(event) =>
                setNewSize({
                  ...newSize,
                  price_delta_gross: event.target.value,
                })
              }
              className="h-9 text-sm"
            />
            <Button size="sm" onClick={() => void addSize()}>
              <Save /> Dodaj
            </Button>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rozmiar</TableHead>
              <TableHead className="w-40">Dopłata brutto (zł)</TableHead>
              <TableHead className="w-40">Akcja</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {catalog.modelSizes
              .filter((row) => Number(row.model_id) === modelId)
              .map((row) => (
                <SizeRow
                  key={row.id}
                  row={row}
                  patch={patch}
                  request={request}
                  reload={reload}
                  setMessage={setMessage}
                />
              ))}
          </TableBody>
        </Table>
      </Panel>
    </div>
  );
}

function SizeRow({
  row,
  patch,
  request,
  reload,
  setMessage,
}: {
  row: Row;
  patch: (
    resource: string,
    id: number,
    fields: Record<string, unknown>,
  ) => Promise<void>;
  request: (path: string, options?: RequestInit) => Promise<any>;
  reload: () => Promise<void>;
  setMessage: (value: string) => void;
}) {
  const [delta, setDelta] = useState(String(row.price_delta_gross ?? 0));

  async function remove() {
    if (
      !window.confirm(
        `Usunąć rozmiar „${String(row.label ?? row.code)}"? Zapisane konfiguracje klientów zachowają swoją treść, ale stracą powiązanie z tym rozmiarem.`,
      )
    )
      return;
    setMessage('Usuwam rozmiar…');
    try {
      await request(`/admin/sizes/${row.id}`, { method: 'DELETE' });
      await reload();
      setMessage('Rozmiar usunięty.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Nie udało się usunąć rozmiaru.',
      );
    }
  }

  return (
    <TableRow>
      <TableCell>{String(row.label ?? row.code)}</TableCell>
      <TableCell>
        <Input
          type="number"
          step="0.01"
          value={delta}
          onChange={(event) => setDelta(event.target.value)}
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => patch('sizes', row.id, { price_delta_gross: delta })}
          >
            <Save /> Zapisz
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-red-600"
            aria-label={`Usuń rozmiar ${String(row.label ?? row.code)}`}
            onClick={() => void remove()}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
