/**
 * Domyślne teksty statyczne stron publicznych (nawigacja, nagłówki, przyciski,
 * mikroteksty). To jest "kod źródłowy prawdy" - te wartości działają nawet
 * bez wpisu w site_settings. Panel admina (zakładka "Teksty") edytuje
 * nadpisania przechowywane w site_settings pod kluczem 'copy'; efektywny
 * tekst to deepMergeCopy(defaultCopy, nadpisania).
 *
 * Nowe literały tekstowe na stronach publicznych powinny trafiać tutaj,
 * a nie jako string wpisany bezpośrednio w JSX - patrz CLAUDE.md/pamięć
 * projektu o edytowalnych treściach.
 */
export const defaultCopy = {
  nav: {
    rowery: 'Rowery',
    ramy: 'Ramy',
    czesci: 'Części',
    serwis: 'Serwis',
    cta: 'Stwórz własny projekt',
    adminAria: 'Panel administracyjny',
    menuAria: 'Otwórz menu',
  },
  footer: {
    serwis: 'Serwis',
    konfigurator: 'Konfigurator',
    vatNote: 'Ceny brutto',
  },
  home: {
    eyebrow: 'Rexor bikes',
    heroTitle: 'Zbudowany dla Twojej trasy.',
    heroSubtitle: 'Wybierz konstrukcję, dobierz komponenty i zobacz cenę projektu jeszcze przed rozmową z Rexor.',
    heroCta: 'Rozpocznij konfigurację',
    modelsEyebrow: 'Modele startowe',
    modelsTitle: 'Wybierz swoją bazę.',
    modelsAllCta: 'Wszystkie rowery',
    comingSoonBadge: 'W przygotowaniu',
    priceSoon: 'Wkrótce',
    modelLearnMoreCta: 'Poznaj model',
    modelConfigureCta: 'Konfiguruj',
    modelDetailsCta: 'Szczegóły',
    serviceEyebrow: 'Serwis Rexor',
    serviceTitle: 'Opieka po pierwszym kilometrze.',
    serviceText: 'Diagnostyka napędu, regulacja zawieszenia, hamulców i przeglądy okresowe. Zakres zawsze potwierdzamy przed rozpoczęciem prac.',
    serviceCta: 'Sprawdź serwis',
  },
  bikes: {
    eyebrow: 'Rowery Rexor',
    title: 'Trzy różne punkty wyjścia.',
    cardDetailsCta: 'Opis',
    priceSoon: 'Cena w przygotowaniu',
    configureCta: 'Konfiguruj',
    askCta: 'Zapytaj',
  },
  category: {
    eyebrow: 'Kategoria',
    notFoundTitle: 'Nie znaleziono tej kategorii.',
    backToAllCta: 'Zobacz wszystkie rowery',
    emptyModels: 'Ta kategoria nie ma jeszcze przypisanych modeli. Wkrótce się to zmieni.',
  },
  model: {
    breadcrumbHome: 'Rexor',
    breadcrumbBikes: 'Rowery',
    notFoundEyebrow: 'Rower',
    notFoundTitle: 'Nie znaleziono takiego modelu.',
    backToAllCta: 'Zobacz wszystkie rowery',
    configureCta: 'Konfiguruj ten model',
    askCta: 'Zapytaj o dostępność',
    categoryLabelPrefix: 'Kategoria:',
    startPriceLabel: 'Cena wyjściowa',
    priceSoon: 'Wycena w przygotowaniu',
    priceNote: 'Cena brutto wyliczana z sumy ramy, wybranego napędu, baterii, części domyślnych i montażu.',
    descriptionEyebrow: 'Opis i specyfikacja',
    descriptionTitlePrefix: 'Poznaj',
    bannerEyebrow: 'Konfigurator Rexor',
    bannerTitlePrefix: 'Zbuduj swój',
    bannerText: 'Wybierz rozmiar, osprzęt, baterię i dodatki pod swój styl jazdy oraz planowane trasy.',
  },
  frames: {
    eyebrow: 'Ramy',
    title: 'Geometria decyduje o charakterze.',
    factsByModel: [
      ['Karbon T700/T800', 'Skok ramy 170 mm', 'Koła 29 cali', 'Silnik M560'],
      ['Karbon T700/T800', 'Damper 210×55', 'Łącznik 70 mm', 'Silnik M620 CAN'],
      ['Karbon T700/T800', 'BSA 68 mm', 'Opony do 700×50', 'Mocowanie UDH'],
    ] as string[][],
  },
  parts: {
    eyebrow: 'Części',
    title: 'Wybory, które naprawdę zmieniają jazdę.',
    cta: 'Dobierz części w konfiguratorze',
    groups: {
      drive: { name: 'Napęd elektryczny', text: 'Silniki przypisane do ramy, wyświetlacze i ładowarki.' },
      suspension: { name: 'Zawieszenie', text: 'Widelce i dampery w wymiarach zgodnych z geometrią.' },
      brakes: { name: 'Hamulce', text: 'Czterotłoczkowe zestawy i dopasowane tarcze.' },
      mechDrive: { name: 'Napęd mechaniczny', text: 'Deore, CUES i Linkglide przygotowane do obciążeń e-MTB.' },
      wheels: { name: 'Koła i opony', text: 'Koła Boost oraz ogumienie dobrane do terenu.' },
      cockpit: { name: 'Kokpit', text: 'Kierownice, mostki, gripy, sztyce i punkty kontaktu.' },
    },
  },
  service: {
    eyebrow: 'Serwis Rexor',
    title: 'Pewność przed kolejną trasą.',
    subtitle: 'Diagnostyka, regulacja i opieka nad rowerem przed sezonem oraz po wymagających kilometrach.',
    asideTitle: 'Zgłoś rower',
    asideText: 'Opisz model i objawy. Wrócimy z proponowanym terminem oraz zakresem.',
    asideCta: 'Napisz do serwisu',
    asideNote: 'Termin potwierdzamy indywidualnie',
  },
  meta: {
    title: 'Konfigurator rowerów | Rexor Bikes',
    description: 'Zbuduj własny rower Rexor i zapisz konfigurację do późniejszego powrotu.',
  },
};

export type SiteCopy = typeof defaultCopy;

// Overrides z panelu admina są zwykle niepełne (obiekt częściowy) - użytkownik
// mógł edytować tylko część pól albo wpis w site_settings jeszcze nie istnieje.
type DeepPartial<T> = T extends string[] | string ? T : T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;

export function mergeCopy(overrides: DeepPartial<SiteCopy> | null | undefined): SiteCopy {
  return deepMerge(defaultCopy, overrides ?? {}) as SiteCopy;
}

function deepMerge<T>(base: T, override: unknown): T {
  if (Array.isArray(base)) return (Array.isArray(override) ? override : base) as T;
  if (base && typeof base === 'object') {
    const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    const overrideObj = (override && typeof override === 'object' && !Array.isArray(override)) ? (override as Record<string, unknown>) : {};
    for (const key of Object.keys(result)) {
      result[key] = deepMerge(result[key], overrideObj[key]);
    }
    return result as T;
  }
  return (override !== undefined && override !== null ? override : base) as T;
}
