# VIS-05 — CFG-06 + ADM-10 dopełnienie: pełny zapis, dziennik, podgląd przez UI

- Data i czas: 2026-09-17, uruchomienie automatyczne (Playwright)
- Środowisko: test — https://rexor.sobierski.com
- Adres: /konfigurator?model=e82 → panel admina → „Dziennik aktywności” → „Zapytania” → „Szczegóły”
- Viewport / przeglądarka: 1440 × 1000 / Chromium (Playwright)
- Dane testowe: zgłoszenie `[QA] test-visual VIS-05 <timestamp>`, e-mail `qa-configurator@example.invalid`

| Krok | Wynik | Dowód | Uwagi |
| --- | --- | --- | --- |
| 1 | PASS | — | Konfiguracja zapisana, otrzymano `publicId`. |
| 2 | PASS | `01-activity-log.png` | Wpis „Nowa konfiguracja” widoczny w Dzienniku aktywności dla tego zgłoszenia. |
| 3 | PASS | `02-zapytania-row.png` | Rekord widoczny w tabeli „Zapytania klientów”. |
| 4 | PASS | `03-configuration-detail.png` | Kliknięcie „Szczegóły” (prawdziwy przepływ UI, nie bezpośredni URL) otwiera podgląd bez błędu. |

## Wynik testu skryptowego

`npm run test:visual` — test `VIS-05`: **PASS**.

## Dlaczego wcześniej PARTIAL i co dokładnie odblokowano

- **CFG-06** było PARTIAL, bo brakowało testowej skrzynki do potwierdzenia
  końcowego zapisu. Ten test teraz przechodzi cały przepływ zapisu i
  **potwierdza zapis rekordu** przez Dziennik aktywności (zdarzenie
  `configuration_created` / „Nowa konfiguracja” pojawia się natychmiast po
  zapisie z poprawnymi danymi klienta).
- **ADM-10** było PARTIAL, bo środowisko testowe nie miało zapisanej
  konfiguracji do otwarcia. Teraz test tworzy ją sam i otwiera przez
  prawdziwy przepływ panelu: zakładka „Zapytania” → przycisk „Szczegóły”
  (nie przez wpisanie adresu wprost) — dokładnie ta ścieżka, której dotyczyło
  zgłoszenie użytkownika.

## Aktualizacja: dostarczenie e-maila sprawdzone i naprawione w VIS-07

Ten wynik pierwotnie zaznaczał IMAP jako niedostępny z tego środowiska.
To była błędna diagnoza: `mail.sobierski.com` jest za Cloudflare (proxy
przepuszcza tylko 80/443), stąd timeout — ale po połączeniu bezpośrednio z
adresem IP z rekordu MX (patrz `qa/playwright/lib/mailbox.ts`) IMAP działa
poprawnie. Właściwe sprawdzenie dostarczenia e-maila jest w osobnym teście
`VIS-07` (`qa/evidence/2026-09-17/test/VIS-07/WYNIK.md`): pierwszy przebieg
wykrył realny problem (`.env` środowiska testowego miał
`MAIL_TRANSPORT=log`, e-maile nigdy nie wychodziły), który naprawiono
wdrożeniem poprawnego `SMTP_HOST` (`de1.sohost.pl`, nie Cloudflare-proxowany
`mail.sobierski.com`). Po naprawie `VIS-07` przechodzi — e-mail dociera.

## Konsola i sieć

- Console: brak błędów
- Żądania: `POST /api/configurations` 200, `GET /admin/activity-log` 200, `GET /admin/configurations/{publicId}` 200
