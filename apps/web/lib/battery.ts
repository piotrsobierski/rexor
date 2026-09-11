/**
 * Obliczenia techniczne pakietu baterii w locie.
 * Wylicza watogodziny (Wh), pojemność (Ah), liczbę ogniw, napięcia oraz
 * szacunkową masę samych ogniw i gotowego pakietu (z BMS, niklem i instalacją).
 */

export type CellFormatSpec = {
  format: string;
  isNormalized: boolean;
  suggestedFormat?: string;
  cellWeightGrams: number;
  nominalCellVoltage: number;
  maxCellVoltage: number;
  note: string;
};

export type BatteryEstimates = {
  series: number;
  parallel: number;
  cellCount: number;
  cellCapacityAh: number;
  packCapacityAh: number;
  nominalVoltageV: number;
  chargeVoltageV: number;
  energyWh: number;
  cellSpec: CellFormatSpec;
  cellsWeightKg: number;
  packHardwareWeightKg: number;
  estimatedTotalPackWeightKg: number;
  packWeightMinKg: number;
  packWeightMaxKg: number;
  cellNominalV: number;
  cellChargeV: number;
  suggestedNominalV: number;
  suggestedChargeV: number;
  suggestedCode: string;
  isVoltageRealistic: boolean;
};

/**
 * Bezpieczne parsowanie liczb z formularza z obsługą przecinka i kropki.
 */
export function parseBatteryNumber(val: unknown): number {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (val === null || val === undefined) return 0;
  const s = String(val).trim().replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Rozpoznanie formatu ogniwa oraz średniej masy pojedynczego ogniwa.
 * Obsługuje typową literówkę 16850 jako 18650.
 */
export function detectCellSpec(formatRaw: unknown): CellFormatSpec {
  const raw = String(formatRaw ?? '').trim();
  const lower = raw.toLowerCase().replace(/\s+/g, '');

  if (lower.includes('21700') || lower.includes('2170')) {
    return {
      format: '21700',
      isNormalized: raw === '21700',
      cellWeightGrams: 69,
      nominalCellVoltage: 3.6,
      maxCellVoltage: 4.2,
      note: 'np. Samsung 40T/50E, FEB 21700, LG M50A (~68–70 g)',
    };
  }

  if (lower.includes('18650') || lower.includes('16850') || lower.includes('1865')) {
    const isTypo = lower.includes('16850');
    return {
      format: isTypo ? '16850' : '18650',
      isNormalized: raw === '18650',
      suggestedFormat: isTypo ? '18650' : undefined,
      cellWeightGrams: 47,
      nominalCellVoltage: 3.6,
      maxCellVoltage: 4.2,
      note: 'np. Samsung 35E, LG MJ1, Panasonic NCR18650B (~46–48 g)',
    };
  }

  if (lower.includes('26650')) {
    return {
      format: '26650',
      isNormalized: raw === '26650',
      cellWeightGrams: 96,
      nominalCellVoltage: 3.6,
      maxCellVoltage: 4.2,
      note: 'np. LiFePO4 / Li-ion 26650 (~95–100 g)',
    };
  }

  if (lower.includes('32700') || lower.includes('32650')) {
    return {
      format: '32700',
      isNormalized: raw === '32700',
      cellWeightGrams: 145,
      nominalCellVoltage: 3.2,
      maxCellVoltage: 3.65,
      note: 'np. LiFePO4 32700 (~140–150 g)',
    };
  }

  return {
    format: raw || '18650',
    isNormalized: false,
    cellWeightGrams: 48,
    nominalCellVoltage: 3.6,
    maxCellVoltage: 4.2,
    note: 'Szacunek dla standardowego cylindrycznego ogniwa Li-ion (~48 g)',
  };
}

/**
 * Przelicza parametry pakietu w locie.
 */
export function computeBatteryEstimates(battery: {
  cell_format?: unknown;
  cellFormat?: unknown;
  series_count?: unknown;
  seriesCount?: unknown;
  parallel_count?: unknown;
  parallelCount?: unknown;
  cell_capacity_ah?: unknown;
  cellCapacityAh?: unknown;
  nominal_voltage_v?: unknown;
  nominalVoltageV?: unknown;
  charge_voltage_v?: unknown;
  chargeVoltageV?: unknown;
  code?: unknown;
}, modelSlug = 'e82'): BatteryEstimates {
  const formatRaw = battery.cell_format ?? battery.cellFormat ?? '18650';
  const series = Math.max(0, Math.round(parseBatteryNumber(battery.series_count ?? battery.seriesCount)));
  const parallel = Math.max(0, Math.round(parseBatteryNumber(battery.parallel_count ?? battery.parallelCount)));
  const cellCapacityAh = parseBatteryNumber(battery.cell_capacity_ah ?? battery.cellCapacityAh);
  const nominalVoltageV = parseBatteryNumber(battery.nominal_voltage_v ?? battery.nominalVoltageV);
  const chargeVoltageV = parseBatteryNumber(battery.charge_voltage_v ?? battery.chargeVoltageV);

  const cellCount = series * parallel;
  const packCapacityAh = parallel * cellCapacityAh;
  const energyWh = packCapacityAh * nominalVoltageV;

  const cellSpec = detectCellSpec(formatRaw);
  const cellsWeightKg = (cellCount * cellSpec.cellWeightGrams) / 1000;

  // Masa osprzętu pakietu:
  // - taśmy z czystego niklu (busbars)
  // - płytka BMS z radiatorami, złączami i okablowaniem balansującym
  // - grube przewody silikonowe (10–12 AWG) z wtykiem XT60/XT90
  // - koszyki ogniw, izolatory preszpanowe, taśma kaptonowa
  // - rękaw termokurczliwy / obudowa akumulatora
  // Realistyczny narzut osprzętu to ok. 15-20% masy ogniw + ok. 250 g bazy instalacyjnej:
  const packHardwareWeightKg = cellCount > 0 ? (cellsWeightKg * 0.16 + 0.25) : 0;
  const estimatedTotalPackWeightKg = cellCount > 0 ? cellsWeightKg + packHardwareWeightKg : 0;
  const packWeightMinKg = cellCount > 0 ? cellsWeightKg * 1.12 + 0.18 : 0;
  const packWeightMaxKg = cellCount > 0 ? cellsWeightKg * 1.22 + 0.35 : 0;

  const cellNominalV = series > 0 ? nominalVoltageV / series : 0;
  const cellChargeV = series > 0 ? chargeVoltageV / series : 0;

  const suggestedNominalV = series > 0 ? Math.round(series * cellSpec.nominalCellVoltage * 10) / 10 : 0;
  const suggestedChargeV = series > 0 ? Math.round(series * cellSpec.maxCellVoltage * 10) / 10 : 0;

  const roundedWh = Math.round(energyWh);
  const cleanSlug = String(modelSlug).replace(/[^a-z0-9]/gi, '').toLowerCase() || 'pack';
  const suggestedCode = `${cleanSlug}-${roundedWh > 0 ? roundedWh : 0}wh`;

  const isVoltageRealistic = series > 0
    ? cellNominalV >= 3.2 && cellNominalV <= 3.85 && cellChargeV >= 3.9 && cellChargeV <= 4.35
    : true;

  return {
    series,
    parallel,
    cellCount,
    cellCapacityAh,
    packCapacityAh,
    nominalVoltageV,
    chargeVoltageV,
    energyWh,
    cellSpec,
    cellsWeightKg,
    packHardwareWeightKg,
    estimatedTotalPackWeightKg,
    packWeightMinKg,
    packWeightMaxKg,
    cellNominalV,
    cellChargeV,
    suggestedNominalV,
    suggestedChargeV,
    suggestedCode,
    isVoltageRealistic,
  };
}

/**
 * Formatowanie masy w kg z dokładnością do 2 miejsc po przecinku.
 */
export function formatWeightKg(kg: number): string {
  if (!Number.isFinite(kg) || kg <= 0) return '—';
  return `${kg.toFixed(2).replace('.', ',')} kg`;
}

/**
 * Formatowanie energii w Wh / kWh.
 */
export function formatWh(wh: number): string {
  if (!Number.isFinite(wh) || wh <= 0) return '0 Wh';
  if (wh >= 1000) {
    return `${wh.toFixed(1).replace('.', ',')} Wh (${(wh / 1000).toFixed(2).replace('.', ',')} kWh)`;
  }
  return `${wh.toFixed(1).replace('.', ',')} Wh`;
}

export type RangeProfileEstimate = {
  mode: string;
  condition: string;
  consumptionLabel: string;
  consumptionMin: number;
  consumptionMax: number;
  rangeMinKm: number;
  rangeMaxKm: number;
};

export const RANGE_PROFILES = [
  {
    mode: 'Eco',
    condition: 'asfalt / lekki teren',
    consumptionLabel: '4–7 Wh/km',
    consumptionMin: 4,
    consumptionMax: 7,
  },
  {
    mode: 'Eco',
    condition: 'MTB / pagórki',
    consumptionLabel: '7–10 Wh/km',
    consumptionMin: 7,
    consumptionMax: 10,
  },
  {
    mode: 'Tour / Trail',
    condition: 'zróżnicowany teren',
    consumptionLabel: '8–13 Wh/km',
    consumptionMin: 8,
    consumptionMax: 13,
  },
  {
    mode: 'eMTB / Auto',
    condition: 'dynamiczne wsparcie w terenie',
    consumptionLabel: '10–16 Wh/km',
    consumptionMin: 10,
    consumptionMax: 16,
  },
  {
    mode: 'Boost / Turbo',
    condition: 'pełna moc / strome podjazdy',
    consumptionLabel: '14–22 Wh/km',
    consumptionMin: 14,
    consumptionMax: 22,
  },
];

export function computeRangeEstimates(energyWh: number): RangeProfileEstimate[] {
  const wh = Number(energyWh) || 0;
  if (wh <= 0) return [];
  return RANGE_PROFILES.map((p) => ({
    mode: p.mode,
    condition: p.condition,
    consumptionLabel: p.consumptionLabel,
    consumptionMin: p.consumptionMin,
    consumptionMax: p.consumptionMax,
    rangeMinKm: Math.round(wh / p.consumptionMax),
    rangeMaxKm: Math.round(wh / p.consumptionMin),
  }));
}
