'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ConfigurationSnapshotView, type Snapshot } from '@/components/configuration-snapshot-view';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8081/api';

export function AdminConfigurationView() {
  // useParams() zostaje na placeholderze powłoki przy twardym wejściu (link
  // otwierany w nowej karcie z panelu, nie nawigacja przez router) - patrz
  // ten sam problem i wyjaśnienie w components/static-pages.tsx.
  const pathname = usePathname();
  const publicId = pathname.split('/').filter(Boolean).pop() ?? '';
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = sessionStorage.getItem('rexor_admin_token');
    if (!token) { setError('Zaloguj się w panelu administracyjnym, aby zobaczyć tę konfigurację.'); return; }
    if (!publicId) return;
    fetch(`${API_BASE}/admin/configurations/${publicId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => { const data = (await response.json()) as any; if (!response.ok) throw new Error(data.error ?? 'Nie udało się otworzyć konfiguracji.'); return data; })
      .then((data) => setSnapshot(data.configuration))
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Nie udało się otworzyć konfiguracji.'));
  }, [publicId]);

  return <div className="min-h-screen bg-[#f4f5f2]">
    <header className="border-b border-line bg-white"><div className="mx-auto flex h-18 max-w-[1500px] items-center justify-between px-4 sm:px-8"><a href="/admin"><img src="/brand/rexor-logo.png" alt="Rexor" className="w-28" /></a><a href="/admin" className="text-sm font-medium text-ink-muted hover:text-black">Wróć do panelu</a></div></header>
    <main className="mx-auto max-w-[1180px] px-4 py-8 sm:px-8 sm:py-14">
      <p className="eyebrow">Zapytanie klienta</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em]">Podgląd konfiguracji</h1>
      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}
      {!error && !snapshot && <p className="mt-6 text-sm text-ink-muted">Wczytuję konfigurację…</p>}
      {snapshot && <div className="mt-8"><ConfigurationSnapshotView snapshot={snapshot} /></div>}
    </main>
  </div>;
}
