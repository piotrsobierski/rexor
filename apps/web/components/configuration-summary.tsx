'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Copy, Mail } from 'lucide-react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { ConfigurationSnapshotView, type Snapshot } from '@/components/configuration-snapshot-view';
import { usePublicCopy } from '@/lib/use-public-copy';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8081/api';

export function ConfigurationSummary() {
  const params = useParams<{ token: string }>();
  const copy = usePublicCopy();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    setShareUrl(window.location.href);
    if (!params.token) return;
    fetch(`${API_BASE}/configurations/share/${params.token}`)
      .then(async (response) => { const data = (await response.json()) as any; if (!response.ok) throw new Error(data.error ?? copy.summary.genericLoadError); return data; })
      .then((data) => setSnapshot(data.configuration))
      .catch((reason) => setError(reason instanceof Error ? reason.message : copy.summary.genericLoadError));
  // Odczytujemy tekst błędu raz, przy pierwszym pobraniu.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.token]);

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (error) return <div className="min-h-screen bg-background"><SiteHeader /><main className="mx-auto max-w-3xl px-4 py-24 text-center"><h1 className="text-4xl font-semibold tracking-tight">{copy.summary.errorTitle}</h1><p className="mt-4 text-ink-muted">{error}</p><Button render={<a href="/konfigurator" />} className="mt-8 rounded-full bg-ink text-white"><ArrowLeft data-icon="inline-start" /> {copy.summary.backCta}</Button></main></div>;
  if (!snapshot) return <div className="min-h-screen bg-background"><SiteHeader /><main className="mx-auto max-w-3xl px-4 py-24 text-center"><p className="text-sm text-ink-muted">{copy.summary.loadingText}</p></main></div>;

  return <div className="flex min-h-screen flex-col bg-background text-foreground"><SiteHeader /><main className="mx-auto w-full max-w-[1180px] flex-1 px-4 py-8 sm:px-8 sm:py-14">
    <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="eyebrow flex items-center gap-2"><CheckCircle2 className="size-4 text-green-600" /> {copy.summary.savedEyebrow}</p><h1 className="mt-3 text-[clamp(2.4rem,6vw,5.2rem)] font-semibold leading-[0.92] tracking-[-0.06em]">{snapshot.model.name}<br />{copy.summary.titleSuffix}</h1></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={copyLink} className="rounded-full"><Copy data-icon="inline-start" /> {copied ? copy.summary.copiedCta : copy.summary.copyLinkCta}</Button><Button render={<a href={`mailto:?subject=${encodeURIComponent(`${copy.summary.emailSubjectPrefix} ${snapshot.model.name}`)}&body=${encodeURIComponent(shareUrl)}`} />} className="rounded-full bg-ink text-white"><Mail data-icon="inline-start" /> {copy.summary.emailShareCta}</Button></div></div>

    <ConfigurationSnapshotView snapshot={snapshot} />
    <Separator className="my-5" /><p className="text-sm leading-relaxed text-ink-muted">{copy.summary.privacyNote}</p><Button render={<a href="/konfigurator" />} variant="outline" className="mt-6 w-full rounded-full">{copy.summary.newProjectCta} <ArrowLeft data-icon="inline-end" className="rotate-180" /></Button>
  </main><SiteFooter /></div>;
}
