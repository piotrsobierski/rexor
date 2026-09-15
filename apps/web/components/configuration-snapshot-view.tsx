'use client';

import { bikeModels, formatPrice } from '@/lib/catalog';
import { FINISH_LABELS, paintImageUrl } from '@/lib/paints';
import { usePublicCopy } from '@/lib/use-public-copy';

export type Snapshot = {
  publicId: string;
  model: { slug: string; name: string; image?: string };
  size: { code: string; label: string };
  battery: { code?: string; name: string; shortLabel?: string | null; cellFormat: string; capacityAh: number; energyWh: number; grossDelta?: number } | null;
  items: Array<{ groupName: string; name: string; description: string; grossPrice: number; grossDelta: number; selectionType: string }>;
  /** Wybrany lakier. Osobno od `items`, bo kolor nie jest częścią z cennika. */
  paint?: {
    paletteName: string;
    name: string;
    code: string | null;
    hex: string;
    finish: 'uni' | 'metallic' | 'pearl';
    grossPrice: number;
    render: string | null;
  } | null;
  /** Składniki ceny: tak samo jak liczy je API. Starsze migawki go nie mają. */
  pricing?: {
    framePriceGross: number;
    batteryPriceGross: number;
    componentsPriceGross: number;
    assemblyPriceGross: number;
    marginPercent: number;
    marginAmountGross: number;
    paintPriceGross?: number;
    adjustments: Array<{ name: string; type: string; amount: number | null }>;
  };
  basePriceGross: number;
  grossTotal: number;
  /** Uwagi z formularza zapisu. Doklejane przez API z kolumny, nie z migawki. */
  customerNotes?: string | null;
  createdAt: string;
};

export function ConfigurationSnapshotView({ snapshot, rightFooter }: { snapshot: Snapshot; rightFooter?: React.ReactNode }) {
  const copy = usePublicCopy();
  const matchingModel = bikeModels.find((item) => item.name === snapshot.model.name);
  return <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
    <section className="overflow-hidden rounded-[28px] bg-[var(--muted)] p-5 sm:p-8"><div className="aspect-[4/3]"><img src={snapshot.paint?.render ? paintImageUrl(snapshot.paint.render) : (matchingModel?.image ?? '/models/e82/01.jpg')} alt={snapshot.model.name} className="size-full object-contain mix-blend-multiply" /></div><div className="mt-5 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-subtle">{copy.snapshot.projectNumberLabel}</p><p className="mt-1 font-mono text-sm">{snapshot.publicId}</p></div><div className="text-right"><p className="text-xs text-ink-subtle">{copy.snapshot.grossPriceLabel}</p><p className="text-3xl font-semibold tracking-tight">{formatPrice(snapshot.grossTotal)}</p></div></div></section>
    <section className="rounded-[28px] border border-line bg-white p-5 sm:p-8"><div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-ink-wash p-4"><span className="text-xs text-ink-subtle">{copy.snapshot.sizeLabel}</span><strong className="mt-1 block text-lg">{snapshot.size.label}</strong></div><div className="rounded-2xl bg-ink-wash p-4"><span className="text-xs text-ink-subtle">{copy.snapshot.batteryLabel}</span><strong className="mt-1 block text-lg">{snapshot.battery ? `${snapshot.battery.energyWh} Wh` : '—'}</strong>{snapshot.battery && <span className="mt-1 block text-sm text-ink-muted">{snapshot.battery.name}</span>}</div>{snapshot.paint && <div className="col-span-2 flex items-center gap-3 rounded-2xl bg-ink-wash p-4"><span className="size-10 shrink-0 rounded-xl border border-line" style={{ backgroundColor: snapshot.paint.hex }} /><div className="min-w-0 flex-1"><span className="text-xs text-ink-subtle">Lakier</span><strong className="mt-0.5 block truncate text-lg leading-tight">{snapshot.paint.name}</strong><span className="mt-0.5 block truncate text-sm text-ink-muted">{snapshot.paint.paletteName}{snapshot.paint.code ? ` · ${snapshot.paint.code}` : ''} · {FINISH_LABELS[snapshot.paint.finish]}</span></div><span className="shrink-0 text-sm font-semibold tabular-nums">{snapshot.paint.grossPrice === 0 ? 'w cenie' : `+${formatPrice(snapshot.paint.grossPrice)}`}</span></div>}</div><h2 className="mt-8 text-xl font-semibold">{copy.snapshot.selectedItemsTitle}</h2><div className="mt-3 divide-y divide-line">{snapshot.items.map((item, index) => <div key={`${item.groupName}-${index}`} className="flex items-start justify-between gap-4 py-4"><div><span className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">{item.groupName}</span><p className="mt-1 font-semibold">{item.name}</p><p className="mt-1 text-sm text-ink-muted">{item.description}</p></div><span className="shrink-0 text-sm font-semibold tabular-nums">{formatPrice(item.grossPrice)}</span></div>)}</div>{snapshot.pricing && <div className="mt-6 rounded-2xl bg-ink-wash p-4"><h3 className="text-sm font-semibold uppercase tracking-wider text-ink-subtle">{copy.snapshot.priceBreakdownTitle}</h3><dl className="mt-3 grid gap-1.5 text-sm">{([[copy.snapshot.frameAndSizeLabel, snapshot.pricing.framePriceGross], [copy.snapshot.batteryLineLabel, snapshot.pricing.batteryPriceGross], [copy.snapshot.componentsLabel, snapshot.pricing.componentsPriceGross], [copy.snapshot.assemblyLabel, snapshot.pricing.assemblyPriceGross], ...(snapshot.pricing.marginAmountGross !== 0 ? [[`${copy.snapshot.marginLabelPrefix} ${snapshot.pricing.marginPercent}%`, snapshot.pricing.marginAmountGross] as [string, number]] : []), ...(snapshot.pricing.paintPriceGross ? [['Lakier', snapshot.pricing.paintPriceGross] as [string, number]] : [])] as Array<[string, number]>).map(([label, value]) => <div key={label} className="flex justify-between gap-4"><dt className="text-ink-muted">{label}</dt><dd className="tabular-nums">{formatPrice(value)}</dd></div>)}<div className="mt-1 flex justify-between gap-4 border-t border-line pt-2 font-semibold"><dt>{copy.snapshot.totalGrossLabel}</dt><dd className="tabular-nums">{formatPrice(snapshot.grossTotal)}</dd></div></dl></div>}{snapshot.customerNotes && <div className="mt-6 rounded-2xl border border-line p-4"><h3 className="text-sm font-semibold uppercase tracking-wider text-ink-subtle">{copy.snapshot.customerNotesTitle}</h3><p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-muted">{snapshot.customerNotes}</p></div>}{rightFooter}</section>
  </div>;
}
