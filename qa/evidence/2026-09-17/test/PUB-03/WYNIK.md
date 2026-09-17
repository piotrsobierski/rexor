# PUB-03 — Zdjęcie E82 na karcie i detalu

- Data i czas: 2026-09-17
- Środowisko: test (`https://rexor.sobierski.com`)
- Przeglądarka / viewport: Google Chrome / 1440 × 1000
- Dane testowe: brak; test odczytowy

| Krok | Wynik | Dowód | Uzasadnienie |
| --- | --- | --- | --- |
| 1. Karta E82 na `/rowery` | PASS | `01-e82-card.png` | Karta wyświetla obraz `/models/e82/01.jpg`. |
| 2. Detal E82 | PASS | `02-e82-detail.png` | Pierwszy obraz detalu to również `/models/e82/01.jpg`. |
| 3. Zmiana zdjęcia przez panel | BLOCKED (brak sesji) | — | Test wymaga zalogowanego administratora oraz danych testowych; nie próbowano obchodzić logowania. |

## Konsola i wniosek

Brak ostrzeżeń i błędów konsoli. Bieżąca spójność karty i detalu jest
potwierdzona. Test propagacji nowo wgranego zdjęcia pozostaje do wykonania po
udostępnieniu kontrolowanej sesji administratora.
