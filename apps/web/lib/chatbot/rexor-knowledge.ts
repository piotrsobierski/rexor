import { fetchCatalog, fetchPage } from '@/lib/server-catalog';
import { computeRangeEstimates, computeBatteryEstimates, formatWh, formatWeightKg } from '@/lib/battery';
import { formatPrice } from '@/lib/catalog';

/**
 * POBIERANIE WIEDZY BEZPOŚREDNIO Z BAZY DANYCH (API KATALOGU I STRON).
 *
 * Brak dodatkowego ręcznego pliku do utrzymywania:
 * 1. Modele, ceny bazowe, marże i ramy pobierane są na żywo z bazy.
 * 2. Pakiety akumulatorowe (Ah, Wh, konfiguracje SxP, ceny) pobierane są z tabeli model_batteries.
 * 3. Zasięgi i wagi pakietów wyliczane są automatycznie wzorami technicznymi Rexor z parametrów w bazie.
 * 4. Grupy części, opcje, cenniki i reguły części klienta pobierane są z tabeli parts i model_parts.
 * 5. Informacje o serwisie pobierane są z tabeli site_pages.
 */

let cachedKnowledgePrompt: { prompt: string; timestamp: number } | null = null;
const CACHE_TTL_MS = 30_000; // 30 sekund cache, żeby nie obciążać bazy przy każdym tokenie, a zmiany w panelu widać od razu

export async function getLiveRexorKnowledgePrompt(): Promise<string> {
  const now = Date.now();
  if (cachedKnowledgePrompt && now - cachedKnowledgePrompt.timestamp < CACHE_TTL_MS) {
    return cachedKnowledgePrompt.prompt;
  }

  try {
    const catalog = await fetchCatalog();
    const servicePage = await fetchPage('serwis').catch(() => null);

    if (!catalog || !catalog.models || catalog.models.length === 0) {
      throw new Error('Katalog z bazy danych jest pusty lub niedostępny.');
    }

    const sections: string[] = [];

    sections.push(`Jesteś oficjalnym doradcą technicznym AI marki Rexor Bikes (Rexor AI Advisor).
Twoja rola: Pomagasz klientom w wyborze modelu, dopasowaniu baterii, silnika, części, zrozumieniu zasięgów i cen.
Wszystkie poniższe informacje pochodzą BEZPOŚREDNIO Z AKTUALNEJ BAZY DANYCH I CENNIKA REXOR BIKES (stan na teraz).

ZASADY:
- Odpowiadaj zawsze precyzyjnie, profesjonalnie i po polsku.
- Podawaj zawsze aktualne ceny z poniższej bazy (wszystkie kwoty to ceny brutto z 23% VAT).
- Używaj czytelnego formatowania Markdown (pogrubienia, punktorowe listy, tabelki porównawcze).
- Zawsze możesz wskazać linki do konfiguratora: [Konfigurator](/konfigurator) oraz [Modele](/rowery).
- Informuj klientów o możliwości dostarczenia własnych części (np. widelca czy hamulców), jeśli baza na to zezwala.`);

    // 1. KATEGORIE Z BAZY
    if (catalog.categories && catalog.categories.length > 0) {
      const catList = catalog.categories.map((c) => `- **${c.name}** (slug: ${c.slug}): ${c.short_description || ''}`).join('\n');
      sections.push(`\n### KATEGORIE ROWERÓW W BAZIE:\n${catList}`);
    }

    // 2. MODELE I ICH PEŁNA SPECYFIKACJA Z BAZY
    sections.push('\n### MODELE ROWERÓW Z BAZY DANYCH:');

    for (const model of catalog.models) {
      const modelLines: string[] = [];
      const priceText = model.basePrice ? `${formatPrice(model.basePrice)} brutto` : 'Wycena indywidualna / w przygotowaniu';
      modelLines.push(`\n#### MODEL: ${model.name} (id: ${model.id})`);
      modelLines.push(`- Kategoria: ${model.category} (${model.categorySlug})`);
      modelLines.push(`- Aktualna cena bazowa w systemie: ${priceText}`);
      modelLines.push(`- Opis: ${model.description}`);
      if (model.framePriceGross) modelLines.push(`- Cena samej ramy: ${formatPrice(model.framePriceGross)}`);
      if (model.assemblyPriceGross) modelLines.push(`- Koszt montażu w cenie: ${formatPrice(model.assemblyPriceGross)}`);

      // Specyfikacje ramy/silnika z bazy
      if (model.motor) modelLines.push(`- Napęd / silnik: ${model.motor}`);

      // Rozmiary z bazy
      if (model.sizes && model.sizes.length > 0) {
        const sizesList = model.sizes
          .map((s) => `${s.label}${s.priceDelta ? ` (+${formatPrice(s.priceDelta)})` : ''}`)
          .join(', ');
        modelLines.push(`- Dostępne rozmiary: ${sizesList}`);
      }

      // Pakiety baterii z bazy + wyliczone zasięgi i wagi
      if (model.batteries && model.batteries.length > 0) {
        modelLines.push('- Pakiety akumulatorowe w ofercie dla tego modelu:');
        for (const bat of model.batteries) {
          const estimates = computeBatteryEstimates({
            cellFormat: (bat as unknown as { cellFormat?: string }).cellFormat || '18650',
            seriesCount: (bat as unknown as { seriesCount?: number }).seriesCount,
            parallelCount: (bat as unknown as { parallelCount?: number }).parallelCount,
            cellCapacityAh: (bat as unknown as { cellCapacityAh?: number }).cellCapacityAh,
            nominalVoltageV: (bat as unknown as { nominalVoltageV?: number }).nominalVoltageV,
            chargeVoltageV: (bat as unknown as { chargeVoltageV?: number }).chargeVoltageV,
          }, model.id);

          const ranges = computeRangeEstimates(bat.energyWh);
          const rangeSummary = ranges.length > 0
            ? ranges.map((r) => `${r.mode} (${r.condition}): ${r.rangeMinKm}–${r.rangeMaxKm} km`).join('; ')
            : 'brak danych';

          const defaultLabel = bat.isDefault ? ' [DOMYŚLNY W CENIE BAZOWEJ]' : '';
          modelLines.push(`  * **${bat.name}**${defaultLabel}:`);
          modelLines.push(`    - Pojemność i energia: ${bat.capacityAh} Ah, ${formatWh(bat.energyWh)}`);
          modelLines.push(`    - Cena pakietu w cenniku: ${formatPrice(bat.grossPrice)}`);
          if (estimates.estimatedTotalPackWeightKg > 0) {
            modelLines.push(`    - Szacunkowa masa gotowego pakietu z BMS i instalacją: ${formatWeightKg(estimates.estimatedTotalPackWeightKg)}`);
          }
          modelLines.push(`    - Realne zasięgi wg profili obciążenia: ${rangeSummary}`);
        }
      } else {
        modelLines.push('- Zasilanie: brak baterii elektrycznej (model analogowy)');
      }

      // Grupy komponentów i opcje wyboru z bazy
      if (model.groups && model.groups.length > 0) {
        modelLines.push('- Podzespoły i opcje konfiguracyjne z bazy części:');
        for (const group of model.groups) {
          const optionsList = group.options
            .map((opt) => {
              const def = opt.isDefault ? ' [DOMYŚLNY W BAZIE]' : '';
              const pr = opt.price !== null ? formatPrice(opt.price) : 'wycena';
              return `${opt.name} (${pr})${def}`;
            })
            .join(', ');

          let groupInfo = `  * Grupa "${group.name}": ${optionsList || 'Brak wymiennych pozycji'}`;
          if (group.customerPartAllowed) {
            groupInfo += ` | [DOZWOLONA WŁASNA CZĘŚĆ KLIENTA - cena klienta: ${formatPrice(group.customerPartGrossPrice)}]`;
          }
          if (group.helper) {
            groupInfo += ` (Uwaga: ${group.helper})`;
          }
          modelLines.push(groupInfo);
        }
      }

      sections.push(modelLines.join('\n'));
    }

    // 3. SZCZEGÓŁOWE INFORMACJE O ZASIĘGACH NA WATOGODZINĘ (Wh/km) I FIZYCE PAKIETÓW
    sections.push(`
### DOKŁADNA WIEDZA O ZASIĘGACH NA WATOGODZINĘ (Wh/km) I ZUŻYCIU ENERGII:

1. Jak obliczany jest zasięg e-bike'a:
   * Wzór podstawowy: Zasięg (km) = Energia baterii (Wh) / Średnie zużycie (Wh/km).
   * Energia pakietu: Watogodziny (Wh) = Napięcie nominalne pakietu (V) × Pojemność w amperogodzinach (Ah).
     Np. pakiet 13S6P (46,8 V × 21 Ah = 982,8 Wh).
     Np. pakiet 14S4P (50,4 V × 26 Ah = 1 310,4 Wh).

2. Profile zużycia energii na kilometr (Wh/km) w silnikach centralnych Bafang (M560 / M620):
   * Tryb ECO (asfalt, płaski teren, wysoki wkład własny rowerzysty): 4 – 7 Wh/km.
     - Przykładowy zasięg z pakietu 982 Wh: 140 – 246 km!
     - Przykładowy zasięg z pakietu 1310 Wh: 187 – 328 km!
   * Tryb ECO (MTB, pagórki, szuter, leśne ścieżki): 7 – 10 Wh/km.
     - Z pakietu 982 Wh: 98 – 140 km.
     - Z pakietu 1310 Wh: 131 – 187 km.
   * Tryb TOUR / TRAIL (teren mieszany, pagórki, umiarkowane wspomaganie): 8 – 13 Wh/km.
     - Z pakietu 982 Wh: 76 – 123 km.
     - Z pakietu 1310 Wh: 101 – 164 km.
   * Tryb eMTB / AUTO (dynamiczna jazda w trudnym terenie górskim, częste podjazdy): 10 – 16 Wh/km.
     - Z pakietu 982 Wh: 61 – 98 km.
     - Z pakietu 1310 Wh: 82 – 131 km.
   * Tryb BOOST / TURBO (stromy podjazd w górach, ciężki teren, maksymalna moc silnika): 14 – 22 Wh/km.
     - Z pakietu 982 Wh: 45 – 70 km.
     - Z pakietu 1310 Wh: 60 – 94 km.

3. Kluczowe czynniki wpływające na zużycie watogodzin i zasięg:
   * Przewyższenia (wzniesienia): Na każde 1000 metrów podjazdu w pionie przy mocnym wspomaganiu silnik pochłania dodatkowo ok. 250–350 Wh energii.
   * Masa zestawu: Rowerzysta + rower + ekwipunek. Każde dodatkowe 10 kg masy zwiększa zużycie energii o ok. 5–8% na podjazdach.
   * Kadencja pedałowania: Silniki Bafang M560 i M620 mają najwyższą sprawność (ponad 82%) przy kadencji 75–90 RPM. Zbyt niska kadencja (<55 RPM) pod górę przy wysokim biegu zamienia energię z baterii w ciepło zamiast w zasięg!
   * Temperatura otoczenia: W temperaturach poniżej 5°C ogniwa litowo-jonowe mają wyższy opór wewnętrzny, co może skrócić zasięg zimowy o 15–20% (warto przechowywać baterię w temperaturze pokojowej przed jazdą).
   * Opony i ciśnienie: Szerokie agresywne opony 2,6" z niskim ciśnieniem na asfalcie mają wyższe opory toczenia niż na leśnym podłożu.
`);

    // 4. INFORMACJE O SERWISIE Z BAZY
    if (servicePage) {
      sections.push(`\n### INFORMACJE O SERWISIE REXOR Z BAZY:
Tytuł: ${servicePage.title}
Zajawka: ${servicePage.excerpt || ''}
Treść: ${servicePage.content_html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}`);
    }

    // 5. POLITYKA CZĘŚCI I KONFIGURATORA
    sections.push(`\n### ZASADY KONFIGURATORA I CZĘŚCI KLIENTA:
- Klient może skonfigurować rower na żywo pod adresem: /konfigurator?model={model_id}
- Jeżeli grupa części dopuszcza "część klienta", klient może przysłać np. swój ulubiony amortyzator lub damper, a cena domyślnej części zostanie odliczona z ceny roweru do 0 zł!
- Rexor montuje podzespoły klienta bez dodatkowej opłaty w ramach budowy roweru.`);

    const compiledPrompt = sections.join('\n\n');
    cachedKnowledgePrompt = { prompt: compiledPrompt, timestamp: now };
    return compiledPrompt;
  } catch (error) {
    console.error('[Rexor Chatbot] Błąd pobierania wiedzy z bazy danych:', error);
    // W ostateczności zwróć podstawowy prompt z informacją o błędzie połączenia z bazą
    return `Jesteś doradcą technicznym marki Rexor Bikes. Baza danych katalogu jest obecnie w trakcie odświeżania. Zaproś użytkownika do kontaktu lub skorzystania z konfiguratora na stronie /konfigurator.`;
  }
}
