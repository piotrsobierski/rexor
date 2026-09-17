# VIS-01 — Rowery: zdjęcie główne po zmianie kolejności w panelu

- Data i czas: 2026-09-17, uruchomienie automatyczne (Playwright)
- Środowisko: test — https://rexor.sobierski.com
- Adres: /admin (Modele i zdjęcia) → /rowery → /rowery/{kategoria}/e82
- Viewport / przeglądarka: 1440 × 1000 / Chromium (Playwright)
- Dane testowe: model Rexor E82 (id z /api/catalog), zmiana kolejności cofnięta po teście

| Krok | Wynik | Dowód | Uwagi |
| --- | --- | --- | --- |
| 1 | PASS | `01-admin-before-reorder.png` | Stan galerii E82 przed zmianą. |
| 2 | PASS | `02-admin-after-reorder.png` | Pierwsze zdjęcie zmienione przyciskiem „Przesuń zdjęcie w prawo”. |
| 3 | PASS | `03-public-rowery-listing.png` | Karta E82 na `/rowery` w tej samej sesji przeglądarki (bez czyszczenia cache). |
| 4 | PASS | `04-public-model-detail.png` | Zdjęcie główne na detalu modelu. |

## Wynik testu skryptowego

`npm run test:visual` — test `VIS-01`: **PASS**. Zdjęcie główne karty na `/rowery`
było identyczne ze zdjęciem głównym na stronie detalu bezpośrednio po zmianie
kolejności w panelu, bez twardego odświeżenia i bez czyszczenia cache.

## Konsola i sieć

- Console: brak błędów
- Żądania: brak

## Jeśli wykryto błąd

Zgłoszony błąd („na stronie „rowery” zdjęcie główne nie zmieniło się, po
wejściu w dany model zdjęcie zmienione jest już jako główne”) **nie
odtworzył się** w bieżącym środowisku testowym z automatem. Kod odpowiada
za obie strony tym samym polem (`mergeCatalog()` w
`apps/web/lib/catalog-merge.ts:60-64`, zasilanym przez `/catalog`
sortowany po `model_media.sort_order` — dokładnie tej kolumnie, którą
aktualizuje reorder w panelu). Najbardziej prawdopodobna przyczyna
zgłoszenia to lokalne, przeglądarkowe cache'owanie odpowiedzi
`GET /catalog` po stronie klienta (`apps/web/lib/use-public-catalog.ts:26`
nie ustawia `cache: 'no-store'`, w przeciwieństwie do zapytania SSR w
`server-catalog.ts:27`) — np. karta `/rowery` otwarta w innej karcie
przeglądarki przed zmianą w panelu. Rekomendacja: jeśli błąd wróci,
odtworzyć z kartą `/rowery` otwartą PRZED zmianą w panelu (bez
przeładowania) zamiast nawigacji po zmianie — ten automat nawiguje po
zmianie, więc nie testuje dokładnie tego przypadku. Naprawa nie została
wykonana, bo błąd się nie potwierdził.
