# PUB-01 — Menu i widoki responsywne

- Data i czas: 2026-09-16
- Środowisko: test (`https://rexor.sobierski.com`)
- Przeglądarka: Google Chrome uruchomiony automatycznie
- Viewporty: 1440 × 1000 oraz 390 × 844
- Dane testowe: brak; test wyłącznie odczytowy

| Krok | Wynik | Dowód | Uwagi |
| --- | --- | --- | --- |
| 1. Strona główna na desktopie | PASS | `01-desktop-home-menu.png` | Widoczne pozycje menu: Rowery, Ramy, Realizacje, Serwis. |
| 2. Strona główna na telefonie | PASS | `02-mobile-home-menu.png` | Ten sam zestaw aktywnych pozycji; brak pustej i brak „Części”. |

## Konsola i sieć

- Console: brak ostrzeżeń i błędów podczas obu wejść.
- Nie wykonywano zapisu ani wywołań administracyjnych.

## Wniosek

Scenariusz zaliczony. Pozycje logo i CTA są osobnymi linkami technicznymi,
dlatego nie są liczone jako elementy menu głównego.
