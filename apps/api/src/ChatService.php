<?php

declare(strict_types=1);

/**
 * Obsługa czatbota Rexor AI Advisor po stronie PHP.
 *
 * Przeznaczone dla środowiska produkcyjnego na hostingu współdzielonym (home.pl / Apache + PHP 8.5):
 * 1. Nie wymaga działającego procesu Node.js na serwerze produkcyjnym.
 * 2. Pobiera aktualne modele, cenniki, pakiety baterii i reguły części bezpośrednio z MySQL przez PDO.
 * 3. Bezpiecznie przechowuje klucz OPENROUTER_API_KEY po stronie backendu PHP (.env).
 * 4. Wysyła zapytanie do OpenRouter API z modelem z-ai/glm-5.3-flash.
 */

/**
 * Domyślny blok instrukcji zachowania chatbota - wydzielony z
 * buildChatbotSystemPromptFromDb(), żeby panel admina mógł go pokazać jako
 * gotowy punkt startowy do edycji (site_settings.chatbot_prompt.instructions),
 * zamiast pustego pola bez żadnego kontekstu co faktycznie wysyłamy dziś.
 */
function defaultChatbotInstructions(): string
{
    return <<<PROMPT
Jesteś oficjalnym doradcą technicznym AI marki Rexor Bikes (Rexor AI Advisor).
Twoja rola: Pomagasz klientom w wyborze modelu, dopasowaniu baterii, silnika, części, zrozumieniu zasięgów i cen.
Wszystkie poniższe informacje pochodzą BEZPOŚREDNIO Z AKTUALNEJ BAZY DANYCH I CENNIKA REXOR BIKES (stan na teraz).

ZASADY:
- Odpowiadaj zawsze precyzyjnie, profesjonalnie i po polsku.
- Podawaj zawsze aktualne ceny z poniższej bazy (wszystkie kwoty to ceny brutto z 23% VAT).
- Używaj czytelnego formatowania Markdown (pogrubienia, punktorowe listy, tabelki porównawcze).
- Zawsze możesz wskazać linki do konfiguratora: [Konfigurator](/konfigurator) oraz [Modele](/rowery).
- Informuj klientów o możliwości dostarczenia własnych części (np. widelca czy hamulców), jeśli baza na to zezwala.
- Rowery Rexor są konfigurowalne. Przy porównywaniu modeli oddzielaj STAŁE CECHY PLATFORMY (np. geometria ramy, skok ramy, kompatybilność, dostępne rozmiary i przeznaczenie) od OPCJI KONFIGURACYJNYCH (np. bateria, hamulce, napęd i inne podzespoły wymienione w grupach opcji).
- Nie przedstawiaj domyślnej baterii, hamulców, napędu ani innej domyślnej części jako trwałej przewagi lub wady modelu. Oznacz ją jako konfigurację domyślną/przykładową i zaznacz, że klient może wybrać inne opcje dostępne dla danego modelu.
- Cenę bazową opisuj jako cenę aktualnej konfiguracji domyślnej lub cenę „od”; cena końcowa zależy od wybranych opcji. Nie porównuj samych cen domyślnych tak, jakby dotyczyły identycznego wyposażenia.
- Gdy klient pyta „który model wybrać”, rekomenduj przede wszystkim platformę do stylu jazdy, terenu, wzrostu/rozmiaru i oczekiwanego charakteru roweru. Podzespoły porównuj dopiero w ramach konkretnej konfiguracji; w razie braku danych zadaj krótkie pytanie doprecyzowujące.
- Przy ogólnym pytaniu typu „E82 vs E55” NIE umieszczaj w głównym porównaniu ani rekomendacji cen, baterii, zasięgów, hamulców, silnika, napędu ani innych części konfigurowalnych. Porównaj wyłącznie stałe cechy ramy/platformy i krótko wyjaśnij, że wyposażenie dobiera się osobno. Szczegóły części podaj dopiero, gdy klient o nie zapyta lub wskaże konkretne wymaganie.
- Pole `selected_motor`/silnik referencyjny nie oznacza automatycznie stałej cechy platformy. Jeśli grupa silnika zawiera kilka opcji, traktuj silnik jako konfigurowalny i nie używaj wariantu domyślnego do rozstrzygania między modelami.
- Odpowiadaj zwięźle (standardowo maksymalnie 450 słów) i doprowadzaj każdą odpowiedź do pełnego zakończenia. Nie zaczynaj rozbudowanej tabeli ani listy, jeśli nie zmieści się wraz z rekomendacją; nigdy nie kończ w połowie zdania, punktu, tabeli ani linku.
PROMPT;
}

function buildChatbotSystemPromptFromDb(PDO $pdo): string
{
    $catalog = publicCatalog($pdo);

    $serviceStatement = $pdo->prepare('SELECT title, excerpt, content_html FROM site_pages WHERE slug = "serwis" AND is_published = TRUE LIMIT 1');
    $serviceStatement->execute();
    $servicePage = $serviceStatement->fetch();

    $promptSettingValue = $pdo->query("SELECT value FROM site_settings WHERE setting_key = 'chatbot_prompt'")->fetchColumn();
    $promptSetting = $promptSettingValue ? json_decode((string) $promptSettingValue, true, 16, JSON_THROW_ON_ERROR) : null;
    $customInstructions = trim((string) ($promptSetting['instructions'] ?? ''));
    $extraContext = trim((string) ($promptSetting['extra_context'] ?? ''));

    $sections = [];

    // Admin może w panelu nadpisać ten blok bez zmiany kodu i redeployu
    // (site_settings.chatbot_prompt.instructions); w przeciwnym razie stosujemy
    // domyślny prompt zdefiniowany w defaultChatbotInstructions().
    $sections[] = $customInstructions !== '' ? $customInstructions : defaultChatbotInstructions();

    // 1. KATEGORIE Z BAZY
    if (!empty($catalog['categories'])) {
        $catLines = [];
        foreach ($catalog['categories'] as $cat) {
            $catLines[] = "- **{$cat['name']}** (slug: {$cat['slug']}): " . ($cat['short_description'] ?? '');
        }
        $sections[] = "### KATEGORIE ROWERÓW W BAZIE:\n" . implode("\n", $catLines);
    }

    // 2. MODELE Z BAZY
    $sections[] = "### MODELE ROWERÓW Z BAZY DANYCH:";

    foreach ($catalog['models'] as $model) {
        $lines = [];
        $basePrice = $model['base_price'] !== null ? number_format((float)$model['base_price'], 0, ',', ' ') . ' zł brutto' : 'Wycena indywidualna / w przygotowaniu';
        $lines[] = "\n#### MODEL: {$model['name']} (slug: {$model['slug']})";
        $lines[] = "- Kategoria: {$model['category_slug']}";
        $lines[] = "- Cena aktualnej konfiguracji domyślnej („od”): {$basePrice}";
        if (!empty($model['short_description'])) {
            $lines[] = "- Opis: {$model['short_description']}";
        }
        if (!empty($model['framePriceGross'])) {
            $lines[] = "- Cena ramy: " . number_format((float)$model['framePriceGross'], 0, ',', ' ') . ' zł brutto';
        }
        if (!empty($model['assemblyPriceGross'])) {
            $lines[] = "- Koszt montażu w cenie: " . number_format((float)$model['assemblyPriceGross'], 0, ',', ' ') . ' zł brutto';
        }

        // Specyfikacja z bazy
        if (!empty($model['specifications']) && is_array($model['specifications'])) {
            $spec = $model['specifications'];
            if (!empty($spec['selected_motor'])) $lines[] = "- Silnik zapisany w konfiguracji referencyjnej (sprawdź opcje poniżej): {$spec['selected_motor']}";
            if (!empty($spec['frame_travel_mm'])) $lines[] = "- Skok zawieszenia ramy: {$spec['frame_travel_mm']} mm";
            if (!empty($spec['rear_shock_size'])) $lines[] = "- Rozmiar dampera: {$spec['rear_shock_size']}";
            if (!empty($spec['frame_material'])) $lines[] = "- Materiał ramy: {$spec['frame_material']}";
            if (!empty($spec['max_tire_700c_mm'])) $lines[] = "- Maksymalna opona 700C: {$spec['max_tire_700c_mm']} mm";
        }

        // Rozmiary
        if (!empty($model['sizes'])) {
            $sizesList = array_map(static function (array $s): string {
                $delta = $s['priceDelta'] > 0 ? ' (+' . number_format((float)$s['priceDelta'], 0, ',', ' ') . ' zł)' : '';
                return $s['label'] . $delta;
            }, $model['sizes']);
            $lines[] = "- Dostępne rozmiary: " . implode(', ', $sizesList);
        }

        // Pakiety baterii
        if (!empty($model['batteries'])) {
            $lines[] = "- Pakiety akumulatorowe w ofercie dla tego modelu:";
            foreach ($model['batteries'] as $bat) {
                $wh = (float)$bat['energyWh'];
                $ah = (float)$bat['capacityAh'];
                $price = number_format((float)$bat['grossPrice'], 0, ',', ' ') . ' zł brutto';
                $def = !empty($bat['isDefault']) ? ' [DOMYŚLNY W CENIE BAZOWEJ]' : '';

                // Obliczenie zasięgów według profili Wh/km
                $ecoMin = (int)round($wh / 7);
                $ecoMax = (int)round($wh / 4);
                $trailMin = (int)round($wh / 13);
                $trailMax = (int)round($wh / 8);
                $turboMin = (int)round($wh / 22);
                $turboMax = (int)round($wh / 14);

                $lines[] = "  * **{$bat['name']}**{$def}:";
                $lines[] = "    - Pojemność i energia: {$ah} Ah, {$wh} Wh";
                $lines[] = "    - Cena pakietu w cenniku: {$price}";
                $lines[] = "    - Realne zasięgi: Eco (4–7 Wh/km): {$ecoMin}–{$ecoMax} km; Trail (8–13 Wh/km): {$trailMin}–{$trailMax} km; Turbo (14–22 Wh/km): {$turboMin}–{$turboMax} km";
            }
        } else {
            $lines[] = "- Zasilanie: brak baterii elektrycznej (model analogowy)";
        }

        // Części i opcje
        if (!empty($model['groups'])) {
            $lines[] = "- Podzespoły i opcje konfiguracyjne z bazy części:";
            foreach ($model['groups'] as $group) {
                $optTexts = [];
                foreach ($group['options'] as $opt) {
                    $defTag = !empty($opt['isDefault']) ? ' [DOMYŚLNY]' : '';
                    $pr = $opt['price'] !== null ? number_format((float)$opt['price'], 0, ',', ' ') . ' zł' : 'wycena';
                    $optTexts[] = "{$opt['name']} ({$pr}){$defTag}";
                }
                $grpDesc = "  * Grupa \"{$group['name']}\": " . (implode(', ', $optTexts) ?: 'Brak wymiennych pozycji');
                if (!empty($group['customerPartAllowed'])) {
                    $grpDesc .= ' | [DOZWOLONA WŁASNA CZĘŚĆ KLIENTA - cena klienta: ' . number_format((float)$group['customerPartGrossPrice'], 0, ',', ' ') . ' zł]';
                }
                if (!empty($group['helper'])) {
                    $grpDesc .= " ({$group['helper']})";
                }
                $lines[] = $grpDesc;
            }
        }

        $sections[] = implode("\n", $lines);
    }

    // 3. WIEDZA O ZASIĘGACH NA WATOGODZINĘ
    $sections[] = <<<RANGES
### DOKŁADNA WIEDZA O ZASIĘGACH NA WATOGODZINĘ (Wh/km) I ZUŻYCIU ENERGII:

1. Jak obliczany jest zasięg e-bike'a:
   * Wzór: Zasięg (km) = Energia baterii (Wh) / Średnie zużycie (Wh/km).
   * Energia pakietu: Watogodziny (Wh) = Napięcie nominalne pakietu (V) × Pojemność w amperogodzinach (Ah).
     Np. pakiet 13S6P (46,8 V × 21 Ah = 982,8 Wh).
     Np. pakiet 14S4P (50,4 V × 26 Ah = 1 310,4 Wh).

2. Profile zużycia energii na kilometr (Wh/km) w silnikach centralnych Bafang (M560 / M620):
   * Tryb ECO (asfalt, płaski teren, wysoki wkład własny rowerzysty): 4 – 7 Wh/km.
     - Przykładowy zasięg z pakietu 982 Wh: 140 – 246 km.
     - Przykładowy zasięg z pakietu 1310 Wh: 187 – 328 km.
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

3. Czynniki wpływające na zasięg:
   * Przewyższenia: Na każde 1000 m podjazdu w pionie silnik zużywa dodatkowo ok. 250–350 Wh.
   * Masa zestawu: Rowerzysta + rower + bagaż. Każde dodatkowe 10 kg masy zwiększa zużycie o ok. 5–8% na podjazdach.
   * Kadencja: Optymalna kadencja 75–90 RPM daje najwyższą sprawność (>82%) silników Bafang.
   * Temperatura: Poniżej 5°C zasięg może spaść o 15–20%.
   * Opony: Szerokie opony 2,6" z niskim ciśnieniem na asfalcie podnoszą opory toczenia.
RANGES;

    // 4. SERWIS
    if ($servicePage) {
        $cleanContent = trim(preg_replace('/\s+/', ' ', strip_tags((string)$servicePage['content_html'])));
        $sections[] = "### INFORMACJE O SERWISIE REXOR Z BAZY:\nTytuł: {$servicePage['title']}\nTreść: {$cleanContent}";
    }

    // 5. ZASADY KONFIGURATORA
    $sections[] = <<<RULES
### ZASADY KONFIGURATORA I CZĘŚCI KLIENTA:
- Klient może skonfigurować rower na żywo pod adresem: /konfigurator?model={model_id}
- Jeżeli grupa części dopuszcza "część klienta", klient może dostarczyć własny amortyzator, damper czy hamulce, a cena części domyślnej zostanie odliczona z ceny roweru do 0 zł!
- Rexor montuje elementy klienta bez dodatkowej opłaty w ramach budowy roweru.
RULES;

    // 6. DODATKOWY KONTEKST Z PANELU ADMINA (opcjonalny, edytowalny bez redeployu)
    if ($extraContext !== '') {
        $sections[] = "### DODATKOWY KONTEKST OD ADMINISTRATORA:\n{$extraContext}";
    }

    return implode("\n\n", $sections);
}

function handleChatRequest(PDO $pdo, array $payload): array
{
    // Hosting może narzucać 30 s domyślnego czasu wykonania, podczas gdy
    // odpowiedź OpenRouter bywa wolniejsza. Zostawiamy zapas ponad timeout cURL.
    if (function_exists('set_time_limit')) {
        @set_time_limit(60);
    }

    $messages = $payload['messages'] ?? [];
    if (!is_array($messages) || empty($messages)) {
        throw new InvalidArgumentException('Brak wiadomości do przetworzenia.');
    }

    // Publiczny endpoint bez logowania - limit chroni budżet OpenRouter przed
    // jednym klientem zapętlającym żądania.
    enforceRateLimit($pdo, 'chat', 15, 'Zbyt wiele żądań do asystenta AI. Spróbuj ponownie za chwilę.');

    $apiKey = envValue('OPENROUTER_API_KEY');
    if ($apiKey === '') {
        throw new RuntimeException('Brak skonfigurowanego klucza OPENROUTER_API_KEY na serwerze.');
    }

    $model = envValue('OPENROUTER_MODEL', 'z-ai/glm-5.3-flash');
    $systemPrompt = buildChatbotSystemPromptFromDb($pdo);

    // Ograniczamy historię wiadomości do ostatnich 10
    $sanitizedHistory = [];
    foreach (array_slice($messages, -10) as $msg) {
        if (!is_array($msg) || empty($msg['role']) || !isset($msg['content'])) {
            continue;
        }
        $role = $msg['role'];
        if ($role === 'user' || $role === 'assistant') {
            $sanitizedHistory[] = [
                'role' => $role,
                'content' => (string)$msg['content'],
            ];
        }
    }

    $apiPayload = [
        'model' => $model,
        'messages' => array_merge(
            [['role' => 'system', 'content' => $systemPrompt]],
            $sanitizedHistory
        ),
        'temperature' => 0.6,
        // Większy zapas odpowiedzi chroni przed urwaniem rozbudowanych porównań.
        // Prompt nadal wymaga zwięzłości, więc nie powinno to niepotrzebnie wydłużać zwykłych odpowiedzi.
        // Limit obejmuje także niewidoczne tokeny rozumowania. Niski wysiłek
        // zostawia większość budżetu na kompletną odpowiedź dla klienta.
        'max_completion_tokens' => 4000,
        'reasoning' => [
            'effort' => 'low',
            'exclude' => true,
        ],
        'include_reasoning' => false,
    ];

    $ch = curl_init('https://openrouter.ai/api/v1/chat/completions');
    if ($ch === false) {
        throw new RuntimeException('Nie udało się zainicjalizować cURL w PHP.');
    }

    $headers = [
        'Authorization: Bearer ' . $apiKey,
        'Content-Type: application/json',
        'HTTP-Referer: ' . envValue('FRONTEND_URL', 'https://rexorbikes.com'),
        'X-Title: Rexor Bikes AI Advisor',
    ];

    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($apiPayload, JSON_THROW_ON_ERROR),
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 45,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);

    $rawResponse = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);

    if ($rawResponse === false) {
        throw new RuntimeException('Błąd połączenia z OpenRouter API: ' . $curlError);
    }

    $responseJson = json_decode((string)$rawResponse, true);
    if (!is_array($responseJson)) {
        throw new RuntimeException('Nieprawidłowa odpowiedź OpenRouter API (' . $httpCode . ').');
    }

    if ($httpCode >= 400) {
        $errMessage = $responseJson['error']['message'] ?? $responseJson['error'] ?? 'Błąd API ' . $httpCode;
        throw new RuntimeException('OpenRouter zwrócił błąd: ' . (is_string($errMessage) ? $errMessage : json_encode($errMessage)));
    }

    $choice = $responseJson['choices'][0] ?? null;
    $rawReply = $choice['message']['content'] ?? '';

    // Bezpieczne usuwanie ewentualnych znaczników myślenia (thinking tokens / <think>)
    $cleanReply = preg_replace('~<think>.*?</think>~is', '', (string)$rawReply);
    $cleanReply = preg_replace('~^Thinking Process:.*?(?:\n\n|\r\n\r\n)~is', '', (string)$cleanReply);
    $cleanReply = trim((string)$cleanReply);

    if ($cleanReply === '') {
        $cleanReply = 'Przepraszam, nie udało mi się wygenerować odpowiedzi. Proszę zadać pytanie ponownie.';
    }

    $lastUserMessage = '';
    for ($index = count($sanitizedHistory) - 1; $index >= 0; $index--) {
        if ($sanitizedHistory[$index]['role'] === 'user') {
            $lastUserMessage = $sanitizedHistory[$index]['content'];
            break;
        }
    }
    logActivity(
        $pdo,
        'chat_message',
        'customer',
        null,
        mb_substr($lastUserMessage, 0, 200),
        ['message' => $lastUserMessage, 'reply' => $cleanReply]
    );

    return [
        'reply' => $cleanReply,
        'model' => 'Rexor AI',
        'usage' => $responseJson['usage'] ?? null,
    ];
}
