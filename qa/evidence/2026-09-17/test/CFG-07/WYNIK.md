# CFG-07 — Podstawowa obsługa klawiaturą

- Data i czas: 2026-09-17
- Środowisko: test (`https://rexor.sobierski.com/konfigurator?model=e82`)
- Przeglądarka / viewport: Google Chrome / 1440 × 1000
- Dane testowe: brak

| Krok | Wynik | Dowód | Uzasadnienie |
| --- | --- | --- | --- |
| 1. Fokus na opisie modelu | PASS | `01-summary-focus.png` | Aktywnym elementem jest natywny `SUMMARY`. |
| 2. Enter na opisie | PASS | `02-summary-enter.png` | Desktopowy, początkowo otwarty opis został zamknięty klawiszem Enter. |
| 3. Enter na „Wybierz kolor” | PASS | `03-picker-keyboard-open.png` | Picker lakierów otwiera się przez klawiaturę. |
| 4. Escape w pickerze | PASS | `04-picker-escape-closed.png` | Modal zamyka się i fokus nie zostaje w ukrytej warstwie. |
| 5. Pełne przejście Tab przez wszystkie grupy | NOT RUN | — | Wymaga osobnego, dłuższego audytu kolejności fokusu i czytnika ekranu. |

## Konsola i wniosek

Brak ostrzeżeń i błędów konsoli. Podstawowe mechanizmy klawiatury są sprawne;
scenariusz pozostaje częściowy do czasu pełnego audytu Tab i technologii
asystujących.
