# CFG-06 — Walidacja i zapis konfiguracji

- Data i czas: 2026-09-17
- Środowisko: test (`https://rexor.sobierski.com/konfigurator?model=e82`)
- Przeglądarka / viewport: Google Chrome / 1440 × 1000
- Dane: lokalne, niezatwierdzone `[QA 2026-09-17]` i adres `.invalid`

| Krok | Wynik | Dowód | Uzasadnienie |
| --- | --- | --- | --- |
| 1. Otwarcie modala zapisu | PASS | `01-save-dialog.png` | Formularz ma pola kontaktowe i zgodę prywatności. |
| 2. Próba bez zgody | PASS | `02-privacy-validation.png` | Komunikat: „Zaznacz zgodę na kontakt i przetwarzanie danych.” |
| 3. Kontrola transmisji | PASS | `02-privacy-validation.png` | Nie wysłano żadnego `POST /api/configurations`. |
| 4. Prawidłowy zapis, link wznowienia i podsumowania | BLOCKED (dane testowe) | — | Wymaga zgody na wysłanie oraz kontrolowanej skrzynki testowej; nie użyto danych przypadkowych. |

## Konsola i wniosek

Brak ostrzeżeń i błędów konsoli. Walidacja zgody działa i nie dopuszcza do
przesłania danych. Pełny test końcowego zapisu należy wykonać ze wskazaną
skrzynką testową, a potem sprawdzić link wznowienia i widok publiczny.
