# CFG-03 — Bateria i estymacje zasięgu

- Data i czas: 2026-09-16
- Środowisko: test (`https://rexor.sobierski.com/konfigurator?model=e82`)
- Przeglądarka / viewport: Google Chrome / 1440 × 1000
- Dane testowe: brak; nie zapisywano konfiguracji końcowej

| Krok | Wynik | Dowód | Uzasadnienie |
| --- | --- | --- | --- |
| 1. Pakiet domyślny 13S6P | PASS | `01-default-battery-range.png` | Nagłówek i tabela pokazują 982,8 Wh oraz zasięgi 140–246 km w Eco/asfalt. |
| 2. Lżejszy pakiet 13S4P | PASS | `02-lighter-battery-range.png` | Nagłówek i tabela zmieniają się na 655,2 Wh oraz 94–164 km w Eco/asfalt; wycena spada o 600 zł. |

## Konsola i wniosek

Brak ostrzeżeń i błędów konsoli. Scenariusz zaliczony: pojemność, cena i
zasięgi są aktualizowane wspólnie i pozostają proporcjonalne do wybranego
pakietu.
