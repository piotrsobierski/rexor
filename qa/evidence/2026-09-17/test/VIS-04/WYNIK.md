# VIS-04 — CFG-04 dopełnienie: powiększenie renderu lakieru

- Data i czas: 2026-09-17, uruchomienie automatyczne (Playwright)
- Środowisko: test — https://rexor.sobierski.com
- Adres: /konfigurator?model=e55
- Viewport / przeglądarka: 1440 × 1000 / Chromium (Playwright)
- Dane testowe: brak (tylko odczyt)

| Krok | Wynik | Dowód | Uwagi |
| --- | --- | --- | --- |
| 1 | PASS | `01-paint-picker-filtered.png` | Filtr „Z wizualizacją” zawęża listę do kolorów z renderem. |
| 2 | PASS | `02-paint-preview-selected.png` | Wybrany kolor pokazuje panel podglądu z przyciskiem „Powiększ…”. |
| 3 | PASS | `03-paint-zoomed.png` | Powiększenie ładuje właściwy plik z `/media/paints/renders/`. |

## Wynik testu skryptowego

`npm run test:visual` — test `VIS-04`: **PASS**.

## Dlaczego wcześniej PARTIAL i jak to odblokowano

Oryginalny wynik CFG-04 (`qa/evidence/2026-09-16/test/CFG-04/`) był
PARTIAL, bo model E82 (używany we wcześniejszych testach) ma **0 z 680**
kolorów z policzonym renderem (`GET /api/paints/model/e82` → wszystkie
`renders: []`). Model E55 ma **229/680** kolorów z renderem, więc ten sam
scenariusz uruchomiono na E55 i przeszedł w całości — funkcja działa,
brakowało tylko danych testowych dla E82.

## Konsola i sieć

- Console: brak błędów
- Żądania: `GET /api/paints/model/e55` odpowiedziało 200 z danymi renderów
