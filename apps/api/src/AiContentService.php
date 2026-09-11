<?php

declare(strict_types=1);

/**
 * Edycja treści WYSIWYG (HTML) w panelu admina poleceniem w języku naturalnym,
 * np. "zrób z tych punktów tabelę". Model dostaje aktualną zawartość pola i
 * polecenie, zwraca kompletny poprawiony fragment HTML tego samego pola — nie
 * różnicę i nie komentarz. Wynik zawsze przechodzi przez ten sam sanityzer co
 * ręczny zapis (sanitizeRichHtml), więc niezależnie od tego, co zwróci model,
 * nie trafią do bazy znaczniki ani atrybuty spoza dozwolonej listy. Panel
 * admina i tak pokazuje wynik jako propozycję do zatwierdzenia, a zapis do
 * bazy nadal wymaga osobnego kliknięcia „Zapisz”.
 */
function aiEditRichContent(PDO $pdo, array $input): array
{
    $currentHtml = trim((string) ($input['html'] ?? ''));
    $instruction = trim((string) ($input['instruction'] ?? ''));

    // Endpoint wymaga już zalogowanego admina, ale limit i tak chroni budżet
    // OpenRouter przed jednym skryptem odpalonym w pętli z jednego IP.
    enforceRateLimit($pdo, 'ai-rich-content', 20, 'Zbyt wiele żądań do asystenta AI. Spróbuj ponownie za chwilę.');

    if ($instruction === '') {
        throw new InvalidArgumentException('Podaj polecenie dla asystenta AI.');
    }
    if (mb_strlen($instruction) > 1000) {
        throw new InvalidArgumentException('Polecenie jest za długie (maks. 1000 znaków).');
    }
    if (mb_strlen($currentHtml) > 20000) {
        throw new InvalidArgumentException('Treść pola jest za długa dla edycji przez AI (maks. 20000 znaków).');
    }

    $apiKey = envValue('OPENROUTER_API_KEY');
    if ($apiKey === '') {
        throw new RuntimeException('Brak skonfigurowanego klucza OPENROUTER_API_KEY na serwerze.');
    }
    $model = envValue('OPENROUTER_MODEL', 'z-ai/glm-5.3-flash');

    $systemPrompt = <<<PROMPT
Jesteś asystentem redakcyjnym edytora treści WYSIWYG w panelu administracyjnym
sklepu z rowerami elektrycznymi Rexor Bikes. Dostajesz AKTUALNĄ zawartość pola
jako HTML oraz polecenie administratora w języku naturalnym (np. "zrób z tych
punktów tabelę", "dodaj wiersz z szacowaną prędkością", "skróć ten akapit").

ZASADY:
- Zwróć WYŁĄCZNIE poprawiony fragment HTML całego pola — nic więcej. Bez
  komentarzy, bez wyjaśnień, bez znaczników markdown (np. bez ```html). Bez
  <html>, <head> ani <body> — tylko treść, która trafi bezpośrednio do
  edytowalnego <div>.
- Wynik musi być kompletną, poprawioną treścią całego pola (nie różnicą ani
  samym dodanym fragmentem) — zastępuje dotychczasową zawartość pola.
- Zachowaj wszystkie informacje z oryginału, których polecenie nie dotyczy.
- Nie wymyślaj danych liczbowych (cen, zasięgów, parametrów technicznych),
  których nie dało się wywnioskować z oryginału ani z polecenia. Jeśli
  polecenie prosi o dane, których nie znasz, zostaw w tym miejscu wyraźny,
  czytelny placeholder tekstowy zamiast zmyślonej liczby.
- Używaj wyłącznie tych znaczników HTML: p, br, h2, h3, h4, strong, em, ul,
  ol, li, blockquote, a, img, table, thead, tbody, tfoot, tr, th, td, span,
  hr. Tabelę buduj jako <table><thead><tr><th>...</th></tr></thead><tbody>
  <tr><td>...</td></tr></tbody></table>.
- Pisz po polsku, w stylu zgodnym z oryginalną treścią.
PROMPT;

    $userPrompt = "AKTUALNA TREŚĆ POLA (HTML):\n" . ($currentHtml !== '' ? $currentHtml : '(puste pole)') .
        "\n\nPOLECENIE:\n" . $instruction;

    $apiPayload = [
        'model' => $model,
        'messages' => [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => $userPrompt],
        ],
        'temperature' => 0.3,
        'max_completion_tokens' => 2000,
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

    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($apiPayload, JSON_THROW_ON_ERROR),
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $apiKey,
            'Content-Type: application/json',
            'HTTP-Referer: ' . envValue('FRONTEND_URL', 'https://rexorbikes.com'),
            'X-Title: Rexor Bikes Admin AI Editor',
        ],
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

    $responseJson = json_decode((string) $rawResponse, true);
    if (!is_array($responseJson)) {
        throw new RuntimeException('Nieprawidłowa odpowiedź OpenRouter API (' . $httpCode . ').');
    }
    if ($httpCode >= 400) {
        $errMessage = $responseJson['error']['message'] ?? $responseJson['error'] ?? ('Błąd API ' . $httpCode);
        throw new RuntimeException('OpenRouter zwrócił błąd: ' . (is_string($errMessage) ? $errMessage : json_encode($errMessage)));
    }

    $rawReply = (string) ($responseJson['choices'][0]['message']['content'] ?? '');
    $cleanReply = trim($rawReply);
    // Model czasem mimo instrukcji owija wynik w blok kodu markdown.
    $cleanReply = (string) preg_replace('~^```(?:html)?\s*~i', '', $cleanReply);
    $cleanReply = (string) preg_replace('~```\s*$~', '', $cleanReply);
    $cleanReply = trim($cleanReply);

    // Ten sam sanityzer co ręczny zapis pola — niezależny drugi gate na to,
    // co może trafić do treści strony, niezależnie od tego, co zwróci model.
    $sanitized = sanitizeRichHtml($cleanReply);

    if (trim(strip_tags($sanitized)) === '' && trim(strip_tags($currentHtml)) !== '') {
        throw new RuntimeException('Asystent AI nie zwrócił poprawnej treści. Spróbuj sformułować polecenie inaczej.');
    }

    return ['html' => $sanitized];
}
