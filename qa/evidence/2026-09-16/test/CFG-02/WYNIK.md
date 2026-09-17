# CFG-02 — Przeliczanie ceny opcji

- Data i czas: 2026-09-16
- Środowisko: test (`https://rexor.sobierski.com/konfigurator?model=e82`)
- Przeglądarka / viewport: Google Chrome / 1440 × 1000
- Dane testowe: brak; nie zapisywano konfiguracji końcowej

| Krok | Wynik | Dowód | Cena brutto | Uzasadnienie |
| --- | --- | --- | --- | --- |
| 1. Konfiguracja domyślna | PASS | `01-default-price.png` | 16 980 zł | Stan odniesienia. |
| 2. Bateria 13S4P | PASS | `02-battery-discount.png` | 16 380 zł | Spadek dokładnie o 600 zł, zgodny z etykietą opcji. |
| 3. FOX 36 Performance | PASS | `03-fork-upgrade.png` | 17 380 zł | Wzrost dokładnie o 1 000 zł. |
| 4. Własna część zamiast FOX | PASS | `04-customer-part.png` | 15 380 zł | Spadek o 2 000 zł: usunięto +1 000 zł FOX i zastosowano -1 000 zł za własną część. |

## Konsola i wniosek

Brak ostrzeżeń i błędów konsoli. Scenariusz zaliczony: kalkulator aktualizuje
cenę natychmiast i nie nalicza poprzedniej opcji drugi raz.
