/**
 * Dane marketingowe modeli: to, czego nie trzyma baza (wstęp, galeria, hasła).
 * Ceny, rozmiary, baterie i grupy opcji pochodzą wyłącznie z API, bo cennik
 * może mieć tylko jedno źródło prawdy. Do czasu odpowiedzi /catalog model nie
 * ma ceny ani opcji i konfigurator pokazuje to jawnie.
 */

export const CUSTOMER_SUPPLIED_SKU = '__customer_supplied__';

export type BikeOption = {
  sku: string;
  name: string;
  detail: string;
  price: number | null;
  priceStatus: 'fixed' | 'quote';
  isDefault: boolean;
  configurable: boolean;
  imagePath?: string | null;
};

export type OptionGroup = {
  slug: string;
  name: string;
  helper: string;
  /** fixed = element stały modelu, select_one = wybór klienta, optional = dodatek. */
  selectionMode: 'fixed' | 'select_one' | 'optional';
  defaultSku: string | null;
  customerPartAllowed: boolean;
  customerPartLabel: string;
  customerPartGrossPrice: number;
  options: BikeOption[];
};

/** Rozmiar może mieć własną dopłatę, np. dłuższa rama. */
export type BikeSize = { code: string; label: string; priceDelta: number };

/** Pakiet baterii jest wyborem w konfiguratorze i jest edytowalny per model. */
export type BikeBattery = {
  code: string;
  name: string;
  shortLabel: string;
  energyWh: number;
  capacityAh: number;
  grossPrice: number;
  isDefault: boolean;
};

export type BikeModel = {
  id: 'e82' | 'e55' | 'cfr707';
  name: string;
  category: string;
  eyebrow: string;
  description: string;
  image: string;
  gallery: string[];
  /** Zdjęcie ramy na stronie /ramy. Domyślnie gallery[1] nie zawsze pokazuje całą ramę. */
  frameImage?: string;
  /** Cena „od”: suma składników przy wyborach domyślnych, liczona przez API. */
  basePrice: number | null;
  framePriceGross: number;
  assemblyPriceGross: number;
  marginPercent: number;
  motor: string;
  battery: string;
  sizes: BikeSize[];
  batteries: BikeBattery[];
  available: boolean;
  groups: OptionGroup[];
};

export const bikeModels: BikeModel[] = [
  {
    id: 'e82',
    name: 'Rexor E82',
    category: 'MTB',
    eyebrow: 'Karbonowy e-enduro',
    description: 'Pełne zawieszenie, 170 mm skoku i mocny napęd M560. Dobierz osprzęt pod własny styl jazdy.',
    image: '/models/e82/01.jpg',
    gallery: ['/models/e82/01.jpg', '/models/e82/02.jpg', '/models/e82/03.jpg', '/models/e82/04.jpg', '/models/e82/05.jpg'],
    basePrice: null,
    framePriceGross: 0,
    assemblyPriceGross: 0,
    marginPercent: 0,
    motor: 'Bafang M560 · 750 W · Bluetooth',
    battery: 'Samsung 35E · 13S6P · 982,8 Wh',
    sizes: [],
    batteries: [],
    available: true,
    groups: [],
  },
  {
    id: 'e55',
    name: 'Rexor E55',
    category: 'MTB',
    eyebrow: 'Mocny e-MTB',
    description: 'Karbonowa rama pod M620, duży pakiet 14S4P i konfiguracja przygotowana do cięższych tras.',
    image: '/models/e55/01.jpg',
    gallery: ['/models/e55/01.jpg', '/models/e55/02.jpg', '/models/e55/03.jpg', '/models/e55/04.jpg'],
    frameImage: '/models/e55/01.jpg',
    basePrice: null,
    framePriceGross: 0,
    assemblyPriceGross: 0,
    marginPercent: 0,
    motor: 'Bafang M620 · CAN',
    battery: 'FEB 21700 · 14S4P · 1310,4 Wh',
    sizes: [],
    batteries: [],
    available: true,
    groups: [],
  },
  {
    id: 'cfr707',
    name: 'Rexor CFR707',
    category: 'Gravel',
    eyebrow: 'Karbonowy gravel',
    description: 'Lekka rama T700/T800, prześwit do 700×50 mm i mocowania na wyprawowy osprzęt.',
    image: '/models/cfr707/01.png',
    gallery: ['/models/cfr707/01.png', '/models/cfr707/02.jpg', '/models/cfr707/03.jpg', '/models/cfr707/04.jpg', '/models/cfr707/05.jpg'],
    basePrice: null,
    framePriceGross: 0,
    assemblyPriceGross: 0,
    marginPercent: 0,
    motor: 'Napęd tradycyjny',
    battery: 'Bez baterii',
    sizes: [],
    batteries: [],
    available: false,
    groups: [],
  },
];

export const formatPrice = (value: number) =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(value);
