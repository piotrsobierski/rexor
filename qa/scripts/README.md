# Pomocniki QA

`lib/admin.cjs` zawiera wspólne, realistyczne logowanie do panelu. Pobiera
dane wyłącznie z `QA_ADMIN_EMAIL` i `QA_ADMIN_PASSWORD`; nie loguje ich ani
nie zapisuje do dowodów. Każdy nowy skrypt administracyjny ma używać tego
pomocnika. `set-e82-default-motor.cjs` jest powtarzalnym przykładem zmiany
danych przygotowujących test: ustawia fabryczny silnik E82, robi zrzut i
odczytem katalogu potwierdza zapis.

`lib/browser.cjs` uruchamia Chromium dla scenariusza, zbiera błędy i
ostrzeżenia konsoli oraz zapisuje nazwany, pełnostronicowy screenshot kroku.
Skrypty publiczne powinny używać `newPage()` i `screenshot()` z tego helpera,
aby dowody i obsługa błędów miały ten sam format.

`run-admin-battery-lifecycle.cjs` realizuje ADM-05 na danych efemerycznych:
tworzy pakiet z prefiksem `[QA data]`, weryfikuje go w katalogu publicznym,
a następnie usuwa dokładnie ten rekord przez uwierzytelnione API administratora.
Skrypt nie zmienia pakietu domyślnego ani istniejących danych.

`capture-page.cjs` tworzy pełnostronicowy PNG publicznego adresu bez klikania
ani wysyłania formularza. Służy jako powtarzalny dowód wejścia na stronę,
natomiast scenariusze interaktywne nadal muszą zapisywać własne kroki i wynik.

Przykład z tymczasową, nieprojek­tową instalacją Playwright Core:

```sh
npm install --prefix /private/tmp/rexor-playwright playwright-core@1.55.0 --no-save
NODE_PATH=/private/tmp/rexor-playwright/node_modules \
  node qa/scripts/capture-page.cjs \
  https://rexor.sobierski.com/rowery \
  qa/evidence/RRRR-MM-DD/test/PUB-02/01-all-bikes.png
```

Skrypt nie zastępuje `WYNIK.md`. W raporcie zawsze trzeba zapisać środowisko,
viewport, stan kroków, błędy konsoli oraz to, czy test dokonał zapisu danych.

`run-public-pages.cjs` wykonuje powtarzalny pakiet odczytowy `PUB-04`: Ramy,
Realizacje, Serwis, Kontakt, regulamin, prywatność oraz pierwszy dostępny detal
ramy i realizacji. Zapisuje PNG i wypisuje JSON z wynikiem każdej strony.

Pozostałe odtworzone scenariusze: `run-public-navigation.cjs` (PUB-01/02),
`run-configuration-save.cjs` (CFG-06), `run-admin-session.cjs` (ADM-01;
wymaga zmiennych `QA_ADMIN_EMAIL` i `QA_ADMIN_PASSWORD`) oraz
`run-api-smoke.cjs` (API-01/02). Każdy skrypt zapisuje screenshoty, jeśli
steruje przeglądarką, i wypisuje zwięzły JSON do dołączenia do `WYNIK.md`.
