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
  /** Slug kategorii z bazy (bike_categories.slug) — do filtrowania i linkowania /rowery/{slug}. */
  categorySlug: string;
  eyebrow: string;
  description: string;
  descriptionHtml?: string;
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
    categorySlug: 'mtb',
    eyebrow: 'Karbonowy e-enduro',
    description: 'Pełne zawieszenie, 170 mm skoku i mocny napęd M560. Dobierz osprzęt pod własny styl jazdy.',
    descriptionHtml: `<h3>Karbonowe e-enduro stworzone do mocnej jazdy</h3>
<p><strong>Rexor E82</strong> to najbardziej sportowy i agresywny model e-MTB w naszej ofercie. Został zaprojektowany dla osób, które chcą wykorzystać możliwości napędu elektrycznego nie tylko na podjazdach, ale przede wszystkim podczas szybkiej jazdy w prawdziwym terenie.</p>
<p>Karbonowa rama, około <strong>170 mm skoku tylnego zawieszenia</strong>, nowoczesna geometria oraz możliwość zastosowania kół 29" sprawiają, że E82 czuje się najlepiej na stromych trasach, kamieniach, korzeniach, szybkich zjazdach i technicznych singletrackach. To konstrukcja zdecydowanie bliższa współczesnemu rowerowi enduro niż klasycznemu trekkingowemu e-bike'owi.</p>
<h3>Dlaczego E82?</h3>
<p>Największą zaletą E82 jest połączenie dużego skoku z relatywnie kompaktową i sportową konstrukcją. <strong>Kąt główki ramy 64°</strong> zapewnia stabilność na stromych zjazdach, natomiast <strong>kąt rury podsiodłowej 77°</strong> pomaga utrzymać wydajną pozycję na podjazdach. Tylne widełki mają około <strong>455 mm</strong>, dzięki czemu rower pozostaje znacznie bardziej zwrotny niż typowe ciężkie konstrukcje wykorzystujące większe jednostki napędowe.</p>
<p>E82 wykorzystuje standard <strong>Boost 148 × 12 mm</strong>, hak przerzutki <strong>UDH</strong>, wewnętrzne prowadzenie przewodów oraz pozwala na montaż opon do <strong>29 × 2,6"</strong> albo <strong>27,5 × 2,8"</strong>. Rama wykonana jest z włókien węglowych Toray T700/T800.</p>
<h3>Dla kogo?</h3>
<p>To najlepszy wybór dla osoby, która:</p>
<ul>
<li>jeździ po górach, bikeparkach i technicznych trasach,</li>
<li>chce dużego skoku zawieszenia i geometrii enduro,</li>
<li>oczekuje dobrej zwrotności mimo obecności silnika i dużej baterii,</li>
<li>bardziej ceni prowadzenie roweru niż maksymalną moc napędu,</li>
<li>chce zbudować nowoczesnego e-MTB na kołach 29".</li>
</ul>
<h3>Najważniejsze parametry E82</h3>
<table>
<thead><tr><th>Parametr</th><th>Rexor E82</th></tr></thead>
<tbody>
<tr><td>Typ</td><td>E-MTB / Enduro</td></tr>
<tr><td>Materiał ramy</td><td>karbon Toray T700/T800</td></tr>
<tr><td>Skok ramy</td><td>ok. 170–171 mm</td></tr>
<tr><td>Amortyzator tylny</td><td>230 × 60 mm</td></tr>
<tr><td>Kąt główki</td><td>64°</td></tr>
<tr><td>Kąt rury podsiodłowej</td><td>77°</td></tr>
<tr><td>Tył</td><td>Boost 148 × 12 mm</td></tr>
<tr><td>Hak przerzutki</td><td>UDH</td></tr>
<tr><td>Maks. opona</td><td>29 × 2,6" / 27,5 × 2,8"</td></tr>
<tr><td>Prowadzenie przewodów</td><td>wewnętrzne</td></tr>
<tr><td>Rozmiary platformy</td><td>M / L / XL, zależnie od wersji</td></tr>
<tr><td>Typ napędu OEM</td><td>Bafang M510 / M560</td></tr>
<tr><td>Bateria OEM</td><td>do ok. 1008 Wh</td></tr>
</tbody>
</table>
<p><strong>„Pod górę dzięki elektryce. W dół jak prawdziwe enduro.”</strong></p>`,
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
    categorySlug: 'mtb',
    eyebrow: 'Mocny e-MTB',
    description: 'Karbonowa rama pod M620, duży pakiet 14S4P i konfiguracja przygotowana do cięższych tras.',
    descriptionHtml: `<h3>Mocny e-MTB do długich tras i cięższych zastosowań</h3>
<p><strong>Rexor E55</strong> stawia na trochę inną filozofię niż E82. To solidna karbonowa platforma typu all-mountain / e-MTB zaprojektowana wokół potężnego napędu <strong>Bafang M620</strong>.</p>
<p>Dzięki temu doskonale nadaje się do budowy roweru o bardzo dużym momencie obrotowym, dużym akumulatorze i wysokiej zdolności do pokonywania stromych podjazdów. Jest to model dla użytkownika, który chce mieć dużo dostępnej mocy i nie zamierza oszczędzać roweru.</p>
<h3>Dlaczego E55?</h3>
<p>E55 ma <strong>150 mm skoku tylnego zawieszenia</strong>, kąt główki ramy <strong>64°</strong> oraz stromy <strong>77° kąt rury podsiodłowej</strong>. Jest więc nadal nowoczesnym rowerem górskim, ale ma wyraźnie dłuższy tylny trójkąt — około <strong>478 mm</strong> — niż E82.</p>
<p>To nie przypadek. Rama została zaprojektowana wokół większego i cięższego silnika M620. Rezultatem jest bardzo dobra stabilność, przyczepność na podjazdach i spokojniejsze zachowanie roweru przy dużej mocy.</p>
<p>W konfiguracji Rexor platforma łączy potężny silnik <strong>Bafang M620 52 V</strong> z powiększonym pakietem <strong>FEB 21700 · 14S4P · 1310,4 Wh</strong> (oferującym znacznie większy zasięg niż podstawowa bateria OEM ok. 1040 Wh), oponami do <strong>29 × 2,6"</strong> lub <strong>27,5 × 2,8"</strong>, tylnym kołem Boost 148 × 12 mm oraz wewnętrznym prowadzeniem przewodów.</p>
<h3>Dla kogo?</h3>
<p>E55 jest szczególnie dobrym wyborem dla osoby, która:</p>
<ul>
<li>chce możliwie mocnego centralnego napędu,</li>
<li>dużo podjeżdża,</li>
<li>pokonuje długie trasy,</li>
<li>chce pojemnej baterii 1310,4 Wh pod wymagające wyprawy,</li>
<li>przedkłada moc i wytrzymałość nad minimalną masę,</li>
<li>szuka e-bike'a do ciężkiego terenu, a nie tylko lekkich leśnych ścieżek.</li>
</ul>
<h3>Najważniejsze parametry E55</h3>
<table>
<thead><tr><th>Parametr</th><th>Rexor E55</th></tr></thead>
<tbody>
<tr><td>Typ</td><td>E-MTB / All Mountain</td></tr>
<tr><td>Materiał ramy</td><td>karbon Toray T700/T800</td></tr>
<tr><td>Skok ramy</td><td>150 mm</td></tr>
<tr><td>Amortyzator tylny</td><td>230 × 60 mm* (dostępny również 210 × 55 mm)</td></tr>
<tr><td>Kąt główki</td><td>64°</td></tr>
<tr><td>Kąt rury podsiodłowej</td><td>77°</td></tr>
<tr><td>Tylne widełki</td><td>ok. 478 mm</td></tr>
<tr><td>Tył</td><td>Boost 148 × 12 mm</td></tr>
<tr><td>Hak przerzutki</td><td>dostępny UDH</td></tr>
<tr><td>Maks. opona</td><td>29 × 2,6" / 27,5 × 2,8"</td></tr>
<tr><td>Prowadzenie przewodów</td><td>wewnętrzne</td></tr>
<tr><td>Rozmiary</td><td>17" / 19"</td></tr>
<tr><td>Napęd platformy</td><td>Bafang M620</td></tr>
<tr><td>Napięcie platformy</td><td>52 V</td></tr>
<tr><td>Bateria Rexor</td><td>FEB 21700 · 14S4P · 1310,4 Wh (OEM: ok. 1040 Wh)</td></tr>
</tbody>
</table>
<p><strong>„Moc, która nie kończy się tam, gdzie zaczyna się podjazd.”</strong></p>`,
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
    categorySlug: 'gravel',
    eyebrow: 'Karbonowy gravel',
    description: 'Lekka rama T700/T800, prześwit do 700×50 mm i mocowania na wyprawowy osprzęt.',
    descriptionHtml: `<h3>Lekki karbonowy gravel do wszystkiego</h3>
<p><strong>Rexor CFR707</strong> jest zupełnie innym rowerem niż E82 i E55. To lekka karbonowa platforma gravelowa przeznaczona do szybkiej jazdy po asfalcie, szutrach, leśnych drogach i podczas wielodniowych wypraw.</p>
<p>Rama CFR707 została zaprojektowana jako połączenie szybkości roweru szosowego z większą stabilnością, komfortem i miejscem na szerokie opony. Producent klasyfikuje ją jako konstrukcję gravel / adventure / touring.</p>
<h3>Dlaczego CFR707?</h3>
<p>Rama wykonana jest z połączenia włókien <strong>Toray T700 i T800</strong>, a jej masa w rozmiarze M wynosi około <strong>1300 ±50 g</strong>. Karbonowy widelec waży około <strong>590 g</strong>.</p>
<p>CFR707 pozwala zastosować opony aż do <strong>700 × 50C</strong> albo <strong>650B × 2,1"</strong>. To bardzo dużo jak na rower, który nadal zachowuje szosową efektywność.</p>
<p>Duży prześwit daje możliwość zbudowania zarówno szybkiego gravela na oponach 35–40 mm, jak i znacznie bardziej terenowej maszyny na 45–50 mm.</p>
<p>Rama korzysta z prostego i sprawdzonego <strong>gwintowanego suportu BSA 68 mm</strong>, osi 12 × 100 mm z przodu i 12 × 142 mm z tyłu, hamulców Flat Mount oraz haka <strong>UDH</strong>. Wszystkie przewody mogą być poprowadzone wewnątrz ramy.</p>
<p>Do tego dochodzą mocowania pod błotniki i bagażnik, dzięki czemu CFR707 może być zarówno sportowym gravelem, jak i rowerem wyprawowym.</p>
<h3>Dla kogo?</h3>
<p>CFR707 będzie najlepszym wyborem dla osoby, która:</p>
<ul>
<li>jeździ głównie po asfalcie, szutrze i leśnych drogach,</li>
<li>chce lekkiego i szybkiego roweru,</li>
<li>planuje długie trasy i wyprawy,</li>
<li>chce możliwość montażu szerokich opon,</li>
<li>potrzebuje bagażnika lub błotników,</li>
<li>nie potrzebuje pełnego zawieszenia MTB.</li>
</ul>
<h3>Najważniejsze parametry CFR707</h3>
<table>
<thead><tr><th>Parametr</th><th>Rexor CFR707</th></tr></thead>
<tbody>
<tr><td>Typ</td><td>Gravel / Adventure</td></tr>
<tr><td>Materiał</td><td>karbon T700/T800</td></tr>
<tr><td>Masa ramy M</td><td>ok. 1300 ±50 g</td></tr>
<tr><td>Masa widelca</td><td>ok. 590 ±15 g</td></tr>
<tr><td>Koła</td><td>700C / 650B</td></tr>
<tr><td>Maks. opona</td><td>700 × 50C / 650B × 2,1"</td></tr>
<tr><td>Osie</td><td>12 × 100 / 12 × 142 mm</td></tr>
<tr><td>Suport</td><td>gwintowany BSA 68 mm</td></tr>
<tr><td>Hamulce</td><td>Flat Mount</td></tr>
<tr><td>Tarcze</td><td>160 / 180 mm</td></tr>
<tr><td>Hak przerzutki</td><td>UDH</td></tr>
<tr><td>Sztyca</td><td>27,2 mm</td></tr>
<tr><td>Prowadzenie przewodów</td><td>pełne wewnętrzne</td></tr>
<tr><td>Mocowania</td><td>błotniki + bagażnik</td></tr>
<tr><td>Rozmiary</td><td>XS–XXL</td></tr>
<tr><td>Maks. blat 1x</td><td>46T</td></tr>
<tr><td>Maks. korba 2x</td><td>52/36T</td></tr>
</tbody>
</table>
<p><strong>„Asfalt kończy się wcześniej niż możliwości tego roweru.”</strong></p>`,
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
