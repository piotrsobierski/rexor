'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Copy, Mail } from 'lucide-react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { bikeModels, formatPrice } from '@/lib/catalog';

type Snapshot = {
  publicId: string;
  model: { slug: string; name: string; image?: string };
  size: { code: string; label: string };
  battery: { code?: string; name: string; shortLabel?: string | null; cellFormat: string; capacityAh: number; energyWh: number; grossDelta?: number } | null;
  items: Array<{ groupName: string; name: string; description: string; grossDelta: number; selectionType: string }>;
  basePriceGross: number;
  grossTotal: number;
  createdAt: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8081/api';

export function ConfigurationSummary() {
  const params = useParams<{ token: string }>();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    setShareUrl(window.location.href);
    if (!params.token) return;
    fetch(`${API_BASE}/configurations/share/${params.token}`)
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Nie udało się otworzyć konfiguracji.'); return data; })
      .then((data) => setSnapshot(data.configuration))
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Nie udało się otworzyć konfiguracji.'));
  }, [params.token]);

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (error) return <div className="min-h-screen bg-background"><SiteHeader /><main className="mx-auto max-w-3xl px-4 py-24 text-center"><h1 className="text-4xl font-semibold tracking-tight">Nie możemy otworzyć projektu</h1><p className="mt-4 text-ink-muted">{error}</p><Button render={<a href="/konfigurator" />} className="mt-8 rounded-full bg-ink text-white"><ArrowLeft data-icon="inline-start" /> Wróć do konfiguratora</Button></main></div>;
  if (!snapshot) return <div className="min-h-screen bg-background"><SiteHeader /><main className="mx-auto max-w-3xl px-4 py-24 text-center"><p className="text-sm text-ink-muted">Otwieram zapisaną konfigurację…</p></main></div>;

  const matchingModel = bikeModels.find((item) => item.name === snapshot.model.name);
  return <div className="min-h-screen bg-background text-foreground"><SiteHeader /><main className="mx-auto max-w-[1180px] px-4 py-8 sm:px-8 sm:py-14">
    <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="eyebrow flex items-center gap-2"><CheckCircle2 className="size-4 text-green-600" /> Projekt zapisany</p><h1 className="mt-3 text-[clamp(2.4rem,6vw,5.2rem)] font-semibold leading-[0.92] tracking-[-0.06em]">{snapshot.model.name}<br />w Twojej wersji.</h1></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={copyLink} className="rounded-full"><Copy data-icon="inline-start" /> {copied ? 'Skopiowano' : 'Kopiuj link'}</Button><Button render={<a href={`mailto:?subject=${encodeURIComponent(`Konfiguracja ${snapshot.model.name}`)}&body=${encodeURIComponent(shareUrl)}`} />} className="rounded-full bg-ink text-white"><Mail data-icon="inline-start" /> Wyślij e-mailem</Button></div></div>

    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="overflow-hidden rounded-[28px] bg-[var(--muted)] p-5 sm:p-8"><div className="aspect-[4/3]"><img src={matchingModel?.image ?? '/models/e82/01.jpg'} alt={snapshot.model.name} className="size-full object-contain mix-blend-multiply" /></div><div className="mt-5 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-subtle">Numer projektu</p><p className="mt-1 font-mono text-sm">{snapshot.publicId}</p></div><div className="text-right"><p className="text-xs text-ink-subtle">Cena brutto</p><p className="text-3xl font-semibold tracking-tight">{formatPrice(snapshot.grossTotal)}</p></div></div></section>
      <section className="rounded-[28px] border border-line bg-white p-5 sm:p-8"><div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-ink-wash p-4"><span className="text-xs text-ink-subtle">Rozmiar</span><strong className="mt-1 block text-lg">{snapshot.size.label}</strong></div><div className="rounded-2xl bg-ink-wash p-4"><span className="text-xs text-ink-subtle">Bateria</span><strong className="mt-1 block text-lg">{snapshot.battery ? `${snapshot.battery.energyWh} Wh` : '—'}</strong>{snapshot.battery && <span className="mt-1 block text-sm text-ink-muted">{snapshot.battery.name}</span>}</div></div><h2 className="mt-8 text-xl font-semibold">Wybrane elementy</h2><div className="mt-3 divide-y divide-line">{snapshot.items.map((item, index) => <div key={`${item.groupName}-${index}`} className="flex items-start justify-between gap-4 py-4"><div><span className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">{item.groupName}</span><p className="mt-1 font-semibold">{item.name}</p><p className="mt-1 text-sm text-ink-muted">{item.description}</p></div><span className="shrink-0 text-sm font-semibold tabular-nums">{item.grossDelta === 0 ? 'w cenie' : `${item.grossDelta > 0 ? '+' : '−'}${formatPrice(Math.abs(item.grossDelta))}`}</span></div>)}</div><Separator className="my-5" /><p className="text-sm leading-relaxed text-ink-muted">Link jest prywatny — zachowaj go, aby wrócić do podsumowania. Rexor potwierdzi kompatybilność i ostateczny zakres przed realizacją.</p><Button render={<a href="/konfigurator" />} variant="outline" className="mt-6 w-full rounded-full">Utwórz kolejny projekt <ArrowLeft data-icon="inline-end" className="rotate-180" /></Button></section>
    </div>
  </main><SiteFooter /></div>;
}
