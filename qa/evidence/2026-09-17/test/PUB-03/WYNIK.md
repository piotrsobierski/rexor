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
potwierdzona.

## Aktualizacja 2026-09-17 (druga sesja) — krok 3 odblokowany

Kontrolowana sesja administratora jest już dostępna (`QA_ADMIN_EMAIL`/
`QA_ADMIN_PASSWORD`, zapisane w pamięci agenta). Krok 3 wykonano automatem
`npm run test:visual` jako `VIS-01`
(`qa/evidence/2026-09-17/test/VIS-01/`): zmieniono kolejność zdjęć E82 w
panelu i porównano zdjęcie główne na `/rowery` ze zdjęciem na detalu w tej
samej sesji przeglądarki, bez twardego odświeżenia. **PASS** — zgodne od
razu po zmianie. Scenariusz uznaje się za w pełni wykonany; wynik
kompletny w `VIS-01/WYNIK.md`.
