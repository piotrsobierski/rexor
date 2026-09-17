# VIS-02 — Panel: brak filtrowania po kategorii w zakładce „Rowery”

- Data i czas: 2026-09-17, uruchomienie automatyczne (Playwright)
- Środowisko: test — https://rexor.sobierski.com
- Adres: /admin (zakładka „Modele”)
- Viewport / przeglądarka: 1440 × 1000 / Chromium (Playwright)
- Dane testowe: brak (tylko odczyt)

| Krok | Wynik | Dowód | Uwagi |
| --- | --- | --- | --- |
| 1 | FAIL | `01-models-tab.png` | Brak elementu `data-testid="models-category-filter"` (lub innego widocznego filtra kategorii) nad listą modeli. |

## Wynik testu skryptowego

`npm run test:visual` — test `VIS-02`: **FAIL (oczekiwane)**. Test
dokumentuje brakującą funkcję i zacznie przechodzić dopiero po dodaniu
kontrolki filtra.

## Korekta zgłoszenia

Zgłoszenie porównywało zakładkę „Rowery” do „Ramy”, zakładając że „Ramy”
ma filtrowanie po kategorii. Weryfikacja kodu (`apps/web/components/admin-panel.tsx`,
`ModelsEditor` ~2002-2718 i `FramesEditor` ~2719-2966) pokazuje, że **żadna
z tych dwóch zakładek nie ma filtra kategorii** — obie mają wyłącznie
wyszukiwanie tekstowe (`useLongList`/`LongListSearch`) i osobne selecty do
**przypisania** kategorii do pojedynczego rekordu (edycja, nie filtrowanie).
Jedyny istniejący w kodzie wzorzec filtra po kategorii to
`FilteredCollection` (`apps/web/components/filtered-collection.tsx`),
używany na publicznych stronach `/ramy` i `/realizacje`.

## Jeśli wykryto błąd

To nie jest regresja, tylko brakująca funkcja. Rekomendacja: dodać jedną
kontrolkę filtra (chipy kategorii albo `NativeSelect`) nad listą w obu
edytorach (`ModelsEditor` i `FramesEditor`) dla spójności, filtrującą
`list.visible` po `category_id` — dane (`categories`, `category_id`) są już
ładowane, więc to wyłącznie zmiana UI, bez zmian API. Naprawa nie została
wykonana w tej sesji — wymaga osobnego polecenia implementacji.
