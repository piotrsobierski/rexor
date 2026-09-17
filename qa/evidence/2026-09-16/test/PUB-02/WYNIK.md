# PUB-02 — Filtrowanie listy rowerów

- Data i czas: 2026-09-16
- Środowisko: test (`https://rexor.sobierski.com/rowery`)
- Przeglądarka / viewport: Google Chrome / 1440 × 1000
- Dane testowe: brak; test wyłącznie odczytowy

| Krok | Wynik | Dowód | Uwagi |
| --- | --- | --- | --- |
| 1. Widok wszystkich modeli | PASS | `01-all-bikes.png` | Dostępne filtry: Wszystkie, Gravel, Pojazdy elektryczne. |
| 2. Filtr Gravel | PASS | `02-gravel-filter.png` | Widoczny jest CFR707; E82 i E55 nie występują w widoku. |
| 3. Filtr Pojazdy elektryczne | PASS | `03-electric-filter.png` | Widoczne są E82 i E55; CFR707 nie występuje w widoku. |

## Konsola i sieć

- Console: brak ostrzeżeń i błędów podczas wejścia i przełączania filtrów.
- Nie wykonywano zapisu ani wywołań administracyjnych.

## Wniosek

Scenariusz zaliczony. Filtry odzwierciedlają kategorie modeli zwróconych przez
katalog i poprawnie zawężają wynik po kliknięciu.
