# CFG-04 — Picker lakierów i wpływ na wycenę

- Data i czas: 2026-09-16
- Środowisko: test (`https://rexor.sobierski.com/konfigurator?model=e82`)
- Przeglądarka / viewport: Google Chrome / 1440 × 1000
- Dane testowe: istniejące palety; nie zapisywano konfiguracji końcowej

| Krok | Wynik | Dowód | Uzasadnienie |
| --- | --- | --- | --- |
| 1. Otwarcie pickera | PASS | `01-picker-open.png` | Modal załadował 680 lakierów i filtry palet. |
| 2. Wyszukanie „Riviera” | PASS | `02-search-riviera.png` | Wynik Riviera Blue jest osiągalny przez pole wyszukiwania. |
| 3. Podgląd Riviera Blue | PASS | `03-porsche-preview.png` | Próbka i przycisk potwierdzenia są widoczne. |
| 4. Wybór koloru Porsche | PASS | `04-selected-porsche.png` | Kolor pojawia się w konfiguracji; cena 16 980 zł → 17 780 zł, czyli +800 zł zgodne z paletą. |
| 5. Chip Porsche | PASS | `05-porsche-filter.png` | Filtr zawęża listę do 636 kolorów Porsche. |
| 6. Render i powiększenie | BLOCKED (dane) | `01-picker-open.png` | Brak filtrów „Z wizualizacją” oraz „Ze zdjęciem”: katalog testowy nie zawiera renderów ani zdjęć lakierów. |

## Konsola i wniosek

Brak ostrzeżeń i błędów konsoli. Nie stwierdzono błędu aplikacji. Aby zaliczyć
krok 6, administrator powinien dodać co najmniej jeden render lub zdjęcie do
koloru dostępnego dla E82; potem należy wykonać podgląd i powiększenie w tym
samym scenariuszu.
