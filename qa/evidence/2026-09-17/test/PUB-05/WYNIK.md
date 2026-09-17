# PUB-05 — Ograniczenie kategorii pojazdów elektrycznych

- Data i czas: 2026-09-17
- Środowisko: test (`https://rexor.sobierski.com/rowery/elektryczne`)
- Przeglądarka / viewport: Google Chrome / 1440 × 1000
- Dane: odizolowany stan przeglądarki; bez zapisu na serwerze

| Krok | Wynik | Dowód | Uzasadnienie |
| --- | --- | --- | --- |
| 1. Wejście do kategorii | PASS | `01-electric-disclaimer.png` | Przed ofertą widoczny jest komunikat „Uwaga, zanim zobaczysz ofertę”. |
| 2. Potwierdzenie komunikatu | PASS | `02-electric-models.png` | Oferta pokazuje E82 i E55, nie pokazuje CFR707. |

## Konsola i wniosek

Brak ostrzeżeń i błędów konsoli. Scenariusz zaliczony: ograniczenie nie ukrywa
bezpowrotnie oferty, ale wymaga świadomego potwierdzenia przed jej pokazaniem.
