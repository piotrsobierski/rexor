export type BikeOption = {
  id: string;
  name: string;
  detail: string;
  price: number;
  customerSupplied?: boolean;
};

export type OptionGroup = {
  id: string;
  name: string;
  helper: string;
  defaultOptionId: string;
  options: BikeOption[];
};

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
  basePrice: number | null;
  motor: string;
  battery: string;
  sizes: string[];
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
    basePrice: 15000,
    motor: 'Bafang M560 · 750 W · Bluetooth',
    battery: 'Samsung 35E · 13S6P · 982,8 Wh',
    sizes: ['M', 'L', 'XL'],
    batteries: [
      { code: 'e82-982wh', name: 'Samsung 35E 13S6P', shortLabel: '18650 · 13S6P · 982,8 Wh', energyWh: 982.8, capacityAh: 21, grossPrice: 2400, isDefault: true },
      { code: 'e82-655wh', name: 'Samsung 35E 13S4P', shortLabel: '18650 · 13S4P · 655,2 Wh', energyWh: 655.2, capacityAh: 14, grossPrice: 1800, isDefault: false },
    ],
    available: true,
    groups: [
      {
        id: 'display', name: 'Wyświetlacz', helper: 'Dopasowany do instalacji M560', defaultOptionId: 'dpc245',
        options: [
          { id: 'dpc245', name: 'Bafang DPC 245', detail: 'CAN · Bluetooth', price: 399 },
          { id: 'dpc030', name: 'Bafang DPC 030', detail: 'Zintegrowany w górnej rurze', price: 500 },
        ],
      },
      {
        id: 'fork', name: 'Amortyzator przedni', helper: 'Koło 29 cali, oś Boost', defaultOptionId: 'rockshox35',
        options: [
          { id: 'rockshox35', name: 'RockShox 35 Silver TK', detail: 'Solo Air · 150 mm', price: 1000 },
          { id: 'fox36', name: 'FOX 36 Performance', detail: '160 mm', price: 2000 },
          { id: 'own-fork', name: 'Dostarczam własny', detail: 'Zgodność potwierdzi Rexor', price: 0, customerSupplied: true },
        ],
      },
      {
        id: 'shock', name: 'Damper', helper: 'Wymiar 230×60', defaultOptionId: 'rs-deluxe',
        options: [
          { id: 'rs-deluxe', name: 'RockShox Deluxe', detail: '230×60', price: 1000 },
          { id: 'fox-float', name: 'FOX Float X Performance Elite', detail: '230×60', price: 1600 },
          { id: 'super-deluxe', name: 'RockShox Super Deluxe', detail: 'Wariant do potwierdzenia', price: 1600 },
          { id: 'own-shock', name: 'Dostarczam własny', detail: 'Wymagany wymiar 230×60', price: 0, customerSupplied: true },
        ],
      },
      {
        id: 'brakes', name: 'Hamulce', helper: 'Cztery tłoczki przód i tył', defaultOptionId: 'shimano',
        options: [
          { id: 'shimano', name: 'Shimano 4-tłoczkowe', detail: 'Model zostanie potwierdzony', price: 1000 },
          { id: 'magura', name: 'Magura MT5', detail: 'Klamka 2-palcowa', price: 1300 },
          { id: 'own-brakes', name: 'Dostarczam własne', detail: 'Komplet przód i tył', price: 0, customerSupplied: true },
        ],
      },
      {
        id: 'drivetrain', name: 'Napęd', helper: 'Wzmocniony napęd do e-MTB', defaultOptionId: 'deore',
        options: [
          { id: 'deore', name: 'Shimano Deore M5100', detail: '11 rz. · 11–51T', price: 800 },
          { id: 'cues', name: 'Shimano CUES U6000', detail: '10 rz. · Linkglide 11–48T', price: 1050 },
        ],
      },
      {
        id: 'tires', name: 'Opony', helper: 'Komplet na oba koła', defaultOptionId: 'johnny-watts',
        options: [
          { id: 'johnny-watts', name: 'Schwalbe Johnny Watts', detail: '29 cali · Classic-Skin', price: 300 },
          { id: 'maxxis', name: 'Maxxis 2.6', detail: 'DHF przód · DHR II tył', price: 500 },
        ],
      },
      {
        id: 'paint', name: 'Lakierowanie', helper: 'Wykończenie ramy', defaultOptionId: 'raw',
        options: [
          { id: 'raw', name: 'Standardowe', detail: 'Czarny mat', price: 0 },
          { id: 'single', name: 'Jeden kolor', detail: 'Kolor ustalimy po zapytaniu', price: 800 },
          { id: 'custom', name: 'Projekt indywidualny', detail: 'Dwa kolory', price: 1100 },
        ],
      },
    ],
  },
  {
    id: 'e55', name: 'Rexor E55', category: 'MTB', eyebrow: 'Mocny e-MTB',
    description: 'Karbonowa rama pod M620, duży pakiet 14S4P i konfiguracja przygotowana do cięższych tras.',
    image: '/models/e55/01.jpg', gallery: ['/models/e55/01.jpg', '/models/e55/02.jpg', '/models/e55/03.jpg', '/models/e55/04.jpg'], frameImage: '/models/e55/01.jpg',
    basePrice: 16500, motor: 'Bafang M620 · CAN', battery: 'FEB 21700 · 14S4P · 1310,4 Wh', sizes: ['M', 'L'],
    batteries: [
      { code: 'e55-1310wh', name: 'FEB 21700 14S4P', shortLabel: '21700 · 14S4P · 1310,4 Wh', energyWh: 1310.4, capacityAh: 26, grossPrice: 3000, isDefault: true },
      { code: 'e55-983wh', name: 'DengFu 52 V 14S3P', shortLabel: '21700 · 14S3P · 982,8 Wh', energyWh: 982.8, capacityAh: 19.5, grossPrice: 2600, isDefault: false },
    ],
    available: true,
    groups: [
      {
        id: 'display', name: 'Wyświetlacz', helper: 'Dopasowany do instalacji M620 CAN', defaultOptionId: 'dpc245',
        options: [
          { id: 'dpc245', name: 'Bafang DPC 245', detail: 'CAN · Bluetooth', price: 399 },
          { id: 'dpc010', name: 'Bafang DPC 010', detail: 'Kolorowy ekran', price: 450 },
          { id: 'dpc080', name: 'Bafang DPC 080', detail: 'Kompaktowa obudowa', price: 450 },
        ],
      },
      {
        id: 'shock', name: 'Damper', helper: 'Jedyny zgodny wymiar: 210×55, łącznik 70 mm', defaultOptionId: 'own-shock',
        options: [{ id: 'own-shock', name: 'Dostarczam własny', detail: 'Wyłącznie 210×55', price: 0, customerSupplied: true }],
      },
      {
        id: 'paint', name: 'Lakierowanie', helper: 'Wykończenie ramy', defaultOptionId: 'raw',
        options: [
          { id: 'raw', name: 'Do ustalenia', detail: 'Bez dopłaty w konfiguracji', price: 0 },
          { id: 'single', name: 'Jeden kolor', detail: 'Kolor ustalimy po zapytaniu', price: 800 },
          { id: 'custom', name: 'Projekt indywidualny', detail: 'Dwa kolory', price: 1100 },
        ],
      },
    ],
  },
  {
    id: 'cfr707', name: 'Rexor CFR707', category: 'Gravel', eyebrow: 'Karbonowy gravel',
    description: 'Lekka rama T700/T800, prześwit do 700×50 mm i mocowania na wyprawowy osprzęt.',
    image: '/models/cfr707/01.png', gallery: ['/models/cfr707/01.png', '/models/cfr707/02.jpg', '/models/cfr707/03.jpg', '/models/cfr707/04.jpg', '/models/cfr707/05.jpg'],
    basePrice: null, motor: 'Napęd tradycyjny', battery: 'Bez baterii', sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], batteries: [], available: false, groups: [],
  },
];

export const formatPrice = (value: number) =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(value);
