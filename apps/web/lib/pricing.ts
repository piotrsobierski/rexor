import { CUSTOMER_SUPPLIED_SKU, NONE_SKU, type BikeBattery, type BikeModel, type BikeSize, type OptionGroup } from '@/lib/catalog';

export type Selections = Record<string, string>;

/** Pozycja rozliczana w grupie: wybór klienta albo pozycja domyślna. */
function selectedOption(group: OptionGroup, selections: Selections) {
  const requested = group.selectionMode === 'fixed' ? group.defaultSku : (selections[group.slug] ?? group.defaultSku);
  if (requested === NONE_SKU) return null;
  if (requested === CUSTOMER_SUPPLIED_SKU) {
    return { name: group.customerPartLabel, price: group.customerPartGrossPrice, customerSupplied: true as const };
  }
  const option = group.options.find((candidate) => candidate.sku === requested);
  if (!option) return null;
  return { name: option.name, price: option.price, customerSupplied: false as const };
}

/** Cena pozycji domyślnej grupy: punkt odniesienia dla pokazywanych różnic. */
export function groupDefaultPrice(group: OptionGroup): number {
  return group.options.find((option) => option.sku === group.defaultSku)?.price ?? 0;
}

/**
 * Ta sama formuła, którą liczy API w PricingService:
 * rama + rozmiar + bateria + części + składanie + narzut.
 * Konfigurator nie ma własnego cennika, a wysłaną wycenę przelicza serwer.
 */
export function configurationPricing(
  model: BikeModel,
  selections: Selections,
  battery: BikeBattery | null,
  size: BikeSize | null,
): { total: number | null; components: number; frame: number; quoteOnly: boolean } {
  let components = 0;
  let quoteOnly = false;

  for (const group of model.groups) {
    const selected = selectedOption(group, selections);
    if (!selected) {
      if (group.selectionMode !== 'optional') quoteOnly = quoteOnly || group.defaultSku !== null;
      continue;
    }
    if (selected.price === null) {
      quoteOnly = true;
      continue;
    }
    components += selected.price;
  }

  const frame = model.framePriceGross + (size?.priceDelta ?? 0);
  const subtotal = frame + (battery?.grossPrice ?? 0) + components + model.assemblyPriceGross;
  const total = quoteOnly || model.groups.length === 0 ? null : Math.round(subtotal * (1 + model.marginPercent / 100) * 100) / 100;

  return { total, components, frame, quoteOnly };
}
