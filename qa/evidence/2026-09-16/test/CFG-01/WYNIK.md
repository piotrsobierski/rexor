# CFG-01 — Model i pamięć wyborów

- Data i czas: 2026-09-16
- Środowisko: test (`https://rexor.sobierski.com/konfigurator?model=e82`)
- Przeglądarka / viewport: Google Chrome / 1440 × 1000
- Dane testowe: brak; nie zapisywano konfiguracji końcowej

| Krok | Wynik | Dowód | Uwagi |
| --- | --- | --- | --- |
| 1. E82, stan początkowy | PASS | `01-e82-initial.png` | Model, galeria i cena są widoczne. |
| 2. E82, lżejsza bateria | PASS | `02-e82-alternative-battery.png` | Wybrano Samsung 35E 13S4P. |
| 3. Przełączenie na E55 | PASS | `03-e55-selected.png` | Nagłówek i podsumowanie pokazują Konfigurację E55. |
| 4. Powrót do E82 | PASS | `04-e82-restored.png` | Wrócił zapisany dla E82 wybór Samsung 35E 13S4P; nie został nadpisany wyborem E55. |

## Konsola i wniosek

Brak ostrzeżeń i błędów konsoli. Scenariusz zaliczony: wybór baterii jest
przechowywany per model, więc przejście między modelami nie gubi konfiguracji.
