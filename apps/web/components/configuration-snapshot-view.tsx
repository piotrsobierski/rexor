import { bikeModels, formatPrice } from '@/lib/catalog';

export type Snapshot = {
  publicId: string;
  model: { slug: string; name: string; image?: string };
  size: { code: string; label: string };
  battery: { code?: string; name: string; shortLabel?: string | null; cellFormat: string; capacityAh: number; energyWh: number; grossDelta?: number } | null;
  items: Array<{ groupName: string; name: string; description: string; grossDelta: number; selectionType: string }>;
  basePriceGross: number;
  grossTotal: number;
  createdAt: string;
};

export function ConfigurationSnapshotView({ snapshot, rightFooter }: { snapshot: Snapshot; rightFooter?: React.ReactNode }) {
  const matchingModel = bikeModels.find((item) => item.name === snapshot.model.name);
  return <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
    <section className="overflow-hidden rounded-[28px] bg-[var(--muted)] p-5 sm:p-8"><div className="aspect-[4/3]"><img src={matchingModel?.image ?? '/models/e82/01.jpg'} alt={snapshot.model.name} className="size-full object-contain mix-blend-multiply" /></div><div className="mt-5 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-subtle">Numer projektu</p><p className="mt-1 font-mono text-sm">{snapshot.publicId}</p></div><div className="text-right"><p className="text-xs text-ink-subtle">Cena brutto</p><p className="text-3xl font-semibold tracking-tight">{formatPrice(snapshot.grossTotal)}</p></div></div></section>
    <section className="rounded-[28px] border border-line bg-white p-5 sm:p-8"><div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-ink-wash p-4"><span className="text-xs text-ink-subtle">Rozmiar</span><strong className="mt-1 block text-lg">{snapshot.size.label}</strong></div><div className="rounded-2xl bg-ink-wash p-4"><span className="text-xs text-ink-subtle">Bateria</span><strong className="mt-1 block text-lg">{snapshot.battery ? `${snapshot.battery.energyWh} Wh` : '—'}</strong>{snapshot.battery && <span className="mt-1 block text-sm text-ink-muted">{snapshot.battery.name}</span>}</div></div><h2 className="mt-8 text-xl font-semibold">Wybrane elementy</h2><div className="mt-3 divide-y divide-line">{snapshot.items.map((item, index) => <div key={`${item.groupName}-${index}`} className="flex items-start justify-between gap-4 py-4"><div><span className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">{item.groupName}</span><p className="mt-1 font-semibold">{item.name}</p><p className="mt-1 text-sm text-ink-muted">{item.description}</p></div><span className="shrink-0 text-sm font-semibold tabular-nums">{item.grossDelta === 0 ? 'w cenie' : `${item.grossDelta > 0 ? '+' : '−'}${formatPrice(Math.abs(item.grossDelta))}`}</span></div>)}</div>{rightFooter}</section>
  </div>;
}
